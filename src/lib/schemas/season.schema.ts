import { z } from 'zod';

/**
 * Schema for a Season.
 */
export const SeasonSchema = z.object({
	id: z.string(),
	name: z.string().min(1, 'Name is required'),
	year: z.number().int().min(2020).max(2100),
	active: z.boolean().default(false),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type Season = z.infer<typeof SeasonSchema>;

/**
 * Schema for creating a new Season.
 */
export const SeasonCreateSchema = SeasonSchema.omit({ id: true, created: true, updated: true });
export type SeasonCreate = z.infer<typeof SeasonCreateSchema>;

/**
 * Schema for updating a Season.
 */
export const SeasonUpdateSchema = SeasonCreateSchema.partial();
export type SeasonUpdate = z.infer<typeof SeasonUpdateSchema>;
