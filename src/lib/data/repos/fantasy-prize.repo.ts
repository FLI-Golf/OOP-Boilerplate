import { pb } from '$lib/data/pb/pb.client';
import { NotFoundError } from '$lib/core/errors';
import {
	FantasyPrizeSchema,
	type FantasyPrize,
	type FantasyPrizeCreate,
	type FantasyPrizeUpdate,
	type PrizeStatus
} from '$lib/schemas/fantasy-prize.schema';

/**
 * Repository for Fantasy Prize persistence.
 */
export const FantasyPrizeRepo = {
	/**
	 * Get all prizes for a league.
	 */
	async getByLeagueId(leagueId: string): Promise<FantasyPrize[]> {
		const records = await pb.collection('fantasy_prizes').getFullList({
			filter: `league_id = "${leagueId}"`,
			sort: 'position'
		});
		return records.map((r) => FantasyPrizeSchema.parse(r));
	},

	/**
	 * Get a prize by ID.
	 */
	async getById(id: string): Promise<FantasyPrize> {
		try {
			const record = await pb.collection('fantasy_prizes').getOne(id);
			return FantasyPrizeSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('FantasyPrize', id);
			}
			throw err;
		}
	},

	/**
	 * Get prizes by status.
	 */
	async getByStatus(leagueId: string, status: PrizeStatus): Promise<FantasyPrize[]> {
		const records = await pb.collection('fantasy_prizes').getFullList({
			filter: `league_id = "${leagueId}" && status = "${status}"`
		});
		return records.map((r) => FantasyPrizeSchema.parse(r));
	},

	/**
	 * Get prizes won by a participant.
	 */
	async getByParticipantId(participantId: string): Promise<FantasyPrize[]> {
		const records = await pb.collection('fantasy_prizes').getFullList({
			filter: `participant_id = "${participantId}"`
		});
		return records.map((r) => FantasyPrizeSchema.parse(r));
	},

	/**
	 * Create a prize.
	 */
	async create(data: FantasyPrizeCreate): Promise<FantasyPrize> {
		const record = await pb.collection('fantasy_prizes').create({
			...data,
			status: 'pending'
		});
		return FantasyPrizeSchema.parse(record);
	},

	/**
	 * Create multiple prizes.
	 */
	async createMany(prizes: FantasyPrizeCreate[]): Promise<FantasyPrize[]> {
		const created: FantasyPrize[] = [];
		for (const prize of prizes) {
			const record = await pb.collection('fantasy_prizes').create({
				...prize,
				status: 'pending'
			});
			created.push(FantasyPrizeSchema.parse(record));
		}
		return created;
	},

	/**
	 * Update a prize.
	 */
	async update(id: string, data: FantasyPrizeUpdate): Promise<FantasyPrize> {
		const record = await pb.collection('fantasy_prizes').update(id, data);
		return FantasyPrizeSchema.parse(record);
	},

	/**
	 * Award a prize to a participant.
	 */
	async award(id: string, participantId: string): Promise<FantasyPrize> {
		const record = await pb.collection('fantasy_prizes').update(id, {
			participant_id: participantId,
			status: 'awarded',
			awarded_at: new Date().toISOString()
		});
		return FantasyPrizeSchema.parse(record);
	},

	/**
	 * Mark a prize as paid.
	 */
	async markPaid(id: string): Promise<FantasyPrize> {
		const record = await pb.collection('fantasy_prizes').update(id, {
			status: 'paid',
			paid_at: new Date().toISOString()
		});
		return FantasyPrizeSchema.parse(record);
	},

	/**
	 * Delete a prize.
	 */
	async delete(id: string): Promise<void> {
		await pb.collection('fantasy_prizes').delete(id);
	},

	/**
	 * Delete all prizes for a league.
	 */
	async deleteByLeagueId(leagueId: string): Promise<void> {
		const prizes = await pb.collection('fantasy_prizes').getFullList({
			filter: `league_id = "${leagueId}"`
		});
		for (const prize of prizes) {
			await pb.collection('fantasy_prizes').delete(prize.id);
		}
	}
};
