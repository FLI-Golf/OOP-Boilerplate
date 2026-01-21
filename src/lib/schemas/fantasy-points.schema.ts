import { z } from 'zod';

/**
 * Point source types.
 */
export const PointSourceEnum = z.enum([
	'tournament_finish', // Points from tournament placement
	'round_score', // Points from round performance
	'bonus', // Bonus points (e.g., hole-in-one)
	'penalty', // Penalty points
	'adjustment' // Manual adjustment by commissioner
]);
export type PointSource = z.infer<typeof PointSourceEnum>;

/**
 * Schema for Fantasy Points entry.
 * Records points earned by a pro for a participant's team.
 */
export const FantasyPointsSchema = z.object({
	id: z.string(),
	league_id: z.string(),
	participant_id: z.string(),
	pro_id: z.string(),
	tournament_id: z.string().optional(),
	round_id: z.string().optional(),
	source: PointSourceEnum,
	points: z.number(),
	description: z.string().optional(),
	created: z.string().datetime().optional()
});

export type FantasyPoints = z.infer<typeof FantasyPointsSchema>;

/**
 * Schema for creating Fantasy Points.
 */
export const FantasyPointsCreateSchema = FantasyPointsSchema.omit({
	id: true,
	created: true
});
export type FantasyPointsCreate = z.infer<typeof FantasyPointsCreateSchema>;

/**
 * Scoring rules configuration.
 */
export const ScoringRulesSchema = z.object({
	// Points per position (1st, 2nd, 3rd, etc.)
	position_points: z.array(z.number()).default([100, 75, 60, 50, 45, 40, 35, 30, 25, 20, 15, 10]),

	// Points per stroke under/over par
	birdie_points: z.number().default(3),
	eagle_points: z.number().default(5),
	albatross_points: z.number().default(10),
	bogey_points: z.number().default(-1),
	double_bogey_points: z.number().default(-2),

	// Bonus points
	hole_in_one_points: z.number().default(25),
	round_leader_points: z.number().default(5),

	// Team bonus (if both pros on team finish in top 10)
	team_bonus_points: z.number().default(10)
});

export type ScoringRules = z.infer<typeof ScoringRulesSchema>;

/**
 * Participant points summary.
 */
export const ParticipantPointsSummarySchema = z.object({
	participant_id: z.string(),
	total_points: z.number(),
	tournament_points: z.number(),
	round_points: z.number(),
	bonus_points: z.number(),
	penalty_points: z.number(),
	points_by_pro: z.array(
		z.object({
			pro_id: z.string(),
			points: z.number()
		})
	)
});

export type ParticipantPointsSummary = z.infer<typeof ParticipantPointsSummarySchema>;
