import { pb } from '$lib/data/pb/pb.client';
import { NotFoundError } from '$lib/core/errors';
import { TeamSchema, type Team, type TeamCreate, type TeamUpdate } from '$lib/schemas/team.schema';

/**
 * Repository for Team persistence.
 */
export const TeamRepo = {
	/**
	 * Get all teams.
	 */
	async getAll(): Promise<Team[]> {
		const records = await pb.collection('teams').getFullList();
		return records.map((r) => TeamSchema.parse(r));
	},

	/**
	 * Get teams for a tournament.
	 */
	async getByTournamentId(tournamentId: string): Promise<Team[]> {
		const records = await pb.collection('teams').getFullList({
			filter: `tournament_id = "${tournamentId}"`
		});
		return records.map((r) => TeamSchema.parse(r));
	},

	/**
	 * Get a team by ID.
	 */
	async getById(id: string): Promise<Team> {
		try {
			const record = await pb.collection('teams').getOne(id);
			return TeamSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('Team', id);
			}
			throw err;
		}
	},

	/**
	 * Create a new team.
	 */
	async create(data: TeamCreate): Promise<Team> {
		const record = await pb.collection('teams').create(data);
		return TeamSchema.parse(record);
	},

	/**
	 * Update a team.
	 */
	async update(id: string, data: TeamUpdate): Promise<Team> {
		const record = await pb.collection('teams').update(id, data);
		return TeamSchema.parse(record);
	},

	/**
	 * Delete a team.
	 */
	async delete(id: string): Promise<void> {
		await pb.collection('teams').delete(id);
	},

	/**
	 * Delete all teams for a tournament.
	 */
	async deleteByTournamentId(tournamentId: string): Promise<void> {
		const teams = await pb.collection('teams').getFullList({
			filter: `tournament_id = "${tournamentId}"`
		});
		for (const team of teams) {
			await pb.collection('teams').delete(team.id);
		}
	}
};
