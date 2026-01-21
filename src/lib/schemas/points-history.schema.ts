import { z } from 'zod';

/**
 * Schema for Pro Points history.
 * Tracks points earned by a pro across tournaments/seasons.
 * Append-only historical record.
 */
export const ProPointsSchema = z.object({
	id: z.string(),
	pro_id: z.string(),
	season_id: z.string(),
	tournament_id: z.string().optional(),
	round_id: z.string().optional(),
	points: z.number(),
	source: z.enum(['tournament_finish', 'round_score', 'bonus', 'penalty']),
	description: z.string().optional(),
	recorded_at: z.string().datetime(),
	created: z.string().datetime().optional()
});

export type ProPoints = z.infer<typeof ProPointsSchema>;

/**
 * Schema for creating Pro Points.
 */
export const ProPointsCreateSchema = ProPointsSchema.omit({
	id: true,
	created: true,
	recorded_at: true
});
export type ProPointsCreate = z.infer<typeof ProPointsCreateSchema>;

/**
 * Schema for Team Points history (competition teams, not fantasy).
 * Tracks points earned by a male+female pro team.
 */
export const TeamPointsSchema = z.object({
	id: z.string(),
	team_id: z.string(),
	tournament_id: z.string(),
	round_id: z.string().optional(),
	points: z.number(),
	source: z.enum(['tournament_finish', 'round_score', 'bonus', 'penalty']),
	description: z.string().optional(),
	recorded_at: z.string().datetime(),
	created: z.string().datetime().optional()
});

export type TeamPoints = z.infer<typeof TeamPointsSchema>;

/**
 * Schema for creating Team Points.
 */
export const TeamPointsCreateSchema = TeamPointsSchema.omit({
	id: true,
	created: true,
	recorded_at: true
});
export type TeamPointsCreate = z.infer<typeof TeamPointsCreateSchema>;

/**
 * Aggregated pro stats (computed, not stored).
 */
export const ProStatsSchema = z.object({
	pro_id: z.string(),
	total_points: z.number(),
	tournament_count: z.number(),
	average_points: z.number(),
	best_finish: z.number().optional(),
	wins: z.number()
});

export type ProStats = z.infer<typeof ProStatsSchema>;

/**
 * Aggregated team stats (computed, not stored).
 */
export const TeamStatsSchema = z.object({
	team_id: z.string(),
	total_points: z.number(),
	tournament_count: z.number(),
	average_points: z.number(),
	best_finish: z.number().optional(),
	wins: z.number()
});

export type TeamStats = z.infer<typeof TeamStatsSchema>;
