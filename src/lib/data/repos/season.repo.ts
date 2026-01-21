import { pb } from '$lib/data/pb/pb.client';
import { NotFoundError } from '$lib/core/errors';
import { SeasonSchema, type Season, type SeasonCreate, type SeasonUpdate } from '$lib/schemas/season.schema';

/**
 * Repository for Season persistence.
 */
export const SeasonRepo = {
	/**
	 * Get all seasons.
	 */
	async getAll(): Promise<Season[]> {
		const records = await pb.collection('seasons').getFullList();
		return records.map((r) => SeasonSchema.parse(r));
	},

	/**
	 * Get the active season.
	 */
	async getActive(): Promise<Season | null> {
		const records = await pb.collection('seasons').getFullList({
			filter: 'active = true'
		});
		if (records.length === 0) return null;
		return SeasonSchema.parse(records[0]);
	},

	/**
	 * Get a season by ID.
	 */
	async getById(id: string): Promise<Season> {
		try {
			const record = await pb.collection('seasons').getOne(id);
			return SeasonSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('Season', id);
			}
			throw err;
		}
	},

	/**
	 * Create a new season.
	 */
	async create(data: SeasonCreate): Promise<Season> {
		const record = await pb.collection('seasons').create(data);
		return SeasonSchema.parse(record);
	},

	/**
	 * Update a season.
	 */
	async update(id: string, data: SeasonUpdate): Promise<Season> {
		const record = await pb.collection('seasons').update(id, data);
		return SeasonSchema.parse(record);
	},

	/**
	 * Set a season as active (deactivates others).
	 */
	async setActive(id: string): Promise<Season> {
		// First deactivate all seasons
		const allSeasons = await pb.collection('seasons').getFullList();
		for (const season of allSeasons) {
			if (season.active) {
				await pb.collection('seasons').update(season.id, { active: false });
			}
		}
		// Then activate the target season
		const record = await pb.collection('seasons').update(id, { active: true });
		return SeasonSchema.parse(record);
	},

	/**
	 * Delete a season.
	 */
	async delete(id: string): Promise<void> {
		await pb.collection('seasons').delete(id);
	}
};
