import { FantasyTeam, SnakeDraftOrder, DraftRules, DraftRecommendation } from '$lib/domain/FantasyTeam';
import { Pro } from '$lib/domain/Pro';
import { FantasyTeamRepo, DraftPickRepo } from '$lib/data/repos/fantasy-team.repo';
import { FantasyLeagueRepo, FantasyParticipantRepo } from '$lib/data/repos/fantasy-league.repo';
import { ProRepo } from '$lib/data/repos/pro.repo';
import type { FantasyTeamCreate, DraftState } from '$lib/schemas/fantasy-team.schema';
import { ValidationError, InvalidStateError, UnauthorizedError } from '$lib/core/errors';

/**
 * Use cases for Fantasy Team and Draft management.
 */

/**
 * Create a fantasy team for a participant.
 */
export async function createFantasyTeam(data: FantasyTeamCreate): Promise<FantasyTeam> {
	// Check team doesn't already exist
	const existing = await FantasyTeamRepo.getByParticipantId(data.participant_id);
	if (existing) {
		throw new ValidationError('Participant already has a fantasy team');
	}

	const teamDTO = await FantasyTeamRepo.create(data);
	return new FantasyTeam(teamDTO);
}

/**
 * Get a fantasy team with pros loaded.
 */
export async function getFantasyTeam(participantId: string): Promise<FantasyTeam | null> {
	const teamDTO = await FantasyTeamRepo.getByParticipantId(participantId);
	if (!teamDTO) return null;

	const proDTOs = await ProRepo.getByIds(teamDTO.pro_ids);
	const pros = proDTOs.map((p) => new Pro(p));

	return new FantasyTeam(teamDTO, pros);
}

/**
 * Get all fantasy teams for a league.
 */
export async function getLeagueFantasyTeams(leagueId: string): Promise<FantasyTeam[]> {
	const teamDTOs = await FantasyTeamRepo.getByLeagueId(leagueId);

	// Collect all pro IDs
	const allProIds = new Set<string>();
	for (const team of teamDTOs) {
		team.pro_ids.forEach((id) => allProIds.add(id));
	}

	// Load all pros
	const proDTOs = await ProRepo.getByIds([...allProIds]);
	const proMap = new Map(proDTOs.map((p) => [p.id, new Pro(p)]));

	// Build teams with pros
	return teamDTOs.map((t) => {
		const pros = t.pro_ids.map((id) => proMap.get(id)).filter((p): p is Pro => p !== undefined);
		return new FantasyTeam(t, pros);
	});
}

/**
 * Get current draft state for a league.
 */
export async function getDraftState(leagueId: string): Promise<DraftState> {
	const league = await FantasyLeagueRepo.getById(leagueId);
	const participants = await FantasyParticipantRepo.getByLeagueId(leagueId);
	const picks = await DraftPickRepo.getByLeagueId(leagueId);

	const totalPicks = participants.length * league.draft_rounds;
	const currentPick = picks.length + 1;
	const isComplete = currentPick > totalPicks;

	if (isComplete) {
		return {
			league_id: leagueId,
			current_round: league.draft_rounds,
			current_pick: totalPicks,
			current_participant_id: '',
			is_complete: true
		};
	}

	// Calculate who's on the clock
	const { round, draftPosition } = SnakeDraftOrder.getPositionForPick(
		currentPick,
		participants.length
	);

	const onClock = participants.find((p) => p.draft_position === draftPosition);

	return {
		league_id: leagueId,
		current_round: round,
		current_pick: currentPick,
		current_participant_id: onClock?.id ?? '',
		is_complete: false
	};
}

/**
 * Get draft options for a participant.
 * Returns filtered available pros and a recommendation.
 */
export async function getDraftOptions(
	leagueId: string,
	participantId: string
): Promise<{
	availablePros: Pro[];
	filteredPros: Pro[];
	recommendation: Pro | null;
	currentRound: number;
}> {
	const draftState = await getDraftState(leagueId);

	if (draftState.is_complete) {
		return {
			availablePros: [],
			filteredPros: [],
			recommendation: null,
			currentRound: draftState.current_round
		};
	}

	// Get all active pros
	const allPros = await ProRepo.getActive();
	const pros = allPros.map((p) => new Pro(p));

	// Get already drafted pros
	const picks = await DraftPickRepo.getByLeagueId(leagueId);
	const draftedProIds = new Set(picks.map((p) => p.pro_id));

	// Filter to available
	const availablePros = pros.filter((p) => !draftedProIds.has(p.id));

	// Get participant's current roster
	const team = await getFantasyTeam(participantId);
	const currentRoster = team?.pros ? [...team.pros] : [];

	// Apply draft rules filtering
	const filteredPros = DraftRules.filterAvailablePros(
		availablePros,
		currentRoster,
		draftState.current_round
	);

	// Get recommendation
	const recommendation = DraftRecommendation.getRecommendation(
		availablePros,
		currentRoster,
		draftState.current_round
	);

	return {
		availablePros,
		filteredPros,
		recommendation,
		currentRound: draftState.current_round
	};
}

