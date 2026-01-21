import { ProPointsRepo, TeamPointsRepo } from '$lib/data/repos/points-history.repo';
import type { ProPoints, TeamPoints, ProStats, TeamStats } from '$lib/schemas/points-history.schema';

/**
 * Query functions for points history.
 * These are read-only aggregations - no business logic, just data shaping.
 */

/**
 * Calculate pro stats from points history.
 */
export async function getProStats(proId: string, seasonId?: string): Promise<ProStats> {
	const points = seasonId
		? await ProPointsRepo.getByProAndSeason(proId, seasonId)
		: await ProPointsRepo.getByProId(proId);

	const totalPoints = sumPoints(points);
	const tournamentIds = new Set(points.filter((p) => p.tournament_id).map((p) => p.tournament_id));
	const tournamentCount = tournamentIds.size;

	// Count wins (1st place finishes)
	const wins = points.filter(
		(p) => p.source === 'tournament_finish' && p.description?.includes('1st')
	).length;

	return {
		pro_id: proId,
		total_points: totalPoints,
		tournament_count: tournamentCount,
		average_points: tournamentCount > 0 ? Math.round(totalPoints / tournamentCount) : 0,
		best_finish: undefined, // Would need position data
		wins
	};
}

/**
 * Calculate team stats from points history.
 */
export async function getTeamStats(teamId: string): Promise<TeamStats> {
	const points = await TeamPointsRepo.getByTeamId(teamId);

	const totalPoints = sumPoints(points);
	const tournamentIds = new Set(points.map((p) => p.tournament_id));
	const tournamentCount = tournamentIds.size;

	const wins = points.filter(
		(p) => p.source === 'tournament_finish' && p.description?.includes('1st')
	).length;

	return {
		team_id: teamId,
		total_points: totalPoints,
		tournament_count: tournamentCount,
		average_points: tournamentCount > 0 ? Math.round(totalPoints / tournamentCount) : 0,
		best_finish: undefined,
		wins
	};
}

/**
 * Get season leaderboard for pros.
 */
export async function getProSeasonLeaderboard(
	seasonId: string
): Promise<Array<{ proId: string; totalPoints: number; rank: number }>> {
	const allPoints = await ProPointsRepo.getBySeasonId(seasonId);

	// Group by pro
	const byPro = new Map<string, number>();
	for (const p of allPoints) {
		const current = byPro.get(p.pro_id) ?? 0;
		byPro.set(p.pro_id, current + p.points);
	}

	// Sort and rank
	const sorted = Array.from(byPro.entries())
		.map(([proId, totalPoints]) => ({ proId, totalPoints }))
		.sort((a, b) => b.totalPoints - a.totalPoints);

	return assignRanks(sorted, 'totalPoints');
}

/**
 * Get tournament leaderboard for teams.
 */
export async function getTeamTournamentLeaderboard(
	tournamentId: string
): Promise<Array<{ teamId: string; totalPoints: number; rank: number }>> {
	const allPoints = await TeamPointsRepo.getByTournamentId(tournamentId);

	// Group by team
	const byTeam = new Map<string, number>();
	for (const p of allPoints) {
		const current = byTeam.get(p.team_id) ?? 0;
		byTeam.set(p.team_id, current + p.points);
	}

	// Sort and rank
	const sorted = Array.from(byTeam.entries())
		.map(([teamId, totalPoints]) => ({ teamId, totalPoints }))
		.sort((a, b) => b.totalPoints - a.totalPoints);

	return assignRanks(sorted, 'totalPoints');
}

/**
 * Get pro's tournament history.
 */
export async function getProTournamentHistory(
	proId: string
): Promise<Array<{ tournamentId: string; points: number; breakdown: ProPoints[] }>> {
	const points = await ProPointsRepo.getByProId(proId);

	// Group by tournament
	const byTournament = new Map<string, ProPoints[]>();
	for (const p of points) {
		if (!p.tournament_id) continue;
		if (!byTournament.has(p.tournament_id)) {
			byTournament.set(p.tournament_id, []);
		}
		byTournament.get(p.tournament_id)!.push(p);
	}

	return Array.from(byTournament.entries()).map(([tournamentId, breakdown]) => ({
		tournamentId,
		points: sumPoints(breakdown),
		breakdown
	}));
}

/**
 * Get team's tournament history.
 */
export async function getTeamTournamentHistory(
	teamId: string
): Promise<Array<{ tournamentId: string; points: number; breakdown: TeamPoints[] }>> {
	const points = await TeamPointsRepo.getByTeamId(teamId);

	// Group by tournament
	const byTournament = new Map<string, TeamPoints[]>();
	for (const p of points) {
		if (!byTournament.has(p.tournament_id)) {
			byTournament.set(p.tournament_id, []);
		}
		byTournament.get(p.tournament_id)!.push(p);
	}

	return Array.from(byTournament.entries()).map(([tournamentId, breakdown]) => ({
		tournamentId,
		points: sumPoints(breakdown),
		breakdown
	}));
}

/**
 * Compare two pros head-to-head.
 */
export async function compareProStats(
	proId1: string,
	proId2: string,
	seasonId?: string
): Promise<{
	pro1: ProStats;
	pro2: ProStats;
	headToHead: { pro1Wins: number; pro2Wins: number; ties: number };
}> {
	const [stats1, stats2] = await Promise.all([
		getProStats(proId1, seasonId),
		getProStats(proId2, seasonId)
	]);

	// Head-to-head would require tournament-by-tournament comparison
	// Simplified: just compare total points
	return {
		pro1: stats1,
		pro2: stats2,
		headToHead: {
			pro1Wins: 0, // Would need detailed tournament data
			pro2Wins: 0,
			ties: 0
		}
	};
}

// --- Helper functions ---

function sumPoints(points: Array<{ points: number }>): number {
	return points.reduce((sum, p) => sum + p.points, 0);
}

function assignRanks<T extends { [key: string]: unknown }>(
	items: T[],
	pointsKey: keyof T
): Array<T & { rank: number }> {
	const result: Array<T & { rank: number }> = [];
	let currentRank = 1;
	let previousPoints: number | null = null;
	let tied = 0;

	for (const item of items) {
		const points = item[pointsKey] as number;

		if (previousPoints !== null && points === previousPoints) {
			tied++;
		} else {
			currentRank += tied;
			tied = 1;
		}

		result.push({ ...item, rank: currentRank });
		previousPoints = points;
	}

	return result;
}
