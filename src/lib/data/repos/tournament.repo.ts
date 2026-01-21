import { pb } from '$lib/data/pb/pb.client';
import { NotFoundError } from '$lib/core/errors';
import {
	TournamentSchema,
	TournamentRoundSchema,
	type Tournament,
	type TournamentCreate,
	type TournamentUpdate,
	type TournamentRound,
	type TournamentRoundCreate,
	type TournamentStatus
} from '$lib/schemas/tournament.schema';

/**
 * Repository for Tournament persistence.
 */
export const TournamentRepo = {
	/**
	 * Get all tournaments.
	 */
	async getAll(): Promise<Tournament[]> {
		const records = await pb.collection('tournaments').getFullList();
		return records.map((r) => TournamentSchema.parse(r));
	},

	/**
	 * Get tournaments by season.
	 */
	async getBySeasonId(seasonId: string): Promise<Tournament[]> {
		const records = await pb.collection('tournaments').getFullList({
			filter: `season_id = "${seasonId}"`
		});
		return records.map((r) => TournamentSchema.parse(r));
	},

	/**
	 * Get a tournament by ID.
	 */
	async getById(id: string): Promise<Tournament> {
		try {
			const record = await pb.collection('tournaments').getOne(id);
			return TournamentSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('Tournament', id);
			}
			throw err;
		}
	},

	/**
	 * Create a new tournament.
	 */
	async create(data: TournamentCreate): Promise<Tournament> {
		const record = await pb.collection('tournaments').create({
			...data,
			status: 'scheduled',
			current_round: 0
		});
		return TournamentSchema.parse(record);
	},

	/**
	 * Update a tournament.
	 */
	async update(id: string, data: TournamentUpdate): Promise<Tournament> {
		const record = await pb.collection('tournaments').update(id, data);
		return TournamentSchema.parse(record);
	},

	/**
	 * Update tournament status.
	 */
	async updateStatus(id: string, status: TournamentStatus): Promise<Tournament> {
		const record = await pb.collection('tournaments').update(id, { status });
		return TournamentSchema.parse(record);
	},

	/**
	 * Update current round.
	 */
	async updateCurrentRound(id: string, roundNumber: number): Promise<Tournament> {
		const record = await pb.collection('tournaments').update(id, { current_round: roundNumber });
		return TournamentSchema.parse(record);
	},

	/**
	 * Delete a tournament.
	 */
	async delete(id: string): Promise<void> {
		await pb.collection('tournaments').delete(id);
	}
};

/**
 * Repository for Tournament Rounds.
 */
export const TournamentRoundRepo = {
	/**
	 * Get all rounds for a tournament.
	 */
	async getByTournamentId(tournamentId: string): Promise<TournamentRound[]> {
		const records = await pb.collection('tournament_rounds').getFullList({
			filter: `tournament_id = "${tournamentId}"`
		});
		return records.map((r) => TournamentRoundSchema.parse(r));
	},

	/**
	 * Get a specific round.
	 */
	async getById(id: string): Promise<TournamentRound> {
		try {
			const record = await pb.collection('tournament_rounds').getOne(id);
			return TournamentRoundSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('TournamentRound', id);
			}
			throw err;
		}
	},

	/**
	 * Create a round.
	 */
	async create(data: TournamentRoundCreate): Promise<TournamentRound> {
		const record = await pb.collection('tournament_rounds').create({
			...data,
			status: 'pending'
		});
		return TournamentRoundSchema.parse(record);
	},

	/**
	 * Update round status.
	 */
	async updateStatus(
		id: string,
		status: 'pending' | 'in_progress' | 'complete'
	): Promise<TournamentRound> {
		const record = await pb.collection('tournament_rounds').update(id, { status });
		return TournamentRoundSchema.parse(record);
	},

	/**
	 * Delete all rounds for a tournament.
	 */
	async deleteByTournamentId(tournamentId: string): Promise<void> {
		const rounds = await pb.collection('tournament_rounds').getFullList({
			filter: `tournament_id = "${tournamentId}"`
		});
		for (const round of rounds) {
			await pb.collection('tournament_rounds').delete(round.id);
		}
	}
};
