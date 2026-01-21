import { z } from 'zod';

/**
 * Gender enum for pros.
 */
export const GenderEnum = z.enum(['male', 'female']);
export type Gender = z.infer<typeof GenderEnum>;

/**
 * Schema for a Pro (professional player).
 */
export const ProSchema = z.object({
	id: z.string(),
	name: z.string().min(1, 'Name is required'),
	gender: GenderEnum,
	rating: z.number().min(0).max(100).optional(),
	active: z.boolean().default(true),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type Pro = z.infer<typeof ProSchema>;

/**
 * Schema for creating a new Pro.
 */
export const ProCreateSchema = ProSchema.omit({ id: true, created: true, updated: true });
export type ProCreate = z.infer<typeof ProCreateSchema>;

/**
 * Schema for updating a Pro.
 */
export const ProUpdateSchema = ProCreateSchema.partial();
export type ProUpdate = z.infer<typeof ProUpdateSchema>;
