import { pb } from '$lib/data/pb/pb.client';
import { NotFoundError } from '$lib/core/errors';
import {
	UserProfileSchema,
	LeagueHistoryEntrySchema,
	type UserProfile,
	type UserProfileCreate,
	type UserProfileUpdate,
	type LeagueHistoryEntry,
	type LeagueHistoryCreate,
	type UserRole
} from '$lib/schemas/user.schema';

/**
 * Repository for User Profile persistence.
 */
export const UserProfileRepo = {
	/**
	 * Get profile by user ID (PocketBase auth user ID).
	 */
	async getByUserId(userId: string): Promise<UserProfile | null> {
		const records = await pb.collection('user_profiles').getFullList({
			filter: `user_id = "${userId}"`
		});
		if (records.length === 0) return null;
		return UserProfileSchema.parse(records[0]);
	},

	/**
	 * Get profile by ID.
	 */
	async getById(id: string): Promise<UserProfile> {
		try {
			const record = await pb.collection('user_profiles').getOne(id);
			return UserProfileSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('UserProfile', id);
			}
			throw err;
		}
	},

	/**
	 * Create a profile.
	 */
	async create(data: UserProfileCreate): Promise<UserProfile> {
		const record = await pb.collection('user_profiles').create({
			...data,
			role: 'user',
			email_notifications: true,
			leagues_joined: 0,
			leagues_won: 0,
			tournaments_played: 0,
			total_fantasy_points: 0,
			total_winnings: 0,
			total_entry_fees: 0
		});
		return UserProfileSchema.parse(record);
	},

	/**
	 * Update a profile.
	 */
	async update(id: string, data: UserProfileUpdate): Promise<UserProfile> {
		const record = await pb.collection('user_profiles').update(id, data);
		return UserProfileSchema.parse(record);
	},

	/**
	 * Update user role (admin only).
	 */
	async updateRole(id: string, role: UserRole): Promise<UserProfile> {
		const record = await pb.collection('user_profiles').update(id, { role });
		return UserProfileSchema.parse(record);
	},

	/**
	 * Increment leagues joined count.
	 */
	async incrementLeaguesJoined(userId: string): Promise<void> {
		const profile = await UserProfileRepo.getByUserId(userId);
		if (profile) {
			await pb.collection('user_profiles').update(profile.id, {
				leagues_joined: profile.leagues_joined + 1
			});
		}
	},

	/**
	 * Increment leagues won count.
	 */
	async incrementLeaguesWon(userId: string): Promise<void> {
		const profile = await UserProfileRepo.getByUserId(userId);
		if (profile) {
			await pb.collection('user_profiles').update(profile.id, {
				leagues_won: profile.leagues_won + 1
			});
		}
	},

	/**
	 * Update lifetime stats after a league completes.
	 */
	async updateLifetimeStats(
		userId: string,
		stats: {
			pointsEarned: number;
			winnings: number;
			entryFee: number;
			finalRank: number;
		}
	): Promise<void> {
		const profile = await UserProfileRepo.getByUserId(userId);
		if (!profile) return;

		const updates: Partial<UserProfile> = {
			total_fantasy_points: profile.total_fantasy_points + stats.pointsEarned,
			total_winnings: profile.total_winnings + stats.winnings,
			total_entry_fees: profile.total_entry_fees + stats.entryFee
		};

		// Update best finish if this is better
		if (!profile.best_finish || stats.finalRank < profile.best_finish) {
			updates.best_finish = stats.finalRank;
		}

		await pb.collection('user_profiles').update(profile.id, updates);
	},

	/**
	 * Delete a profile.
	 */
	async delete(id: string): Promise<void> {
		await pb.collection('user_profiles').delete(id);
	}
};

/**
 * Repository for League History.
 */
export const LeagueHistoryRepo = {
	/**
	 * Get all history for a user.
	 */
	async getByUserId(userId: string): Promise<LeagueHistoryEntry[]> {
		const records = await pb.collection('league_history').getFullList({
			filter: `user_id = "${userId}"`,
			sort: '-completed_at'
		});
		return records.map((r) => LeagueHistoryEntrySchema.parse(r));
	},

	/**
	 * Get history for a specific league.
	 */
	async getByLeagueId(leagueId: string): Promise<LeagueHistoryEntry[]> {
		const records = await pb.collection('league_history').getFullList({
			filter: `league_id = "${leagueId}"`,
			sort: 'final_rank'
		});
		return records.map((r) => LeagueHistoryEntrySchema.parse(r));
	},

	/**
	 * Create a history entry.
	 */
	async create(data: LeagueHistoryCreate): Promise<LeagueHistoryEntry> {
		const record = await pb.collection('league_history').create(data);
		return LeagueHistoryEntrySchema.parse(record);
	},

	/**
	 * Create history entries for all participants when league completes.
	 */
	async createForLeague(entries: LeagueHistoryCreate[]): Promise<LeagueHistoryEntry[]> {
		const created: LeagueHistoryEntry[] = [];
		for (const entry of entries) {
			const record = await pb.collection('league_history').create(entry);
			created.push(LeagueHistoryEntrySchema.parse(record));
		}
		return created;
	}
};
