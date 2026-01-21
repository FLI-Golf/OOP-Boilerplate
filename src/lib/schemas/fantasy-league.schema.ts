import { z } from 'zod';

/**
 * Fantasy League status enum.
 * pending_players -> ready -> drafting -> active -> complete
 */
export const FantasyLeagueStatusEnum = z.enum([
	'pending_players', // Waiting for participants to join
	'ready', // All spots filled, ready to configure/draft
	'drafting', // Draft in progress
	'active', // Season in progress
	'complete' // Season finished
]);
export type FantasyLeagueStatus = z.infer<typeof FantasyLeagueStatusEnum>;

/**
 * Schema for a Fantasy League.
 */
export const FantasyLeagueSchema = z.object({
	id: z.string(),
	name: z.string().min(1, 'Name is required'),
	season_id: z.string(),
	owner_id: z.string(), // User who purchased/created the league
	status: FantasyLeagueStatusEnum.default('pending_players'),
	max_participants: z.number().int().min(2).max(20).default(6),
	current_participants: z.number().int().default(1), // Owner counts as 1
	draft_rounds: z.number().int().min(1).max(10).default(4),
	seconds_per_pick: z.number().int().min(30).max(300).default(90),
	entry_fee: z.number().min(0).default(0),
	prize_pool: z.number().min(0).default(0),
	draft_start_time: z.string().datetime().optional(),
	auto_pick_enabled: z.boolean().default(true),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type FantasyLeague = z.infer<typeof FantasyLeagueSchema>;

/**
 * Schema for creating a Fantasy League (when owner purchases).
 */
export const FantasyLeagueCreateSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	season_id: z.string(),
	owner_id: z.string(),
	max_participants: z.number().int().min(2).max(20).default(6),
	entry_fee: z.number().min(0).default(0)
});
export type FantasyLeagueCreate = z.infer<typeof FantasyLeagueCreateSchema>;

/**
 * Schema for league settings (owner can adjust).
 */
export const FantasyLeagueSettingsSchema = z.object({
	name: z.string().min(1).optional(),
	draft_rounds: z.number().int().min(1).max(10).optional(),
	seconds_per_pick: z.number().int().min(30).max(300).optional(),
	auto_pick_enabled: z.boolean().optional(),
	draft_start_time: z.string().datetime().optional()
});
export type FantasyLeagueSettings = z.infer<typeof FantasyLeagueSettingsSchema>;

/**
 * Join request status.
 */
export const JoinRequestStatusEnum = z.enum(['pending', 'approved', 'rejected', 'cancelled']);
export type JoinRequestStatus = z.infer<typeof JoinRequestStatusEnum>;

/**
 * Schema for a Join Request.
 */
export const JoinRequestSchema = z.object({
	id: z.string(),
	league_id: z.string(),
	user_id: z.string(),
	display_name: z.string().min(1),
	message: z.string().optional(), // Optional message to owner
	status: JoinRequestStatusEnum.default('pending'),
	responded_at: z.string().datetime().optional(),
	created: z.string().datetime().optional()
});

export type JoinRequest = z.infer<typeof JoinRequestSchema>;

/**
 * Schema for creating a Join Request.
 */
export const JoinRequestCreateSchema = JoinRequestSchema.omit({
	id: true,
	created: true,
	status: true,
	responded_at: true
});
export type JoinRequestCreate = z.infer<typeof JoinRequestCreateSchema>;

/**
 * Schema for a Fantasy Participant (approved member of a league).
 */
export const FantasyParticipantSchema = z.object({
	id: z.string(),
	league_id: z.string(),
	user_id: z.string(),
	display_name: z.string().min(1),
	is_owner: z.boolean().default(false),
	draft_position: z.number().int().min(1).optional(),
	total_points: z.number().default(0),
	rank: z.number().int().min(1).optional(),
	paid: z.boolean().default(false),
	joined_at: z.string().datetime().optional(),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type FantasyParticipant = z.infer<typeof FantasyParticipantSchema>;

/**
 * Schema for creating a Fantasy Participant.
 */
export const FantasyParticipantCreateSchema = z.object({
	league_id: z.string(),
	user_id: z.string(),
	display_name: z.string().min(1),
	is_owner: z.boolean().default(false),
	paid: z.boolean().default(false)
});
export type FantasyParticipantCreate = z.infer<typeof FantasyParticipantCreateSchema>;
