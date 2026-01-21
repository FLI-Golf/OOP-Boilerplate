import { pb } from '$lib/data/pb/pb.client';
import { NotFoundError } from '$lib/core/errors';
import {
	FantasyLeagueSchema,
	FantasyParticipantSchema,
	JoinRequestSchema,
	type FantasyLeague,
	type FantasyLeagueCreate,
	type FantasyLeagueSettings,
	type FantasyLeagueStatus,
	type FantasyParticipant,
	type FantasyParticipantCreate,
	type JoinRequest,
	type JoinRequestCreate,
	type JoinRequestStatus
} from '$lib/schemas/fantasy-league.schema';

/**
 * Repository for Fantasy League persistence.
 */
export const FantasyLeagueRepo = {
	async getAll(): Promise<FantasyLeague[]> {
		const records = await pb.collection('fantasy_leagues').getFullList();
		return records.map((r) => FantasyLeagueSchema.parse(r));
	},

	async getBySeasonId(seasonId: string): Promise<FantasyLeague[]> {
		const records = await pb.collection('fantasy_leagues').getFullList({
			filter: `season_id = "${seasonId}"`
		});
		return records.map((r) => FantasyLeagueSchema.parse(r));
	},

	async getByOwnerId(userId: string): Promise<FantasyLeague[]> {
		const records = await pb.collection('fantasy_leagues').getFullList({
			filter: `owner_id = "${userId}"`
		});
		return records.map((r) => FantasyLeagueSchema.parse(r));
	},

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

	async getOpenLeagues(seasonId: string): Promise<FantasyLeague[]> {
		const records = await pb.collection('fantasy_leagues').getFullList({
			filter: `season_id = "${seasonId}" && status = "pending_players"`
		});
		return records.map((r) => FantasyLeagueSchema.parse(r));
	},

	async create(data: FantasyLeagueCreate): Promise<FantasyLeague> {
		const record = await pb.collection('fantasy_leagues').create({
			...data,
			status: 'pending_players',
			current_participants: 1,
			draft_rounds: 4,
			seconds_per_pick: 90,
			prize_pool: 0,
			auto_pick_enabled: true
		});
		return FantasyLeagueSchema.parse(record);
	},

	async updateSettings(id: string, data: FantasyLeagueSettings): Promise<FantasyLeague> {
		const record = await pb.collection('fantasy_leagues').update(id, data);
		return FantasyLeagueSchema.parse(record);
	},

	async updateStatus(id: string, status: FantasyLeagueStatus): Promise<FantasyLeague> {
		const record = await pb.collection('fantasy_leagues').update(id, { status });
		return FantasyLeagueSchema.parse(record);
	},

	async incrementParticipants(id: string): Promise<FantasyLeague> {
		const league = await FantasyLeagueRepo.getById(id);
		const record = await pb.collection('fantasy_leagues').update(id, {
			current_participants: league.current_participants + 1
		});
		return FantasyLeagueSchema.parse(record);
	},

	async updatePrizePool(id: string, prizePool: number): Promise<FantasyLeague> {
		const record = await pb.collection('fantasy_leagues').update(id, { prize_pool: prizePool });
		return FantasyLeagueSchema.parse(record);
	},

	async delete(id: string): Promise<void> {
		await pb.collection('fantasy_leagues').delete(id);
	}
};

/**
 * Repository for Join Requests.
 */
