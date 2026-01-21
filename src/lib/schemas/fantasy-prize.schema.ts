import { z } from 'zod';

/**
 * Prize type enum.
 */
export const PrizeTypeEnum = z.enum([
	'season_winner', // Overall season winner
	'season_runnerup', // 2nd place
	'season_third', // 3rd place
	'tournament_winner', // Single tournament winner
	'weekly_high', // Highest weekly score
	'most_improved', // Most improved over season
	'custom' // Custom prize
]);
export type PrizeType = z.infer<typeof PrizeTypeEnum>;

/**
 * Prize status enum.
 */
export const PrizeStatusEnum = z.enum(['pending', 'awarded', 'paid']);
export type PrizeStatus = z.infer<typeof PrizeStatusEnum>;

/**
 * Schema for a Fantasy Prize.
 */
export const FantasyPrizeSchema = z.object({
	id: z.string(),
	league_id: z.string(),
	name: z.string().min(1, 'Prize name is required'),
	type: PrizeTypeEnum,
	amount: z.number().min(0),
	percentage_of_pool: z.number().min(0).max(100).optional(), // Alternative to fixed amount
	position: z.number().int().min(1).optional(), // For position-based prizes
	participant_id: z.string().optional(), // Winner (set when awarded)
	status: PrizeStatusEnum.default('pending'),
	awarded_at: z.string().datetime().optional(),
	paid_at: z.string().datetime().optional(),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type FantasyPrize = z.infer<typeof FantasyPrizeSchema>;

/**
 * Schema for creating a Fantasy Prize.
 */
export const FantasyPrizeCreateSchema = FantasyPrizeSchema.omit({
	id: true,
	created: true,
	updated: true,
	status: true,
	participant_id: true,
	awarded_at: true,
	paid_at: true
});
export type FantasyPrizeCreate = z.infer<typeof FantasyPrizeCreateSchema>;

/**
 * Schema for updating a Fantasy Prize.
 */
export const FantasyPrizeUpdateSchema = z.object({
	name: z.string().min(1).optional(),
	amount: z.number().min(0).optional(),
	percentage_of_pool: z.number().min(0).max(100).optional()
});
export type FantasyPrizeUpdate = z.infer<typeof FantasyPrizeUpdateSchema>;

/**
 * Prize payout structure (common configurations).
 */
export const PayoutStructureSchema = z.object({
	name: z.string(),
	payouts: z.array(
		z.object({
			position: z.number().int().min(1),
			percentage: z.number().min(0).max(100)
		})
	)
});

export type PayoutStructure = z.infer<typeof PayoutStructureSchema>;

/**
 * Common payout structures.
 */
export const PAYOUT_STRUCTURES: PayoutStructure[] = [
	{
		name: 'Winner Take All',
		payouts: [{ position: 1, percentage: 100 }]
	},
	{
		name: 'Top 2 (70/30)',
		payouts: [
			{ position: 1, percentage: 70 },
			{ position: 2, percentage: 30 }
		]
	},
	{
		name: 'Top 3 (60/25/15)',
		payouts: [
			{ position: 1, percentage: 60 },
			{ position: 2, percentage: 25 },
			{ position: 3, percentage: 15 }
		]
	},
	{
		name: 'Top 4 (50/25/15/10)',
		payouts: [
			{ position: 1, percentage: 50 },
			{ position: 2, percentage: 25 },
			{ position: 3, percentage: 15 },
			{ position: 4, percentage: 10 }
		]
	}
];
