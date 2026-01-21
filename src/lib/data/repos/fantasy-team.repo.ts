import { pb } from '$lib/data/pb/pb.client';
import { NotFoundError } from '$lib/core/errors';
import {
	FantasyTeamSchema,
	DraftPickSchema,
	type FantasyTeam,
	type FantasyTeamCreate,
	type FantasyTeamUpdate,
	type DraftPick,
	type DraftPickCreate
} from '$lib/schemas/fantasy-team.schema';

/**
 * Repository for Fantasy Team persistence.
 */
export const FantasyTeamRepo = {
	/**
	 * Get all fantasy teams for a league.
	 */
	async getByLeagueId(leagueId: string): Promise<FantasyTeam[]> {
		const records = await pb.collection('fantasy_teams').getFullList({
			filter: `league_id = "${leagueId}"`
		});
		return records.map((r) => FantasyTeamSchema.parse(r));
	},

	/**
	 * Get a fantasy team by participant.
	 */
	async getByParticipantId(participantId: string): Promise<FantasyTeam | null> {
		const records = await pb.collection('fantasy_teams').getFullList({
			filter: `participant_id = "${participantId}"`
		});
		if (records.length === 0) return null;
		return FantasyTeamSchema.parse(records[0]);
	},

	/**
	 * Get a fantasy team by ID.
	 */
	async getById(id: string): Promise<FantasyTeam> {
		try {
			const record = await pb.collection('fantasy_teams').getOne(id);
			return FantasyTeamSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('FantasyTeam', id);
			}
			throw err;
		}
	},

	/**
	 * Create a fantasy team.
	 */
	async create(data: FantasyTeamCreate): Promise<FantasyTeam> {
		const record = await pb.collection('fantasy_teams').create({
			...data,
			pro_ids: []
		});
		return FantasyTeamSchema.parse(record);
	},

	/**
	 * Update a fantasy team.
	 */
	async update(id: string, data: FantasyTeamUpdate): Promise<FantasyTeam> {
		const record = await pb.collection('fantasy_teams').update(id, data);
		return FantasyTeamSchema.parse(record);
	},

	/**
	 * Add a pro to a fantasy team.
	 */
	async addPro(id: string, proId: string): Promise<FantasyTeam> {
		const team = await FantasyTeamRepo.getById(id);
		const newProIds = [...team.pro_ids, proId];
		const record = await pb.collection('fantasy_teams').update(id, { pro_ids: newProIds });
		return FantasyTeamSchema.parse(record);
	},

	/**
	 * Remove a pro from a fantasy team.
	 */
	async removePro(id: string, proId: string): Promise<FantasyTeam> {
		const team = await FantasyTeamRepo.getById(id);
		const newProIds = team.pro_ids.filter((id) => id !== proId);
		const record = await pb.collection('fantasy_teams').update(id, { pro_ids: newProIds });
		return FantasyTeamSchema.parse(record);
	},

	/**
	 * Delete a fantasy team.
	 */
	async delete(id: string): Promise<void> {
		await pb.collection('fantasy_teams').delete(id);
	},

	/**
	 * Delete all fantasy teams for a league.
	 */
	async deleteByLeagueId(leagueId: string): Promise<void> {
		const teams = await pb.collection('fantasy_teams').getFullList({
			filter: `league_id = "${leagueId}"`
		});
		for (const team of teams) {
			await pb.collection('fantasy_teams').delete(team.id);
		}
	}
};

/**
 * Repository for Draft Picks.
 */
export const DraftPickRepo = {
	/**
	 * Get all picks for a league.
	 */
	async getByLeagueId(leagueId: string): Promise<DraftPick[]> {
		const records = await pb.collection('draft_picks').getFullList({
			filter: `league_id = "${leagueId}"`,
			sort: 'pick_number'
		});
		return records.map((r) => DraftPickSchema.parse(r));
	},

	/**
	 * Get picks for a participant.
	 */
	async getByParticipantId(participantId: string): Promise<DraftPick[]> {
		const records = await pb.collection('draft_picks').getFullList({
			filter: `participant_id = "${participantId}"`,
			sort: 'pick_number'
		});
		return records.map((r) => DraftPickSchema.parse(r));
	},

	/**
	 * Get the latest pick for a league.
	 */
	async getLatestPick(leagueId: string): Promise<DraftPick | null> {
		const records = await pb.collection('draft_picks').getFullList({
			filter: `league_id = "${leagueId}"`,
			sort: '-pick_number',
			perPage: 1
		});
		if (records.length === 0) return null;
		return DraftPickSchema.parse(records[0]);
	},

	/**
	 * Check if a pro has been drafted.
	 */
	async isProDrafted(leagueId: string, proId: string): Promise<boolean> {
		const records = await pb.collection('draft_picks').getFullList({
			filter: `league_id = "${leagueId}" && pro_id = "${proId}"`
		});
		return records.length > 0;
	},

	/**
	 * Create a draft pick.
	 */
	async create(data: DraftPickCreate): Promise<DraftPick> {
		const record = await pb.collection('draft_picks').create({
			...data,
			picked_at: new Date().toISOString()
		});
		return DraftPickSchema.parse(record);
	},

	/**
	 * Delete all picks for a league.
	 */
	async deleteByLeagueId(leagueId: string): Promise<void> {
		const picks = await pb.collection('draft_picks').getFullList({
			filter: `league_id = "${leagueId}"`
		});
		for (const pick of picks) {
			await pb.collection('draft_picks').delete(pick.id);
		}
	}
};
