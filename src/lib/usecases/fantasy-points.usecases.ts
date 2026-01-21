import { FantasyPointsCalculator, DEFAULT_SCORING_RULES } from '$lib/domain/FantasyPoints';
import { Scoring } from '$lib/domain/Scoring';
import { FantasyPointsRepo } from '$lib/data/repos/fantasy-points.repo';
import { FantasyTeamRepo } from '$lib/data/repos/fantasy-team.repo';
import { FantasyParticipantRepo } from '$lib/data/repos/fantasy-league.repo';
import { ScoreEventRepo } from '$lib/data/repos/score.repo';
import { TournamentRepo, TournamentRoundRepo } from '$lib/data/repos/tournament.repo';
import { HoleRepo } from '$lib/data/repos/course.repo';
import type { FantasyPointsCreate, ParticipantPointsSummary, ScoringRules } from '$lib/schemas/fantasy-points.schema';

/**
 * Use cases for Fantasy Points management.
 */

/**
 * Calculate and award points for a completed tournament.
 */
export async function calculateTournamentPoints(
	leagueId: string,
	tournamentId: string,
	rules: ScoringRules = DEFAULT_SCORING_RULES
): Promise<void> {
	const calculator = new FantasyPointsCalculator(rules);

	// Get tournament and course info
	const tournament = await TournamentRepo.getById(tournamentId);
	const holes = await HoleRepo.getByCourseId(tournament.course_id);
	const rounds = await TournamentRoundRepo.getByTournamentId(tournamentId);

	// Get all score events
	const events = await ScoreEventRepo.getByTournamentId(tournamentId);

	// Get unique pro IDs
	const proIds = [...new Set(events.map((e) => e.pro_id))];

	// Build combined scorecards and calculate leaderboard
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

	const leaderboard = Scoring.calculateLeaderboard(combinedScores);

	// Get all fantasy teams in the league
	const teams = await FantasyTeamRepo.getByLeagueId(leagueId);

	// Delete existing points for this tournament (for recalculation)
	await FantasyPointsRepo.deleteByTournamentId(tournamentId);

	// Award points to each participant based on their pros' performance
	const pointsToCreate: FantasyPointsCreate[] = [];

	for (const team of teams) {
		for (const proId of team.pro_ids) {
			// Find pro's position
			const position = leaderboard.find((l) => l.proId === proId);
			if (!position) continue;

			// Tournament finish points
			const positionPoints = calculator.calculatePositionPoints(position.position);
			if (positionPoints > 0) {
				pointsToCreate.push({
					league_id: leagueId,
					participant_id: team.participant_id,
					pro_id: proId,
					tournament_id: tournamentId,
					source: 'tournament_finish',
					points: positionPoints,
					description: `${position.position}${getOrdinalSuffix(position.position)} place finish`
				});
			}

			// Round-by-round scoring points
			for (const round of rounds) {
				const roundEvents = events.filter((e) => e.pro_id === proId && e.round_id === round.id);
				const scorecard = Scoring.buildScorecard(proId, round.id, roundEvents, holes);
				const roundPoints = calculator.calculateRoundPoints(scorecard);

				if (roundPoints !== 0) {
					pointsToCreate.push({
						league_id: leagueId,
						participant_id: team.participant_id,
						pro_id: proId,
						tournament_id: tournamentId,
						round_id: round.id,
						source: 'round_score',
						points: roundPoints,
						description: `Round ${round.round_number} scoring`
					});
				}

				// Check for hole-in-ones
				for (const entry of scorecard.entries) {
					if (entry.throws === 1) {
						pointsToCreate.push({
							league_id: leagueId,
							participant_id: team.participant_id,
							pro_id: proId,
							tournament_id: tournamentId,
							round_id: round.id,
							source: 'bonus',
							points: rules.hole_in_one_points,
							description: `Hole-in-one on hole ${entry.hole_number}`
						});
					}
				}
			}
		}
	}

	// Create all points
	await FantasyPointsRepo.createMany(pointsToCreate);

	// Update participant totals
	await updateParticipantTotals(leagueId);
}

