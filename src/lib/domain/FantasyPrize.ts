import type {
	FantasyPrize as FantasyPrizeDTO,
	PayoutStructure,
	PrizeType
} from '$lib/schemas/fantasy-prize.schema';
import { PAYOUT_STRUCTURES } from '$lib/schemas/fantasy-prize.schema';

/**
 * FantasyPrize domain class.
 */
export class FantasyPrize {
	readonly id: string;
	readonly leagueId: string;
	readonly name: string;
	readonly type: PrizeType;
	readonly amount: number;
	readonly percentageOfPool: number | undefined;
	readonly position: number | undefined;
	readonly participantId: string | undefined;
	readonly status: 'pending' | 'awarded' | 'paid';
	readonly awardedAt: string | undefined;
	readonly paidAt: string | undefined;

	constructor(data: FantasyPrizeDTO) {
		this.id = data.id;
		this.leagueId = data.league_id;
		this.name = data.name;
		this.type = data.type;
		this.amount = data.amount;
		this.percentageOfPool = data.percentage_of_pool;
		this.position = data.position;
		this.participantId = data.participant_id;
		this.status = data.status;
		this.awardedAt = data.awarded_at;
		this.paidAt = data.paid_at;
	}

	/**
	 * Check if prize is pending.
	 */
	get isPending(): boolean {
		return this.status === 'pending';
	}

	/**
	 * Check if prize has been awarded.
	 */
	get isAwarded(): boolean {
		return this.status === 'awarded' || this.status === 'paid';
	}

	/**
	 * Check if prize has been paid.
	 */
	get isPaid(): boolean {
		return this.status === 'paid';
	}

	/**
	 * Calculate actual amount from percentage of pool.
	 */
	calculateAmount(prizePool: number): number {
		if (this.percentageOfPool !== undefined) {
			return Math.round((prizePool * this.percentageOfPool) / 100);
		}
		return this.amount;
	}
}

/**
 * Prize distribution calculator.
 */
export class PrizeDistribution {
	/**
	 * Get a payout structure by name.
	 */
	static getStructure(name: string): PayoutStructure | undefined {
		return PAYOUT_STRUCTURES.find((s) => s.name === name);
	}

	/**
	 * Calculate prize amounts from a structure and pool.
	 */
	static calculatePayouts(
		structure: PayoutStructure,
		prizePool: number
	): Array<{ position: number; amount: number }> {
		return structure.payouts.map((p) => ({
			position: p.position,
			amount: Math.round((prizePool * p.percentage) / 100)
		}));
	}

	/**
	 * Generate prize definitions from a payout structure.
	 */
	static generatePrizeDefinitions(
		structure: PayoutStructure,
		prizePool: number
	): Array<{
		name: string;
		type: PrizeType;
		amount: number;
		position: number;
	}> {
		const payouts = PrizeDistribution.calculatePayouts(structure, prizePool);

		return payouts.map((p) => {
			let type: PrizeType = 'custom';
			let name = `${p.position}${getOrdinalSuffix(p.position)} Place`;

			if (p.position === 1) {
				type = 'season_winner';
				name = 'Season Champion';
			} else if (p.position === 2) {
				type = 'season_runnerup';
				name = 'Runner Up';
			} else if (p.position === 3) {
				type = 'season_third';
				name = 'Third Place';
			}

			return {
				name,
				type,
				amount: p.amount,
				position: p.position
			};
		});
	}

	/**
	 * Validate that total percentages equal 100.
	 */
	static validateStructure(structure: PayoutStructure): string | null {
		const total = structure.payouts.reduce((sum, p) => sum + p.percentage, 0);
		if (total !== 100) {
			return `Payout percentages must total 100%, got ${total}%`;
		}
		return null;
	}

	/**
	 * Calculate total prizes awarded.
	 */
	static sumPrizes(prizes: FantasyPrize[]): number {
		return prizes.reduce((sum, p) => sum + p.amount, 0);
	}

	/**
	 * Get prizes by status.
	 */
	static filterByStatus(
		prizes: FantasyPrize[],
		status: 'pending' | 'awarded' | 'paid'
	): FantasyPrize[] {
		return prizes.filter((p) => p.status === status);
	}
}

/**
 * Helper: Get ordinal suffix for a number.
 */
function getOrdinalSuffix(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return s[(v - 20) % 10] || s[v] || s[0];
}
