import { z } from 'zod';

/**
 * Fantasy Tournament status.
 */
export const FantasyTournamentStatusEnum = z.enum([
	'upcoming', // Tournament hasn't started
	'live', // Tournament in progress, scoring active
	'complete', // Tournament finished, points calculated
	'cancelled' // Tournament was cancelled
]);
export type FantasyTournamentStatus = z.infer<typeof FantasyTournamentStatusEnum>;

/**
 * Schema for a Fantasy Tournament.
 * Links a fantasy league to a real tournament for scoring.
 */
export const FantasyTournamentSchema = z.object({
	id: z.string(),
	league_id: z.string(),
	tournament_id: z.string(), // Real tournament
	tournament_name: z.string(), // Denormalized for display
	tournament_number: z.number().int().min(1), // 1st, 2nd, 3rd tournament in season
	status: FantasyTournamentStatusEnum.default('upcoming'),
	start_date: z.string().datetime().optional(),
	end_date: z.string().datetime().optional(),
	points_calculated: z.boolean().default(false),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type FantasyTournament = z.infer<typeof FantasyTournamentSchema>;

/**
 * Schema for creating a Fantasy Tournament.
 */
export const FantasyTournamentCreateSchema = FantasyTournamentSchema.omit({
	id: true,
	created: true,
	updated: true,
	status: true,
	points_calculated: true
});
export type FantasyTournamentCreate = z.infer<typeof FantasyTournamentCreateSchema>;

/**
 * Fantasy Tournament with participant scores.
 */
export const FantasyTournamentScoresSchema = z.object({
	tournament_id: z.string(),
	tournament_name: z.string(),
	scores: z.array(
		z.object({
			participant_id: z.string(),
			display_name: z.string(),
			points: z.number(),
			rank: z.number().int()
		})
	)
});

export type FantasyTournamentScores = z.infer<typeof FantasyTournamentScoresSchema>;
