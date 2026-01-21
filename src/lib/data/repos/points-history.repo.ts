import { pb } from '$lib/data/pb/pb.client';
import {
	ProPointsSchema,
	TeamPointsSchema,
	type ProPoints,
	type ProPointsCreate,
	type TeamPoints,
	type TeamPointsCreate
} from '$lib/schemas/points-history.schema';

/**
 * Repository for Pro Points history.
 * Append-only - no updates or deletes in normal operation.
 */
export const ProPointsRepo = {
	/**
	 * Get all points for a pro.
	 */
	async getByProId(proId: string): Promise<ProPoints[]> {
		const records = await pb.collection('pro_points').getFullList({
			filter: `pro_id = "${proId}"`,
			sort: '-recorded_at'
		});
		return records.map((r) => ProPointsSchema.parse(r));
	},

	/**
	 * Get points for a pro in a season.
	 */
	async getByProAndSeason(proId: string, seasonId: string): Promise<ProPoints[]> {
		const records = await pb.collection('pro_points').getFullList({
			filter: `pro_id = "${proId}" && season_id = "${seasonId}"`,
			sort: '-recorded_at'
		});
		return records.map((r) => ProPointsSchema.parse(r));
	},

	/**
	 * Get points for a pro in a tournament.
	 */
	async getByProAndTournament(proId: string, tournamentId: string): Promise<ProPoints[]> {
		const records = await pb.collection('pro_points').getFullList({
			filter: `pro_id = "${proId}" && tournament_id = "${tournamentId}"`
		});
		return records.map((r) => ProPointsSchema.parse(r));
	},

	/**
	 * Get all points for a season.
	 */
	async getBySeasonId(seasonId: string): Promise<ProPoints[]> {
		const records = await pb.collection('pro_points').getFullList({
			filter: `season_id = "${seasonId}"`
		});
		return records.map((r) => ProPointsSchema.parse(r));
	},

	/**
	 * Get all points for a tournament.
	 */
	async getByTournamentId(tournamentId: string): Promise<ProPoints[]> {
		const records = await pb.collection('pro_points').getFullList({
			filter: `tournament_id = "${tournamentId}"`
		});
		return records.map((r) => ProPointsSchema.parse(r));
	},

	/**
	 * Create a points entry.
	 */
	async create(data: ProPointsCreate): Promise<ProPoints> {
		const record = await pb.collection('pro_points').create({
			...data,
			recorded_at: new Date().toISOString()
		});
		return ProPointsSchema.parse(record);
	},

	/**
	 * Create multiple points entries.
	 */
	async createMany(entries: ProPointsCreate[]): Promise<ProPoints[]> {
		const now = new Date().toISOString();
		const created: ProPoints[] = [];
		for (const entry of entries) {
			const record = await pb.collection('pro_points').create({
				...entry,
				recorded_at: now
			});
			created.push(ProPointsSchema.parse(record));
		}
		return created;
	},

	/**
	 * Delete points for a tournament (for recalculation).
	 */
	async deleteByTournamentId(tournamentId: string): Promise<void> {
		const records = await pb.collection('pro_points').getFullList({
			filter: `tournament_id = "${tournamentId}"`
		});
		for (const record of records) {
			await pb.collection('pro_points').delete(record.id);
		}
	}
};

/**
 * Repository for Team Points history.
 */
export const TeamPointsRepo = {
	/**
	 * Get all points for a team.
	 */
	async getByTeamId(teamId: string): Promise<TeamPoints[]> {
		const records = await pb.collection('team_points').getFullList({
			filter: `team_id = "${teamId}"`,
			sort: '-recorded_at'
		});
		return records.map((r) => TeamPointsSchema.parse(r));
	},

	/**
	 * Get points for a team in a tournament.
	 */
	async getByTeamAndTournament(teamId: string, tournamentId: string): Promise<TeamPoints[]> {
		const records = await pb.collection('team_points').getFullList({
			filter: `team_id = "${teamId}" && tournament_id = "${tournamentId}"`
		});
		return records.map((r) => TeamPointsSchema.parse(r));
	},

	/**
	 * Get all points for a tournament.
	 */
	async getByTournamentId(tournamentId: string): Promise<TeamPoints[]> {
		const records = await pb.collection('team_points').getFullList({
			filter: `tournament_id = "${tournamentId}"`
		});
		return records.map((r) => TeamPointsSchema.parse(r));
	},

	/**
	 * Create a points entry.
	 */
	async create(data: TeamPointsCreate): Promise<TeamPoints> {
		const record = await pb.collection('team_points').create({
			...data,
			recorded_at: new Date().toISOString()
		});
		return TeamPointsSchema.parse(record);
	},

	/**
	 * Create multiple points entries.
	 */
	async createMany(entries: TeamPointsCreate[]): Promise<TeamPoints[]> {
		const now = new Date().toISOString();
		const created: TeamPoints[] = [];
		for (const entry of entries) {
			const record = await pb.collection('team_points').create({
				...entry,
				recorded_at: now
			});
			created.push(TeamPointsSchema.parse(record));
		}
		return created;
	},

	/**
	 * Delete points for a tournament (for recalculation).
	 */
	async deleteByTournamentId(tournamentId: string): Promise<void> {
		const records = await pb.collection('team_points').getFullList({
			filter: `tournament_id = "${tournamentId}"`
		});
		for (const record of records) {
			await pb.collection('team_points').delete(record.id);
		}
	}
};
