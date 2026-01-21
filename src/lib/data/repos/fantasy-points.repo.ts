import { pb } from '$lib/data/pb/pb.client';
import {
	FantasyPointsSchema,
	type FantasyPoints,
	type FantasyPointsCreate
} from '$lib/schemas/fantasy-points.schema';

/**
 * Repository for Fantasy Points persistence.
 */
export const FantasyPointsRepo = {
	/**
	 * Get all points for a league.
	 */
	async getByLeagueId(leagueId: string): Promise<FantasyPoints[]> {
		const records = await pb.collection('fantasy_points').getFullList({
			filter: `league_id = "${leagueId}"`
		});
		return records.map((r) => FantasyPointsSchema.parse(r));
	},

	/**
	 * Get points for a participant.
	 */
	async getByParticipantId(participantId: string): Promise<FantasyPoints[]> {
		const records = await pb.collection('fantasy_points').getFullList({
			filter: `participant_id = "${participantId}"`
		});
		return records.map((r) => FantasyPointsSchema.parse(r));
	},

	/**
	 * Get points for a participant in a tournament.
	 */
	async getByParticipantAndTournament(
		participantId: string,
		tournamentId: string
	): Promise<FantasyPoints[]> {
		const records = await pb.collection('fantasy_points').getFullList({
			filter: `participant_id = "${participantId}" && tournament_id = "${tournamentId}"`
		});
		return records.map((r) => FantasyPointsSchema.parse(r));
	},

	/**
	 * Get points for a pro in a league.
	 */
	async getByProAndLeague(proId: string, leagueId: string): Promise<FantasyPoints[]> {
		const records = await pb.collection('fantasy_points').getFullList({
			filter: `pro_id = "${proId}" && league_id = "${leagueId}"`
		});
		return records.map((r) => FantasyPointsSchema.parse(r));
	},

	/**
	 * Get points for a tournament.
	 */
	async getByTournamentId(tournamentId: string): Promise<FantasyPoints[]> {
		const records = await pb.collection('fantasy_points').getFullList({
			filter: `tournament_id = "${tournamentId}"`
		});
		return records.map((r) => FantasyPointsSchema.parse(r));
	},

	/**
	 * Create a points entry.
	 */
	async create(data: FantasyPointsCreate): Promise<FantasyPoints> {
		const record = await pb.collection('fantasy_points').create(data);
		return FantasyPointsSchema.parse(record);
	},

	/**
	 * Create multiple points entries.
	 */
	async createMany(entries: FantasyPointsCreate[]): Promise<FantasyPoints[]> {
		const created: FantasyPoints[] = [];
		for (const entry of entries) {
			const record = await pb.collection('fantasy_points').create(entry);
			created.push(FantasyPointsSchema.parse(record));
		}
		return created;
	},

	/**
	 * Delete points for a tournament (for recalculation).
	 */
	async deleteByTournamentId(tournamentId: string): Promise<void> {
		const records = await pb.collection('fantasy_points').getFullList({
			filter: `tournament_id = "${tournamentId}"`
		});
		for (const record of records) {
			await pb.collection('fantasy_points').delete(record.id);
		}
	},

	/**
	 * Delete all points for a league.
	 */
	async deleteByLeagueId(leagueId: string): Promise<void> {
		const records = await pb.collection('fantasy_points').getFullList({
			filter: `league_id = "${leagueId}"`
		});
		for (const record of records) {
			await pb.collection('fantasy_points').delete(record.id);
		}
	}
};
