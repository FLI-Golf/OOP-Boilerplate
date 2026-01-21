import { z } from 'zod';

/**
 * Schema for a Hole within a Course.
 */
export const HoleSchema = z.object({
	id: z.string(),
	course_id: z.string(),
	number: z.number().int().min(1).max(18),
	par: z.number().int().min(2).max(6) // typical par range
});

export type Hole = z.infer<typeof HoleSchema>;

/**
 * Schema for creating a new Hole (no id yet).
 */
export const HoleCreateSchema = HoleSchema.omit({ id: true, course_id: true });
export type HoleCreate = z.infer<typeof HoleCreateSchema>;

/**
 * Schema for a Course.
 */
export const CourseSchema = z.object({
	id: z.string(),
	name: z.string().min(1, 'Name is required'),
	location: z.string().optional(),
	hole_count: z.number().int().min(9).max(18).default(18),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type Course = z.infer<typeof CourseSchema>;

/**
 * Schema for creating a new Course (no id, no timestamps).
 */
export const CourseCreateSchema = CourseSchema.omit({ id: true, created: true, updated: true });
export type CourseCreate = z.infer<typeof CourseCreateSchema>;

/**
 * Schema for updating a Course (all fields optional except what you're changing).
 */
export const CourseUpdateSchema = CourseCreateSchema.partial();
export type CourseUpdate = z.infer<typeof CourseUpdateSchema>;