/**
 * Make a draft pick.
 */
export async function makeDraftPick(
	leagueId: string,
	participantId: string,
	proId: string,
	userId: string
): Promise<FantasyTeam> {
	// Verify league is drafting
	const league = await FantasyLeagueRepo.getById(leagueId);
	if (league.status !== 'drafting') {
		throw new InvalidStateError('League is not in drafting phase');
	}

	// Verify it's this participant's turn
	const draftState = await getDraftState(leagueId);
	if (draftState.is_complete) {
		throw new InvalidStateError('Draft is complete');
	}
	if (draftState.current_participant_id !== participantId) {
		throw new UnauthorizedError('Not your turn to pick');
	}

	// Verify participant belongs to user
	const participant = await FantasyParticipantRepo.getById(participantId);
	if (participant.user_id !== userId) {
		throw new UnauthorizedError('Not your participant');
	}

	// Verify pro is available and valid
	const options = await getDraftOptions(leagueId, participantId);
	const error = DraftRules.validatePick(
		proId,
		options.availablePros,
		(await getFantasyTeam(participantId))?.pros ? [...(await getFantasyTeam(participantId))!.pros!] : [],
		draftState.current_round
	);
	if (error) {
		throw new ValidationError(error);
	}

	// Create the pick
	await DraftPickRepo.create({
		league_id: leagueId,
		participant_id: participantId,
		pro_id: proId,
		round_number: draftState.current_round,
		pick_number: draftState.current_pick,
		auto_picked: false
	});

	// Add pro to team
	let team = await FantasyTeamRepo.getByParticipantId(participantId);
	if (!team) {
		// Create team if doesn't exist
		team = await FantasyTeamRepo.create({
			participant_id: participantId,
			league_id: leagueId,
			name: `Team ${participant.display_name}`
		});
	}
	await FantasyTeamRepo.addPro(team.id, proId);

	return (await getFantasyTeam(participantId))!;
}

/**
 * Auto-pick for a participant (when timer expires).
 */
export async function autoPickOnTimeout(leagueId: string): Promise<FantasyTeam | null> {
	const draftState = await getDraftState(leagueId);

	if (draftState.is_complete) {
		return null;
	}

	const participantId = draftState.current_participant_id;
	const options = await getDraftOptions(leagueId, participantId);

	if (!options.recommendation) {
		throw new ValidationError('No available pros to pick');
	}

	// Get participant to find user_id
	const participant = await FantasyParticipantRepo.getById(participantId);

	// Create the pick (marked as auto)
	await DraftPickRepo.create({
		league_id: leagueId,
		participant_id: participantId,
		pro_id: options.recommendation.id,
		round_number: draftState.current_round,
		pick_number: draftState.current_pick,
		auto_picked: true
	});

	// Add pro to team
	let team = await FantasyTeamRepo.getByParticipantId(participantId);
	if (!team) {
		team = await FantasyTeamRepo.create({
			participant_id: participantId,
			league_id: leagueId,
			name: `Team ${participant.display_name}`
		});
	}
	await FantasyTeamRepo.addPro(team.id, options.recommendation.id);

	return (await getFantasyTeam(participantId))!;
}

/**
 * Get draft history for a league.
 */
export async function getDraftHistory(
	leagueId: string
): Promise<Array<{
	pickNumber: number;
	round: number;
	participantName: string;
	proName: string;
	autoPicked: boolean;
}>> {
	const picks = await DraftPickRepo.getByLeagueId(leagueId);
	const participants = await FantasyParticipantRepo.getByLeagueId(leagueId);
	const participantMap = new Map(participants.map((p) => [p.id, p.display_name]));

	// Load pro names
	const proIds = picks.map((p) => p.pro_id);
	const proDTOs = await ProRepo.getByIds(proIds);
	const proMap = new Map(proDTOs.map((p) => [p.id, p.name]));

	return picks.map((pick) => ({
		pickNumber: pick.pick_number,
		round: pick.round_number,
		participantName: participantMap.get(pick.participant_id) ?? 'Unknown',
		proName: proMap.get(pick.pro_id) ?? 'Unknown',
		autoPicked: pick.auto_picked
	}));
}

/**
 * Get upcoming picks for a participant.
 */
export async function getUpcomingPicks(
	leagueId: string,
	participantId: string
): Promise<Array<{ round: number; pickNumber: number }>> {
	const league = await FantasyLeagueRepo.getById(leagueId);
	const participants = await FantasyParticipantRepo.getByLeagueId(leagueId);
	const participant = participants.find((p) => p.id === participantId);

	if (!participant?.draft_position) {
		return [];
	}

	const draftState = await getDraftState(leagueId);
	const upcoming: Array<{ round: number; pickNumber: number }> = [];

	const order = SnakeDraftOrder.getPickOrder(participants.length, league.draft_rounds);

	for (const slot of order) {
		if (slot.pick >= draftState.current_pick && slot.position === participant.draft_position) {
			upcoming.push({
				round: slot.round,
				pickNumber: slot.pick
			});
		}
	}

	return upcoming;
}
