import { z } from 'zod';

/**
 * Schema for a Team.
 * A team consists of exactly 1 male pro + 1 female pro.
 */
export const TeamSchema = z.object({
	id: z.string(),
	name: z.string().min(1, 'Team name is required'),
	tournament_id: z.string(),
	male_pro_id: z.string(),
	female_pro_id: z.string(),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type Team = z.infer<typeof TeamSchema>;

/**
 * Schema for creating a new Team.
 */
export const TeamCreateSchema = TeamSchema.omit({ id: true, created: true, updated: true });
export type TeamCreate = z.infer<typeof TeamCreateSchema>;

/**
 * Schema for updating a Team.
 */
export const TeamUpdateSchema = TeamCreateSchema.partial().omit({
	tournament_id: true,
	male_pro_id: true,
	female_pro_id: true
});
export type TeamUpdate = z.infer<typeof TeamUpdateSchema>;
