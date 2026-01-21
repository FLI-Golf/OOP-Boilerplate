import { pb } from '$lib/data/pb/pb.client';
import { NotFoundError } from '$lib/core/errors';
import {
	FantasyLeagueSchema,
	FantasyParticipantSchema,
	type FantasyLeague,
	type FantasyLeagueCreate,
	type FantasyLeagueUpdate,
	type FantasyLeagueStatus,
	type FantasyParticipant,
	type FantasyParticipantCreate
} from '$lib/schemas/fantasy-league.schema';

/**
 * Repository for Fantasy League persistence.
 */
export const FantasyLeagueRepo = {
	/**
	 * Get all fantasy leagues.
	 */
	async getAll(): Promise<FantasyLeague[]> {
		const records = await pb.collection('fantasy_leagues').getFullList();
		return records.map((r) => FantasyLeagueSchema.parse(r));
	},

	/**
	 * Get fantasy leagues by season.
	 */
	async getBySeasonId(seasonId: string): Promise<FantasyLeague[]> {
		const records = await pb.collection('fantasy_leagues').getFullList({
			filter: `season_id = "${seasonId}"`
		});
		return records.map((r) => FantasyLeagueSchema.parse(r));
	},

	/**
	 * Get fantasy leagues where user is commissioner.
	 */
	async getByCommissionerId(userId: string): Promise<FantasyLeague[]> {
		const records = await pb.collection('fantasy_leagues').getFullList({
			filter: `commissioner_id = "${userId}"`
		});
		return records.map((r) => FantasyLeagueSchema.parse(r));
	},

	/**
	 * Get a fantasy league by ID.
	 */
	async getById(id: string): Promise<FantasyLeague> {
		try {
			const record = await pb.collection('fantasy_leagues').getOne(id);
			return FantasyLeagueSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('FantasyLeague', id);
			}
			throw err;
		}
	},

	/**
	 * Create a fantasy league.
	 */
	async create(data: FantasyLeagueCreate): Promise<FantasyLeague> {
		const record = await pb.collection('fantasy_leagues').create({
			...data,
			status: 'setup',
			prize_pool: 0
		});
		return FantasyLeagueSchema.parse(record);
	},

	/**
	 * Update a fantasy league.
	 */
	async update(id: string, data: FantasyLeagueUpdate): Promise<FantasyLeague> {
		const record = await pb.collection('fantasy_leagues').update(id, data);
		return FantasyLeagueSchema.parse(record);
	},

	/**
	 * Update fantasy league status.
	 */
	async updateStatus(id: string, status: FantasyLeagueStatus): Promise<FantasyLeague> {
		const record = await pb.collection('fantasy_leagues').update(id, { status });
		return FantasyLeagueSchema.parse(record);
	},

	/**
	 * Update prize pool.
	 */
	async updatePrizePool(id: string, prizePool: number): Promise<FantasyLeague> {
		const record = await pb.collection('fantasy_leagues').update(id, { prize_pool: prizePool });
		return FantasyLeagueSchema.parse(record);
	},

	/**
	 * Delete a fantasy league.
	 */
	async delete(id: string): Promise<void> {
		await pb.collection('fantasy_leagues').delete(id);
	}
};

/**
 * Repository for Fantasy Participants.
 */
export const FantasyParticipantRepo = {
	/**
	 * Get all participants for a league.
	 */
	async getByLeagueId(leagueId: string): Promise<FantasyParticipant[]> {
		const records = await pb.collection('fantasy_participants').getFullList({
			filter: `league_id = "${leagueId}"`
		});
		return records.map((r) => FantasyParticipantSchema.parse(r));
	},

	/**
	 * Get a participant by ID.
	 */
	async getById(id: string): Promise<FantasyParticipant> {
		try {
			const record = await pb.collection('fantasy_participants').getOne(id);
			return FantasyParticipantSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('FantasyParticipant', id);
			}
			throw err;
		}
	},

	/**
	 * Get participant by user and league.
	 */
	async getByUserAndLeague(userId: string, leagueId: string): Promise<FantasyParticipant | null> {
		const records = await pb.collection('fantasy_participants').getFullList({
			filter: `user_id = "${userId}" && league_id = "${leagueId}"`
		});
		if (records.length === 0) return null;
		return FantasyParticipantSchema.parse(records[0]);
	},

	/**
	 * Get all leagues a user is participating in.
	 */
	async getByUserId(userId: string): Promise<FantasyParticipant[]> {
		const records = await pb.collection('fantasy_participants').getFullList({
			filter: `user_id = "${userId}"`
		});
		return records.map((r) => FantasyParticipantSchema.parse(r));
	},

	/**
	 * Create a participant.
	 */
	async create(data: FantasyParticipantCreate): Promise<FantasyParticipant> {
		const record = await pb.collection('fantasy_participants').create({
			...data,
			total_points: 0
		});
		return FantasyParticipantSchema.parse(record);
	},

	/**
	 * Update participant points.
	 */
	async updatePoints(id: string, totalPoints: number): Promise<FantasyParticipant> {
		const record = await pb.collection('fantasy_participants').update(id, {
			total_points: totalPoints
		});
		return FantasyParticipantSchema.parse(record);
	},

	/**
	 * Update participant rank.
	 */
	async updateRank(id: string, rank: number): Promise<FantasyParticipant> {
		const record = await pb.collection('fantasy_participants').update(id, { rank });
		return FantasyParticipantSchema.parse(record);
	},

	/**
	 * Set draft position.
	 */
	async setDraftPosition(id: string, position: number): Promise<FantasyParticipant> {
		const record = await pb.collection('fantasy_participants').update(id, {
			draft_position: position
		});
		return FantasyParticipantSchema.parse(record);
	},

	/**
	 * Mark participant as paid.
	 */
	async markPaid(id: string): Promise<FantasyParticipant> {
		const record = await pb.collection('fantasy_participants').update(id, { paid: true });
		return FantasyParticipantSchema.parse(record);
	},

	/**
	 * Delete a participant.
	 */
	async delete(id: string): Promise<void> {
		await pb.collection('fantasy_participants').delete(id);
	},

	/**
	 * Delete all participants for a league.
	 */
	async deleteByLeagueId(leagueId: string): Promise<void> {
		const participants = await pb.collection('fantasy_participants').getFullList({
			filter: `league_id = "${leagueId}"`
		});
		for (const p of participants) {
			await pb.collection('fantasy_participants').delete(p.id);
		}
	}
};
