import { FantasyLeague, shuffleArray } from '$lib/domain/FantasyLeague';
import {
	FantasyLeagueRepo,
	FantasyParticipantRepo,
	JoinRequestRepo
} from '$lib/data/repos/fantasy-league.repo';
import { FantasyTournamentRepo } from '$lib/data/repos/fantasy-tournament.repo';
import { TournamentRepo } from '$lib/data/repos/tournament.repo';
import { FantasyTeamRepo } from '$lib/data/repos/fantasy-team.repo';
import type {
	FantasyLeagueCreate,
	FantasyLeagueSettings,
	JoinRequestCreate
} from '$lib/schemas/fantasy-league.schema';
import type { FantasyTournamentCreate } from '$lib/schemas/fantasy-tournament.schema';
import { ValidationError, InvalidStateError, UnauthorizedError } from '$lib/core/errors';

/**
 * STEP 1: Owner purchases/creates a fantasy league.
 */
export async function purchaseFantasyLeague(
	data: Omit<FantasyLeagueCreate, 'owner_id'>,
	userId: string
): Promise<FantasyLeague> {
	// Create the league
	const leagueDTO = await FantasyLeagueRepo.create({
		...data,
		owner_id: userId
	});

	// Add owner as first participant
	await FantasyParticipantRepo.create({
		league_id: leagueDTO.id,
		user_id: userId,
		display_name: 'League Owner', // Can be updated
		is_owner: true,
		paid: true // Owner's entry fee is part of purchase
	});

	const participants = await FantasyParticipantRepo.getByLeagueId(leagueDTO.id);
	return new FantasyLeague(leagueDTO, participants);
}

/**
 * STEP 2: User requests to join a league.
 */
export async function requestToJoinLeague(
	data: Omit<JoinRequestCreate, 'user_id'>,
	userId: string
): Promise<void> {
	const league = await getFantasyLeague(data.league_id);

	if (!league.canAcceptJoinRequests) {
		if (league.isFull) {
			throw new ValidationError('League is full');
		}
		throw new InvalidStateError('League is not accepting join requests');
	}

	if (league.isParticipant(userId)) {
		throw new ValidationError('Already a participant in this league');
	}

	// Check for existing pending request
	const existingRequest = await JoinRequestRepo.getByUserAndLeague(userId, data.league_id);
	if (existingRequest && existingRequest.status === 'pending') {
		throw new ValidationError('You already have a pending request for this league');
	}

	await JoinRequestRepo.create({
		...data,
		user_id: userId
	});
}

/**
 * STEP 3: Owner views pending join requests.
 */
export async function getPendingJoinRequests(
	leagueId: string,
	userId: string
): Promise<Array<{ id: string; userId: string; displayName: string; message?: string; createdAt: string }>> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isOwner(userId)) {
		throw new UnauthorizedError('Only owner can view join requests');
	}

	const requests = await JoinRequestRepo.getPendingByLeagueId(leagueId);

	return requests.map((r) => ({
		id: r.id,
		userId: r.user_id,
		displayName: r.display_name,
		message: r.message,
		createdAt: r.created ?? ''
	}));
}

/**
 * STEP 4: Owner approves a join request.
 * When league fills, automatically transitions to 'ready' and sets up fantasy tournaments.
 */
export async function approveJoinRequest(
	requestId: string,
	userId: string
): Promise<{ league: FantasyLeague; leagueNowFull: boolean }> {
	const request = await JoinRequestRepo.getById(requestId);
	const league = await getFantasyLeague(request.league_id);

	if (!league.isOwner(userId)) {
		throw new UnauthorizedError('Only owner can approve requests');
	}

	if (request.status !== 'pending') {
		throw new ValidationError('Request is no longer pending');
	}

	if (league.isFull) {
		throw new ValidationError('League is already full');
	}

	// Approve the request
	await JoinRequestRepo.updateStatus(requestId, 'approved');

	// Add as participant
	await FantasyParticipantRepo.create({
		league_id: request.league_id,
		user_id: request.user_id,
		display_name: request.display_name,
		is_owner: false,
		paid: false
	});

	// Increment participant count
	const updatedLeague = await FantasyLeagueRepo.incrementParticipants(request.league_id);

	// Check if league is now full
	const leagueNowFull = updatedLeague.current_participants >= updatedLeague.max_participants;

	if (leagueNowFull) {
		// Transition to ready
		await FantasyLeagueRepo.updateStatus(request.league_id, 'ready');

		// Auto-setup fantasy tournaments
		await setupFantasyTournaments(request.league_id);

		// Assign random draft order
		await assignRandomDraftOrder(request.league_id);
	}

	return {
		league: await getFantasyLeague(request.league_id),
		leagueNowFull
	};
}

