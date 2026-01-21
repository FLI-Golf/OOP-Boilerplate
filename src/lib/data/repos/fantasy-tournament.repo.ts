import { pb } from '$lib/data/pb/pb.client';
import { NotFoundError } from '$lib/core/errors';
import {
	FantasyTournamentSchema,
	type FantasyTournament,
	type FantasyTournamentCreate,
	type FantasyTournamentStatus
} from '$lib/schemas/fantasy-tournament.schema';

/**
 * Repository for Fantasy Tournament persistence.
 */
export const FantasyTournamentRepo = {
	async getByLeagueId(leagueId: string): Promise<FantasyTournament[]> {
		const records = await pb.collection('fantasy_tournaments').getFullList({
			filter: `league_id = "${leagueId}"`,
			sort: 'tournament_number'
		});
		return records.map((r) => FantasyTournamentSchema.parse(r));
	},

	async getById(id: string): Promise<FantasyTournament> {
		try {
			const record = await pb.collection('fantasy_tournaments').getOne(id);
			return FantasyTournamentSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('FantasyTournament', id);
			}
			throw err;
		}
	},

	async getByTournamentId(tournamentId: string): Promise<FantasyTournament[]> {
		const records = await pb.collection('fantasy_tournaments').getFullList({
			filter: `tournament_id = "${tournamentId}"`
		});
		return records.map((r) => FantasyTournamentSchema.parse(r));
	},

	async getUpcoming(leagueId: string): Promise<FantasyTournament[]> {
		const records = await pb.collection('fantasy_tournaments').getFullList({
			filter: `league_id = "${leagueId}" && status = "upcoming"`,
			sort: 'tournament_number'
		});
		return records.map((r) => FantasyTournamentSchema.parse(r));
	},

	async create(data: FantasyTournamentCreate): Promise<FantasyTournament> {
		const record = await pb.collection('fantasy_tournaments').create({
			...data,
			status: 'upcoming',
			points_calculated: false
		});
		return FantasyTournamentSchema.parse(record);
	},

	async createMany(tournaments: FantasyTournamentCreate[]): Promise<FantasyTournament[]> {
		const created: FantasyTournament[] = [];
		for (const t of tournaments) {
			const record = await pb.collection('fantasy_tournaments').create({
				...t,
				status: 'upcoming',
				points_calculated: false
			});
			created.push(FantasyTournamentSchema.parse(record));
		}
		return created;
	},

	async updateStatus(id: string, status: FantasyTournamentStatus): Promise<FantasyTournament> {
		const record = await pb.collection('fantasy_tournaments').update(id, { status });
		return FantasyTournamentSchema.parse(record);
	},

	async markPointsCalculated(id: string): Promise<FantasyTournament> {
		const record = await pb.collection('fantasy_tournaments').update(id, {
			points_calculated: true
		});
		return FantasyTournamentSchema.parse(record);
	},

	async delete(id: string): Promise<void> {
		await pb.collection('fantasy_tournaments').delete(id);
	},

	async deleteByLeagueId(leagueId: string): Promise<void> {
		const tournaments = await pb.collection('fantasy_tournaments').getFullList({
			filter: `league_id = "${leagueId}"`
		});
		for (const t of tournaments) {
			await pb.collection('fantasy_tournaments').delete(t.id);
		}
	}
};