export const JoinRequestRepo = {
	async getByLeagueId(leagueId: string): Promise<JoinRequest[]> {
		const records = await pb.collection('join_requests').getFullList({
			filter: `league_id = "${leagueId}"`,
			sort: '-created'
		});
		return records.map((r) => JoinRequestSchema.parse(r));
	},

	async getPendingByLeagueId(leagueId: string): Promise<JoinRequest[]> {
		const records = await pb.collection('join_requests').getFullList({
			filter: `league_id = "${leagueId}" && status = "pending"`,
			sort: 'created'
		});
		return records.map((r) => JoinRequestSchema.parse(r));
	},

	async getByUserId(userId: string): Promise<JoinRequest[]> {
		const records = await pb.collection('join_requests').getFullList({
			filter: `user_id = "${userId}"`
		});
		return records.map((r) => JoinRequestSchema.parse(r));
	},

	async getByUserAndLeague(userId: string, leagueId: string): Promise<JoinRequest | null> {
		const records = await pb.collection('join_requests').getFullList({
			filter: `user_id = "${userId}" && league_id = "${leagueId}"`
		});
		if (records.length === 0) return null;
		return JoinRequestSchema.parse(records[0]);
	},

	async getById(id: string): Promise<JoinRequest> {
		try {
			const record = await pb.collection('join_requests').getOne(id);
			return JoinRequestSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('JoinRequest', id);
			}
			throw err;
		}
	},

	async create(data: JoinRequestCreate): Promise<JoinRequest> {
		const record = await pb.collection('join_requests').create({
			...data,
			status: 'pending'
		});
		return JoinRequestSchema.parse(record);
	},

	async updateStatus(id: string, status: JoinRequestStatus): Promise<JoinRequest> {
		const record = await pb.collection('join_requests').update(id, {
			status,
			responded_at: new Date().toISOString()
		});
		return JoinRequestSchema.parse(record);
	},

	async delete(id: string): Promise<void> {
		await pb.collection('join_requests').delete(id);
	}
};

/**
 * Repository for Fantasy Participants.
 */
export const FantasyParticipantRepo = {
	async getByLeagueId(leagueId: string): Promise<FantasyParticipant[]> {
		const records = await pb.collection('fantasy_participants').getFullList({
			filter: `league_id = "${leagueId}"`
		});
		return records.map((r) => FantasyParticipantSchema.parse(r));
	},

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

	async getByUserAndLeague(userId: string, leagueId: string): Promise<FantasyParticipant | null> {
		const records = await pb.collection('fantasy_participants').getFullList({
			filter: `user_id = "${userId}" && league_id = "${leagueId}"`
		});
		if (records.length === 0) return null;
		return FantasyParticipantSchema.parse(records[0]);
	},

	async getByUserId(userId: string): Promise<FantasyParticipant[]> {
		const records = await pb.collection('fantasy_participants').getFullList({
			filter: `user_id = "${userId}"`
		});
		return records.map((r) => FantasyParticipantSchema.parse(r));
	},

	async create(data: FantasyParticipantCreate): Promise<FantasyParticipant> {
		const record = await pb.collection('fantasy_participants').create({
			...data,
			total_points: 0,
			joined_at: new Date().toISOString()
		});
		return FantasyParticipantSchema.parse(record);
	},

	async setDraftPosition(id: string, position: number): Promise<FantasyParticipant> {
		const record = await pb.collection('fantasy_participants').update(id, {
			draft_position: position
		});
		return FantasyParticipantSchema.parse(record);
	},

	async updatePoints(id: string, totalPoints: number): Promise<FantasyParticipant> {
		const record = await pb.collection('fantasy_participants').update(id, {
			total_points: totalPoints
		});
		return FantasyParticipantSchema.parse(record);
	},

	async updateRank(id: string, rank: number): Promise<FantasyParticipant> {
		const record = await pb.collection('fantasy_participants').update(id, { rank });
		return FantasyParticipantSchema.parse(record);
	},

	async markPaid(id: string): Promise<FantasyParticipant> {
		const record = await pb.collection('fantasy_participants').update(id, { paid: true });
		return FantasyParticipantSchema.parse(record);
	},

	async delete(id: string): Promise<void> {
		await pb.collection('fantasy_participants').delete(id);
	},

	async deleteByLeagueId(leagueId: string): Promise<void> {
		const participants = await pb.collection('fantasy_participants').getFullList({
			filter: `league_id = "${leagueId}"`
		});
		for (const p of participants) {
			await pb.collection('fantasy_participants').delete(p.id);
		}
	}
};
