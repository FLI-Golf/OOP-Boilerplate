import { pb } from '$lib/data/pb/pb.client';
import { NotFoundError } from '$lib/core/errors';
import { ProSchema, type Pro, type ProCreate, type ProUpdate } from '$lib/schemas/pro.schema';

/**
 * Repository for Pro persistence.
 */
export const ProRepo = {
	/**
	 * Get all pros.
	 */
	async getAll(): Promise<Pro[]> {
		const records = await pb.collection('pros').getFullList();
		return records.map((r) => ProSchema.parse(r));
	},

	/**
	 * Get all active pros.
	 */
	async getActive(): Promise<Pro[]> {
		const records = await pb.collection('pros').getFullList({
			filter: 'active = true'
		});
		return records.map((r) => ProSchema.parse(r));
	},

	/**
	 * Get a pro by ID.
	 */
	async getById(id: string): Promise<Pro> {
		try {
			const record = await pb.collection('pros').getOne(id);
			return ProSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('Pro', id);
			}
			throw err;
		}
	},

	/**
	 * Get multiple pros by IDs.
	 */
	async getByIds(ids: string[]): Promise<Pro[]> {
		if (ids.length === 0) return [];
		const filter = ids.map((id) => `id = "${id}"`).join(' || ');
		const records = await pb.collection('pros').getFullList({ filter });
		return records.map((r) => ProSchema.parse(r));
	},

	/**
	 * Get pros by gender.
	 */
	async getByGender(gender: 'male' | 'female'): Promise<Pro[]> {
		const records = await pb.collection('pros').getFullList({
			filter: `gender = "${gender}"`
		});
		return records.map((r) => ProSchema.parse(r));
	},

	/**
	 * Create a new pro.
	 */
	async create(data: ProCreate): Promise<Pro> {
		const record = await pb.collection('pros').create(data);
		return ProSchema.parse(record);
	},

	/**
	 * Update a pro.
	 */
	async update(id: string, data: ProUpdate): Promise<Pro> {
		const record = await pb.collection('pros').update(id, data);
		return ProSchema.parse(record);
	},

	/**
	 * Delete a pro.
	 */
	async delete(id: string): Promise<void> {
		await pb.collection('pros').delete(id);
	}
};