/**
 * Update participant total points and rankings.
 */
export async function updateParticipantTotals(leagueId: string): Promise<void> {
	const participants = await FantasyParticipantRepo.getByLeagueId(leagueId);
	const allPoints = await FantasyPointsRepo.getByLeagueId(leagueId);

	// Calculate totals for each participant
	const summaries: ParticipantPointsSummary[] = [];

	for (const participant of participants) {
		const participantPoints = allPoints.filter((p) => p.participant_id === participant.id);
		const summary = FantasyPointsCalculator.buildSummary(participant.id, participantPoints);
		summaries.push(summary);

		// Update participant total
		await FantasyParticipantRepo.updatePoints(participant.id, summary.total_points);
	}

	// Calculate and update rankings
	const rankings = FantasyPointsCalculator.calculateRankings(summaries);
	for (const ranking of rankings) {
		await FantasyParticipantRepo.updateRank(ranking.participantId, ranking.rank);
	}
}

/**
 * Get points summary for a participant.
 */
export async function getParticipantPointsSummary(
	participantId: string
): Promise<ParticipantPointsSummary> {
	const points = await FantasyPointsRepo.getByParticipantId(participantId);
	return FantasyPointsCalculator.buildSummary(participantId, points);
}

/**
 * Get points breakdown for a participant in a tournament.
 */
export async function getParticipantTournamentPoints(
	participantId: string,
	tournamentId: string
): Promise<{
	total: number;
	byPro: Array<{ proId: string; points: number; breakdown: Array<{ source: string; points: number; description: string }> }>;
}> {
	const points = await FantasyPointsRepo.getByParticipantAndTournament(participantId, tournamentId);

	// Group by pro
	const byPro = new Map<string, typeof points>();
	for (const p of points) {
		if (!byPro.has(p.pro_id)) {
			byPro.set(p.pro_id, []);
		}
		byPro.get(p.pro_id)!.push(p);
	}

	return {
		total: FantasyPointsCalculator.sumPoints(points),
		byPro: Array.from(byPro.entries()).map(([proId, proPoints]) => ({
			proId,
			points: FantasyPointsCalculator.sumPoints(proPoints),
			breakdown: proPoints.map((p) => ({
				source: p.source,
				points: p.points,
				description: p.description ?? ''
			}))
		}))
	};
}

/**
 * Award bonus points manually (commissioner action).
 */
export async function awardBonusPoints(
	leagueId: string,
	participantId: string,
	proId: string,
	points: number,
	description: string
): Promise<void> {
	await FantasyPointsRepo.create({
		league_id: leagueId,
		participant_id: participantId,
		pro_id: proId,
		source: 'bonus',
		points,
		description
	});

	await updateParticipantTotals(leagueId);
}

/**
 * Apply penalty points (commissioner action).
 */
export async function applyPenalty(
	leagueId: string,
	participantId: string,
	proId: string,
	points: number,
	description: string
): Promise<void> {
	await FantasyPointsRepo.create({
		league_id: leagueId,
		participant_id: participantId,
		pro_id: proId,
		source: 'penalty',
		points: -Math.abs(points), // Ensure negative
		description
	});

	await updateParticipantTotals(leagueId);
}

/**
 * Get league-wide points leaderboard.
 */
export async function getLeaguePointsLeaderboard(
	leagueId: string
): Promise<Array<{
	participantId: string;
	displayName: string;
	totalPoints: number;
	rank: number;
}>> {
	const participants = await FantasyParticipantRepo.getByLeagueId(leagueId);

	return participants
		.map((p) => ({
			participantId: p.id,
			displayName: p.display_name,
			totalPoints: p.total_points,
			rank: p.rank ?? 999
		}))
		.sort((a, b) => a.rank - b.rank);
}

/**
 * Helper: Get ordinal suffix for a number.
 */
function getOrdinalSuffix(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return s[(v - 20) % 10] || s[v] || s[0];
}
