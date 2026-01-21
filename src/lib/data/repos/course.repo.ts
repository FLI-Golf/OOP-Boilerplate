import { pb } from '$lib/data/pb/pb.client';
import { NotFoundError } from '$lib/core/errors';
import {
	CourseSchema,
	HoleSchema,
	type Course,
	type CourseCreate,
	type CourseUpdate,
	type Hole,
	type HoleCreate
} from '$lib/schemas/course.schema';

/**
 * Repository for Course and Hole persistence.
 *
 * All methods return Zod-validated DTOs.
 * This is the ONLY layer that imports PocketBase.
 */
export const CourseRepo = {
	/**
	 * Get all courses.
	 */
	async getAll(): Promise<Course[]> {
		const records = await pb.collection('courses').getFullList();
		return records.map((r) => CourseSchema.parse(r));
	},

	/**
	 * Get a course by ID.
	 * Throws NotFoundError if not found.
	 */
	async getById(id: string): Promise<Course> {
		try {
			const record = await pb.collection('courses').getOne(id);
			return CourseSchema.parse(record);
		} catch (err: unknown) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
				throw new NotFoundError('Course', id);
			}
			throw err;
		}
	},

	/**
	 * Create a new course.
	 */
	async create(data: CourseCreate): Promise<Course> {
		const record = await pb.collection('courses').create(data);
		return CourseSchema.parse(record);
	},

	/**
	 * Update a course.
	 */
	async update(id: string, data: CourseUpdate): Promise<Course> {
		const record = await pb.collection('courses').update(id, data);
		return CourseSchema.parse(record);
	},

	/**
	 * Delete a course.
	 */
	async delete(id: string): Promise<void> {
		await pb.collection('courses').delete(id);
	}
};

/**
 * Repository for Holes.
 */
export const HoleRepo = {
	/**
	 * Get all holes for a course.
	 */
	async getByCourseId(courseId: string): Promise<Hole[]> {
		const records = await pb.collection('holes').getFullList({
			filter: `course_id = "${courseId}"`
		});
		return records.map((r) => HoleSchema.parse(r));
	},

	/**
	 * Create a hole.
	 */
	async create(courseId: string, data: HoleCreate): Promise<Hole> {
		const record = await pb.collection('holes').create({
			...data,
			course_id: courseId
		});
		return HoleSchema.parse(record);
	},

	/**
	 * Create multiple holes at once.
	 */
	async createMany(courseId: string, holes: HoleCreate[]): Promise<Hole[]> {
		const created: Hole[] = [];
		for (const hole of holes) {
			const record = await pb.collection('holes').create({
				...hole,
				course_id: courseId
			});
			created.push(HoleSchema.parse(record));
		}
		return created;
	},

	/**
	 * Delete all holes for a course.
	 */
	async deleteByCourseId(courseId: string): Promise<void> {
		const holes = await pb.collection('holes').getFullList({
			filter: `course_id = "${courseId}"`
		});
		for (const hole of holes) {
			await pb.collection('holes').delete(hole.id);
		}
	}
};
