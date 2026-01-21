import { Scoring } from '$lib/domain/Scoring';
import { Tournament } from '$lib/domain/Tournament';
import { Group } from '$lib/domain/Group';
import { ScoreEventRepo } from '$lib/data/repos/score.repo';
import { GroupRepo } from '$lib/data/repos/group.repo';
import { TournamentRepo, TournamentRoundRepo } from '$lib/data/repos/tournament.repo';
import { CourseRepo, HoleRepo } from '$lib/data/repos/course.repo';
import { TeamRepo } from '$lib/data/repos/team.repo';
import type { HoleScoreEventCreate, ProScorecard } from '$lib/schemas/score.schema';
import { ValidationError, InvalidStateError, UnauthorizedError } from '$lib/core/errors';

/**
 * Use cases for scoring.
 */

/**
 * Submit a hole score.
 * Validates:
 * - Tournament is live
 * - User is the assigned scorekeeper for the group
 * - Pro is in the group
 * - Hole exists on the course
 */
export async function submitHoleScore(
	data: Omit<HoleScoreEventCreate, 'entered_by_id'>,
	userId: string
): Promise<void> {
	// 1. Load tournament and verify it's live
	const tournamentDTO = await TournamentRepo.getById(data.tournament_id);
	const rounds = await TournamentRoundRepo.getByTournamentId(data.tournament_id);
	const tournament = new Tournament(tournamentDTO, rounds);

	tournament.assertCanSubmitScores();

	// 2. Load group and verify scorekeeper
	const groupDTO = await GroupRepo.getById(data.group_id);
	const group = new Group(groupDTO);

	if (!group.isScorekeeper(userId)) {
		throw new UnauthorizedError('You are not the scorekeeper for this group');
	}

	// 3. Load course holes for validation
	const holes = await HoleRepo.getByCourseId(tournament.courseId);

	// 4. Get pro IDs in this group
	const teams = await TeamRepo.getByTournamentId(data.tournament_id);
	const groupTeams = teams.filter((t) => group.teamIds.includes(t.id));
	const groupProIds = groupTeams.flatMap((t) => [t.male_pro_id, t.female_pro_id]);

	// 5. Validate the score
	const error = Scoring.validateScoreSubmission(
		data.hole_number,
		data.throws,
		holes,
		groupProIds,
		data.pro_id
	);
	if (error) {
		throw new ValidationError(error);
	}

	// 6. Create the score event
	await ScoreEventRepo.create({
		...data,
		entered_by_id: userId
	});
}

/**
 * Get scorecard for a pro in a round.
 */
export async function getProScorecard(
	proId: string,
	roundId: string,
	tournamentId: string
): Promise<ProScorecard> {
	// Load tournament to get course
	const tournament = await TournamentRepo.getById(tournamentId);
	const holes = await HoleRepo.getByCourseId(tournament.course_id);

	// Load score events
	const events = await ScoreEventRepo.getByProAndRound(proId, roundId);

	// Build scorecard
	return Scoring.buildScorecard(proId, roundId, events, holes);
}

/**
 * Get all scorecards for a round.
 */
export async function getRoundScorecards(
	roundId: string,
	tournamentId: string
): Promise<ProScorecard[]> {
	// Load tournament to get course
	const tournament = await TournamentRepo.getById(tournamentId);
	const holes = await HoleRepo.getByCourseId(tournament.course_id);

	// Load all score events for the round
	const events = await ScoreEventRepo.getByRoundId(roundId);

	// Get unique pro IDs
	const proIds = [...new Set(events.map((e) => e.pro_id))];

	// Build scorecards
	return proIds.map((proId) => Scoring.buildScorecard(proId, roundId, events, holes));
}

/**
 * Get tournament leaderboard.
 */
export async function getTournamentLeaderboard(
	tournamentId: string
): Promise<Array<{ proId: string; scoreToPar: number; position: number }>> {
	// Load tournament
	const tournament = await TournamentRepo.getById(tournamentId);
	const holes = await HoleRepo.getByCourseId(tournament.course_id);
	const rounds = await TournamentRoundRepo.getByTournamentId(tournamentId);

	// Load all score events
	const events = await ScoreEventRepo.getByTournamentId(tournamentId);

	// Get unique pro IDs
	const proIds = [...new Set(events.map((e) => e.pro_id))];

	// Build combined scorecards (sum across all rounds)
	const combinedScores = proIds.map((proId) => {
		let totalThrows = 0;
		let totalPar = 0;

		for (const round of rounds) {
			const roundEvents = events.filter((e) => e.pro_id === proId && e.round_id === round.id);
			const scorecard = Scoring.buildScorecard(proId, round.id, roundEvents, holes);
			totalThrows += scorecard.total_throws;
			totalPar += scorecard.total_par;
		}

		return {
			pro_id: proId,
			round_id: 'combined',
			entries: [],
			total_throws: totalThrows,
			total_par: totalPar,
			score_to_par: totalThrows - totalPar
		};
	});

	return Scoring.calculateLeaderboard(combinedScores);
}

/**
 * Get scores for a group (scorekeeper view).
 */
export async function getGroupScores(
	groupId: string,
	tournamentId: string
): Promise<{ proId: string; scores: Map<number, number> }[]> {
	const events = await ScoreEventRepo.getByGroupId(groupId);

	// Group by pro
	const proScores = new Map<string, Map<number, number>>();

	for (const event of events) {
		if (!proScores.has(event.pro_id)) {
			proScores.set(event.pro_id, new Map());
		}
		const scores = proScores.get(event.pro_id)!;
		// Latest score wins
		scores.set(event.hole_number, event.throws);
	}

	return Array.from(proScores.entries()).map(([proId, scores]) => ({
		proId,
		scores
	}));
}