/**
 * STEP 4b: Owner rejects a join request.
 */
export async function rejectJoinRequest(requestId: string, userId: string): Promise<void> {
	const request = await JoinRequestRepo.getById(requestId);
	const league = await getFantasyLeague(request.league_id);

	if (!league.isOwner(userId)) {
		throw new UnauthorizedError('Only owner can reject requests');
	}

	if (request.status !== 'pending') {
		throw new ValidationError('Request is no longer pending');
	}

	await JoinRequestRepo.updateStatus(requestId, 'rejected');
}

/**
 * Auto-setup: Create fantasy tournaments for all upcoming real tournaments.
 */
async function setupFantasyTournaments(leagueId: string): Promise<void> {
	const league = await FantasyLeagueRepo.getById(leagueId);

	// Get all tournaments for the season
	const tournaments = await TournamentRepo.getBySeasonId(league.season_id);

	// Filter to upcoming/scheduled tournaments
	const upcomingTournaments = tournaments.filter(
		(t) => t.status === 'scheduled' || t.status === 'live'
	);

	// Sort by start date
	upcomingTournaments.sort((a, b) => {
		const dateA = a.start_date ?? '';
		const dateB = b.start_date ?? '';
		return dateA.localeCompare(dateB);
	});

	// Create fantasy tournaments
	const fantasyTournaments: FantasyTournamentCreate[] = upcomingTournaments.map((t, index) => ({
		league_id: leagueId,
		tournament_id: t.id,
		tournament_name: t.name,
		tournament_number: index + 1,
		start_date: t.start_date,
		end_date: t.end_date
	}));

	await FantasyTournamentRepo.createMany(fantasyTournaments);
}

/**
 * Auto-setup: Assign random draft order to all participants.
 */
async function assignRandomDraftOrder(leagueId: string): Promise<void> {
	const participants = await FantasyParticipantRepo.getByLeagueId(leagueId);
	const shuffled = shuffleArray(participants);

	for (let i = 0; i < shuffled.length; i++) {
		await FantasyParticipantRepo.setDraftPosition(shuffled[i].id, i + 1);
	}
}

/**
 * STEP 5: Owner adjusts league settings (before draft starts).
 */
export async function updateLeagueSettings(
	leagueId: string,
	settings: FantasyLeagueSettings,
	userId: string
): Promise<FantasyLeague> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isOwner(userId)) {
		throw new UnauthorizedError('Only owner can update settings');
	}

	if (!league.isReady) {
		throw new InvalidStateError('Can only update settings when league is ready');
	}

	await FantasyLeagueRepo.updateSettings(leagueId, settings);
	return getFantasyLeague(leagueId);
}

/**
 * STEP 6: Owner starts the draft.
 */
export async function startDraft(leagueId: string, userId: string): Promise<FantasyLeague> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isOwner(userId)) {
		throw new UnauthorizedError('Only owner can start draft');
	}

	const error = league.validateDraftStart();
	if (error) {
		throw new InvalidStateError(error);
	}

	// Create empty fantasy teams for each participant
	const participants = await FantasyParticipantRepo.getByLeagueId(leagueId);
	for (const p of participants) {
		const existingTeam = await FantasyTeamRepo.getByParticipantId(p.id);
		if (!existingTeam) {
			await FantasyTeamRepo.create({
				participant_id: p.id,
				league_id: leagueId,
				name: `Team ${p.display_name}`
			});
		}
	}

	// Update status
	await FantasyLeagueRepo.updateStatus(leagueId, 'drafting');

	return getFantasyLeague(leagueId);
}

/**
 * Get a fantasy league with participants.
 */
export async function getFantasyLeague(id: string): Promise<FantasyLeague> {
	const leagueDTO = await FantasyLeagueRepo.getById(id);
	const participants = await FantasyParticipantRepo.getByLeagueId(id);
	return new FantasyLeague(leagueDTO, participants);
}

/**
 * List open leagues (accepting players) for a season.
 */
