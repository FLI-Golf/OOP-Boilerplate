import { FantasyLeague } from '$lib/domain/FantasyLeague';
import { FantasyLeagueRepo, FantasyParticipantRepo } from '$lib/data/repos/fantasy-league.repo';
import {
	FantasyLeagueCreateSchema,
	FantasyParticipantCreateSchema,
	type FantasyLeagueCreate,
	type FantasyLeagueUpdate,
	type FantasyParticipantCreate
} from '$lib/schemas/fantasy-league.schema';
import { ValidationError, InvalidStateError, UnauthorizedError } from '$lib/core/errors';

/**
 * Use cases for Fantasy League management.
 */

/**
 * Create a new fantasy league.
 */
export async function createFantasyLeague(
	data: FantasyLeagueCreate,
	userId: string
): Promise<FantasyLeague> {
	const validated = FantasyLeagueCreateSchema.parse({
		...data,
		commissioner_id: userId
	});

	const leagueDTO = await FantasyLeagueRepo.create(validated);

	// Auto-join commissioner as first participant
	await FantasyParticipantRepo.create({
		league_id: leagueDTO.id,
		user_id: userId,
		display_name: 'Commissioner',
		paid: false
	});

	const participants = await FantasyParticipantRepo.getByLeagueId(leagueDTO.id);
	return new FantasyLeague(leagueDTO, participants);
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
 * List all fantasy leagues for a season.
 */
export async function listFantasyLeaguesBySeason(seasonId: string): Promise<FantasyLeague[]> {
	const leagues = await FantasyLeagueRepo.getBySeasonId(seasonId);
	return leagues.map((l) => new FantasyLeague(l));
}

/**
 * List fantasy leagues user is participating in.
 */
export async function listUserFantasyLeagues(userId: string): Promise<FantasyLeague[]> {
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
 * Join a fantasy league.
 */
export async function joinFantasyLeague(
	leagueId: string,
	userId: string,
	displayName: string
): Promise<FantasyLeague> {
	const league = await getFantasyLeague(leagueId);

	if (!league.canJoin) {
		if (league.isFull) {
			throw new ValidationError('League is full');
		}
		throw new InvalidStateError('League is not accepting new participants');
	}

	if (league.isParticipant(userId)) {
		throw new ValidationError('Already a participant in this league');
	}

	await FantasyParticipantRepo.create({
		league_id: leagueId,
		user_id: userId,
		display_name: displayName,
		paid: false
	});

	return getFantasyLeague(leagueId);
}

/**
 * Leave a fantasy league.
 */
export async function leaveFantasyLeague(leagueId: string, userId: string): Promise<void> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isSetup) {
		throw new InvalidStateError('Cannot leave league after draft has started');
	}

	if (league.isCommissioner(userId)) {
		throw new ValidationError('Commissioner cannot leave the league');
	}

	const participant = await FantasyParticipantRepo.getByUserAndLeague(userId, leagueId);
	if (!participant) {
		throw new ValidationError('Not a participant in this league');
	}

	await FantasyParticipantRepo.delete(participant.id);
}

/**
 * Update fantasy league settings.
 * Only commissioner can update.
 */
export async function updateFantasyLeague(
	leagueId: string,
	data: FantasyLeagueUpdate,
	userId: string
): Promise<FantasyLeague> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isCommissioner(userId)) {
		throw new UnauthorizedError('Only commissioner can update league settings');
	}

	if (!league.isSetup) {
		throw new InvalidStateError('Cannot update league after draft has started');
	}

	const leagueDTO = await FantasyLeagueRepo.update(leagueId, data);
	const participants = await FantasyParticipantRepo.getByLeagueId(leagueId);
	return new FantasyLeague(leagueDTO, participants);
}

/**
 * Start the draft.
 * Assigns random draft positions to participants.
 */
export async function startDraft(leagueId: string, userId: string): Promise<FantasyLeague> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isCommissioner(userId)) {
		throw new UnauthorizedError('Only commissioner can start draft');
	}

	const error = league.validateDraftStart();
	if (error) {
		throw new InvalidStateError(error);
	}

	// Assign random draft positions
	const participants = [...league.participants];
	const shuffled = participants.sort(() => Math.random() - 0.5);

	for (let i = 0; i < shuffled.length; i++) {
		await FantasyParticipantRepo.setDraftPosition(shuffled[i].id, i + 1);
	}

	// Update league status
	await FantasyLeagueRepo.updateStatus(leagueId, 'drafting');

	return getFantasyLeague(leagueId);
}

/**
 * Complete the draft and activate the league.
 */
export async function completeDraft(leagueId: string, userId: string): Promise<FantasyLeague> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isCommissioner(userId)) {
		throw new UnauthorizedError('Only commissioner can complete draft');
	}

	if (!league.isDrafting) {
		throw new InvalidStateError('League must be in drafting status');
	}

	await FantasyLeagueRepo.updateStatus(leagueId, 'active');

	return getFantasyLeague(leagueId);
}

/**
 * Complete the league (end of season).
 */
export async function completeLeague(leagueId: string, userId: string): Promise<FantasyLeague> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isCommissioner(userId)) {
		throw new UnauthorizedError('Only commissioner can complete league');
	}

	if (!league.isActive) {
		throw new InvalidStateError('League must be active to complete');
	}

	await FantasyLeagueRepo.updateStatus(leagueId, 'complete');

	return getFantasyLeague(leagueId);
}

/**
 * Mark a participant as paid.
 */
export async function markParticipantPaid(
	leagueId: string,
	participantId: string,
	userId: string
): Promise<FantasyLeague> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isCommissioner(userId)) {
		throw new UnauthorizedError('Only commissioner can mark payments');
	}

	await FantasyParticipantRepo.markPaid(participantId);

	// Update prize pool
	const updatedLeague = await getFantasyLeague(leagueId);
	const prizePool = updatedLeague.calculatePrizePool();
	await FantasyLeagueRepo.updatePrizePool(leagueId, prizePool);

	return getFantasyLeague(leagueId);
}

/**
 * Get league standings.
 */
export async function getLeagueStandings(
	leagueId: string
): Promise<Array<{ participantId: string; displayName: string; points: number; rank: number }>> {
	const league = await getFantasyLeague(leagueId);
	const standings = league.getStandings();

	return standings.map((p, index) => ({
		participantId: p.id,
		displayName: p.display_name,
		points: p.total_points,
		rank: p.rank ?? index + 1
	}));
}

/**
 * Delete a fantasy league.
 * Only commissioner can delete, and only in setup phase.
 */
export async function deleteFantasyLeague(leagueId: string, userId: string): Promise<void> {
	const league = await getFantasyLeague(leagueId);

	if (!league.isCommissioner(userId)) {
		throw new UnauthorizedError('Only commissioner can delete league');
	}

	if (!league.isSetup) {
		throw new InvalidStateError('Cannot delete league after draft has started');
	}

	await FantasyParticipantRepo.deleteByLeagueId(leagueId);
	await FantasyLeagueRepo.delete(leagueId);
}
