import { z } from 'zod';

/**
 * Schema for a Group (pairing of teams for a round).
 */
export const GroupSchema = z.object({
	id: z.string(),
	tournament_id: z.string(),
	round_id: z.string(),
	name: z.string().min(1, 'Group name is required'),
	team_ids: z.array(z.string()).min(1).max(4),
	scorekeeper_id: z.string().optional(),
	tee_time: z.string().datetime().optional(),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type Group = z.infer<typeof GroupSchema>;

/**
 * Schema for creating a Group.
 */
export const GroupCreateSchema = GroupSchema.omit({ id: true, created: true, updated: true });
export type GroupCreate = z.infer<typeof GroupCreateSchema>;

/**
 * Schema for updating a Group.
 */
export const GroupUpdateSchema = z.object({
	name: z.string().min(1).optional(),
	scorekeeper_id: z.string().optional(),
	tee_time: z.string().datetime().optional()
});
export type GroupUpdate = z.infer<typeof GroupUpdateSchema>;