export async function listOpenLeagues(seasonId: string): Promise<FantasyLeague[]> {
	const leagues = await FantasyLeagueRepo.getOpenLeagues(seasonId);
	return leagues.map((l) => new FantasyLeague(l));
}

/**
 * List leagues user owns.
 */
export async function listOwnedLeagues(userId: string): Promise<FantasyLeague[]> {
	const leagues = await FantasyLeagueRepo.getByOwnerId(userId);
	return leagues.map((l) => new FantasyLeague(l));
}

/**
 * List leagues user is participating in.
 */
export async function listUserLeagues(userId: string): Promise<FantasyLeague[]> {
	const participations = await FantasyParticipantRepo.getByUserId(userId);
	const leagues: FantasyLeague[] = [];

	for (const p of participations) {
		const leagueDTO = await FantasyLeagueRepo.getById(p.league_id);
		const participants = await FantasyParticipantRepo.getByLeagueId(p.league_id);
		leagues.push(new FantasyLeague(leagueDTO, participants));
	}

	return leagues;
}

/**
 * Get fantasy tournaments for a league.
 */
export async function getLeagueFantasyTournaments(
	leagueId: string
): Promise<Array<{
	id: string;
	tournamentId: string;
	tournamentName: string;
	tournamentNumber: number;
	status: string;
	startDate?: string;
}>> {
	const tournaments = await FantasyTournamentRepo.getByLeagueId(leagueId);

	return tournaments.map((t) => ({
		id: t.id,
		tournamentId: t.tournament_id,
		tournamentName: t.tournament_name,
		tournamentNumber: t.tournament_number,
		status: t.status,
		startDate: t.start_date
	}));
}

/**
 * Get draft order for a league.
 */
export async function getDraftOrder(
	leagueId: string
): Promise<Array<{ position: number; participantId: string; displayName: string; isOwner: boolean }>> {
	const league = await getFantasyLeague(leagueId);
	const order = league.getDraftOrder();

	return order.map((p) => ({
		position: p.draft_position ?? 0,
		participantId: p.id,
		displayName: p.display_name,
		isOwner: p.is_owner
	}));
}

/**
 * Mark participant as paid.
 */
export async function markParticipantPaid(
	leagueId: string,
	participantId: string,
	userId: string
): Promise<void> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isOwner(userId)) {
		throw new UnauthorizedError('Only owner can mark payments');
	}

	await FantasyParticipantRepo.markPaid(participantId);

	// Update prize pool
	const updatedLeague = await getFantasyLeague(leagueId);
	const prizePool = updatedLeague.calculatePrizePool();
	await FantasyLeagueRepo.updatePrizePool(leagueId, prizePool);
}

/**
 * Complete the draft (called after last pick).
 */
export async function completeDraft(leagueId: string): Promise<FantasyLeague> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isDrafting) {
		throw new InvalidStateError('League must be drafting');
	}

	await FantasyLeagueRepo.updateStatus(leagueId, 'active');
	return getFantasyLeague(leagueId);
}

/**
 * Complete the league (end of season).
 */
export async function completeLeague(leagueId: string, userId: string): Promise<FantasyLeague> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isOwner(userId)) {
		throw new UnauthorizedError('Only owner can complete league');
	}

	if (!league.isActive) {
		throw new InvalidStateError('League must be active to complete');
	}

	await FantasyLeagueRepo.updateStatus(leagueId, 'complete');
	return getFantasyLeague(leagueId);
}

/**
 * User cancels their pending join request.
 */
export async function cancelJoinRequest(requestId: string, userId: string): Promise<void> {
	const request = await JoinRequestRepo.getById(requestId);

	if (request.user_id !== userId) {
		throw new UnauthorizedError('Can only cancel your own request');
	}

	if (request.status !== 'pending') {
		throw new ValidationError('Request is no longer pending');
	}

	await JoinRequestRepo.updateStatus(requestId, 'cancelled');
}

/**
 * Get user's pending join requests.
 */
export async function getUserPendingRequests(
	userId: string
): Promise<Array<{ requestId: string; leagueId: string; leagueName: string; status: string }>> {
	const requests = await JoinRequestRepo.getByUserId(userId);
	const pending = requests.filter((r) => r.status === 'pending');

	const result = [];
	for (const r of pending) {
		const league = await FantasyLeagueRepo.getById(r.league_id);
		result.push({
			requestId: r.id,
			leagueId: r.league_id,
			leagueName: league.name,
			status: r.status
		});
	}

	return result;
}
