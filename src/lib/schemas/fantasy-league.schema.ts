import { z } from 'zod';

/**
 * Fantasy League status enum.
 * setup -> drafting -> active -> complete
 */
export const FantasyLeagueStatusEnum = z.enum(['setup', 'drafting', 'active', 'complete']);
export type FantasyLeagueStatus = z.infer<typeof FantasyLeagueStatusEnum>;

/**
 * Schema for a Fantasy League.
 */
export const FantasyLeagueSchema = z.object({
	id: z.string(),
	name: z.string().min(1, 'Name is required'),
	season_id: z.string(),
	commissioner_id: z.string(), // User who created/manages the league
	status: FantasyLeagueStatusEnum.default('setup'),
	max_participants: z.number().int().min(2).max(20).default(12),
	draft_rounds: z.number().int().min(1).max(10).default(4),
	entry_fee: z.number().min(0).default(0),
	prize_pool: z.number().min(0).default(0),
	draft_start_time: z.string().datetime().optional(),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type FantasyLeague = z.infer<typeof FantasyLeagueSchema>;

/**
 * Schema for creating a Fantasy League.
 */
export const FantasyLeagueCreateSchema = FantasyLeagueSchema.omit({
	id: true,
	created: true,
	updated: true,
	status: true,
	prize_pool: true
});
export type FantasyLeagueCreate = z.infer<typeof FantasyLeagueCreateSchema>;

/**
 * Schema for updating a Fantasy League.
 */
export const FantasyLeagueUpdateSchema = z.object({
	name: z.string().min(1).optional(),
	max_participants: z.number().int().min(2).max(20).optional(),
	draft_rounds: z.number().int().min(1).max(10).optional(),
	entry_fee: z.number().min(0).optional(),
	draft_start_time: z.string().datetime().optional()
});
export type FantasyLeagueUpdate = z.infer<typeof FantasyLeagueUpdateSchema>;

/**
 * Schema for a Fantasy Participant (user in a league).
 */
export const FantasyParticipantSchema = z.object({
	id: z.string(),
	league_id: z.string(),
	user_id: z.string(),
	display_name: z.string().min(1),
	draft_position: z.number().int().min(1).optional(),
	total_points: z.number().default(0),
	rank: z.number().int().min(1).optional(),
	paid: z.boolean().default(false),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type FantasyParticipant = z.infer<typeof FantasyParticipantSchema>;

/**
 * Schema for creating a Fantasy Participant.
 */
export const FantasyParticipantCreateSchema = FantasyParticipantSchema.omit({
	id: true,
	created: true,
	updated: true,
	total_points: true,
	rank: true,
	draft_position: true
});
export type FantasyParticipantCreate = z.infer<typeof FantasyParticipantCreateSchema>;
