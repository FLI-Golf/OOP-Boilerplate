import { z } from 'zod';

/**
 * Schema for a HoleScoreEvent.
 * This is an append-only event recording a score entry.
 */
export const HoleScoreEventSchema = z.object({
	id: z.string(),
	tournament_id: z.string(),
	round_id: z.string(),
	group_id: z.string(),
	pro_id: z.string(),
	hole_number: z.number().int().min(1).max(18),
	throws: z.number().int().min(1).max(15), // reasonable bounds
	entered_by_id: z.string(),
	entered_at: z.string().datetime(),
	created: z.string().datetime().optional()
});

export type HoleScoreEvent = z.infer<typeof HoleScoreEventSchema>;

/**
 * Schema for creating a HoleScoreEvent.
 */
export const HoleScoreEventCreateSchema = HoleScoreEventSchema.omit({
	id: true,
	created: true,
	entered_at: true
});
export type HoleScoreEventCreate = z.infer<typeof HoleScoreEventCreateSchema>;

/**
 * Derived scorecard entry (computed from events).
 */
export const ScorecardEntrySchema = z.object({
	pro_id: z.string(),
	hole_number: z.number().int(),
	throws: z.number().int(),
	par: z.number().int(),
	score_to_par: z.number().int() // throws - par
});

export type ScorecardEntry = z.infer<typeof ScorecardEntrySchema>;

/**
 * Pro's scorecard for a round.
 */
export const ProScorecardSchema = z.object({
	pro_id: z.string(),
	round_id: z.string(),
	entries: z.array(ScorecardEntrySchema),
	total_throws: z.number().int(),
	total_par: z.number().int(),
	score_to_par: z.number().int()
});

export type ProScorecard = z.infer<typeof ProScorecardSchema>;
