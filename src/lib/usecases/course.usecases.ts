import { Course } from '$lib/domain/Course';
import { CourseRepo, HoleRepo } from '$lib/data/repos/course.repo';
import { CourseCreateSchema, type CourseCreate, type HoleCreate } from '$lib/schemas/course.schema';
import { ValidationError } from '$lib/core/errors';

/**
 * Use cases for Course management.
 *
 * UI calls these functions. They orchestrate:
 * 1. Validation (Zod schemas)
 * 2. Business rules (Domain classes)
 * 3. Persistence (Repositories)
 */

/**
 * Create a new course with its holes.
 *
 * @param courseData - Course details
 * @param holes - Optional array of holes. If not provided, generates default par-3 holes.
 * @returns The created Course domain object
 */
export async function createCourseWithHoles(
	courseData: CourseCreate,
	holes?: HoleCreate[]
): Promise<Course> {
	// 1. Validate input with Zod
	const validated = CourseCreateSchema.parse(courseData);

	// 2. Create the course in DB
	const courseDTO = await CourseRepo.create(validated);

	// 3. Generate default holes if not provided
	const holesToCreate = holes ?? Course.generateDefaultHoles(validated.hole_count);

	// 4. Validate each hole using domain logic
	const existingHoles: { number: number; par: number; id: string; course_id: string }[] = [];
	for (const hole of holesToCreate) {
		const error = Course.validateNewHole(validated.hole_count, existingHoles, hole);
		if (error) {
			// Rollback: delete the course we just created
			await CourseRepo.delete(courseDTO.id);
			throw new ValidationError(error);
		}
		existingHoles.push({ ...hole, id: 'temp', course_id: courseDTO.id });
	}

	// 5. Create holes in DB
	const createdHoles = await HoleRepo.createMany(courseDTO.id, holesToCreate);

	// 6. Return domain object
	return new Course(courseDTO, createdHoles);
}

/**
 * Get a course with all its holes.
 *
 * @param courseId - The course ID
 * @returns Course domain object with holes loaded
 */
export async function getCourseWithHoles(courseId: string): Promise<Course> {
	const courseDTO = await CourseRepo.getById(courseId);
	const holes = await HoleRepo.getByCourseId(courseId);
	return new Course(courseDTO, holes);
}

/**
 * List all courses (without holes).
 *
 * @returns Array of Course domain objects
 */
export async function listCourses(): Promise<Course[]> {
	const courses = await CourseRepo.getAll();
	return courses.map((c) => new Course(c));
}

/**
 * Delete a course and all its holes.
 *
 * @param courseId - The course ID to delete
 */
export async function deleteCourse(courseId: string): Promise<void> {
	// Delete holes first (foreign key constraint)
	await HoleRepo.deleteByCourseId(courseId);
	await CourseRepo.delete(courseId);
}

/**
 * Add a hole to an existing course.
 *
 * @param courseId - The course ID
 * @param hole - Hole data
 * @returns Updated Course domain object
 */
export async function addHoleToCourse(courseId: string, hole: HoleCreate): Promise<Course> {
	// 1. Load current state
	const courseDTO = await CourseRepo.getById(courseId);
	const existingHoles = await HoleRepo.getByCourseId(courseId);

	// 2. Validate using domain logic
	const error = Course.validateNewHole(courseDTO.hole_count, existingHoles, hole);
	if (error) {
		throw new ValidationError(error);
	}

	// 3. Create the hole
	const newHole = await HoleRepo.create(courseId, hole);

	// 4. Return updated domain object
	return new Course(courseDTO, [...existingHoles, newHole]);
}
