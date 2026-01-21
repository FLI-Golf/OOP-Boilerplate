import { z } from 'zod';

/**
 * Schema for a Fantasy Team (participant's roster).
 */
export const FantasyTeamSchema = z.object({
	id: z.string(),
	participant_id: z.string(),
	league_id: z.string(),
	name: z.string().min(1, 'Team name is required'),
	pro_ids: z.array(z.string()).default([]), // Drafted pros
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type FantasyTeam = z.infer<typeof FantasyTeamSchema>;

/**
 * Schema for creating a Fantasy Team.
 */
export const FantasyTeamCreateSchema = FantasyTeamSchema.omit({
	id: true,
	created: true,
	updated: true,
	pro_ids: true
});
export type FantasyTeamCreate = z.infer<typeof FantasyTeamCreateSchema>;

/**
 * Schema for updating a Fantasy Team.
 */
export const FantasyTeamUpdateSchema = z.object({
	name: z.string().min(1).optional()
});
export type FantasyTeamUpdate = z.infer<typeof FantasyTeamUpdateSchema>;

/**
 * Schema for a Draft Pick.
 */
export const DraftPickSchema = z.object({
	id: z.string(),
	league_id: z.string(),
	participant_id: z.string(),
	pro_id: z.string(),
	round_number: z.number().int().min(1),
	pick_number: z.number().int().min(1), // Overall pick number
	auto_picked: z.boolean().default(false),
	picked_at: z.string().datetime(),
	created: z.string().datetime().optional()
});

export type DraftPick = z.infer<typeof DraftPickSchema>;

/**
 * Schema for creating a Draft Pick.
 */
export const DraftPickCreateSchema = DraftPickSchema.omit({
	id: true,
	created: true,
	picked_at: true
});
export type DraftPickCreate = z.infer<typeof DraftPickCreateSchema>;

/**
 * Draft state for tracking current pick.
 */
export const DraftStateSchema = z.object({
	league_id: z.string(),
	current_round: z.number().int().min(1),
	current_pick: z.number().int().min(1), // Overall pick number
	current_participant_id: z.string(),
	pick_deadline: z.string().datetime().optional(),
	is_complete: z.boolean().default(false)
});

export type DraftState = z.infer<typeof DraftStateSchema>;
