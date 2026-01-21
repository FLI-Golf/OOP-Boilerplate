import { BusinessRuleError } from '$lib/core/errors';
import type { FantasyTeam as FantasyTeamDTO, DraftPick } from '$lib/schemas/fantasy-team.schema';
import type { Pro } from '$lib/domain/Pro';

/**
 * FantasyTeam domain class.
 *
 * Represents a participant's roster of drafted pros.
 */
export class FantasyTeam {
	readonly id: string;
	readonly participantId: string;
	readonly leagueId: string;
	readonly name: string;
	readonly proIds: readonly string[];

	private _pros?: Pro[];

	constructor(data: FantasyTeamDTO, pros?: Pro[]) {
		this.id = data.id;
		this.participantId = data.participant_id;
		this.leagueId = data.league_id;
		this.name = data.name;
		this.proIds = data.pro_ids;
		this._pros = pros;
	}

	/**
	 * Get pros if loaded.
	 */
	get pros(): readonly Pro[] | undefined {
		return this._pros;
	}

	/**
	 * Number of pros on roster.
	 */
	get rosterSize(): number {
		return this.proIds.length;
	}

	/**
	 * Check if a pro is on this team.
	 */
	hasPro(proId: string): boolean {
		return this.proIds.includes(proId);
	}

	/**
	 * Count males on roster (requires pros to be loaded).
	 */
	get maleCount(): number {
		if (!this._pros) {
			throw new BusinessRuleError('Pros not loaded');
		}
		return this._pros.filter((p) => p.isMale).length;
	}

	/**
	 * Count females on roster (requires pros to be loaded).
	 */
	get femaleCount(): number {
		if (!this._pros) {
			throw new BusinessRuleError('Pros not loaded');
		}
		return this._pros.filter((p) => p.isFemale).length;
	}

	/**
	 * Check if roster meets composition requirements.
	 * Standard: 2 male + 2 female = 4 total
	 */
	isValidComposition(requiredMales: number = 2, requiredFemales: number = 2): boolean {
		if (!this._pros) {
			throw new BusinessRuleError('Pros not loaded');
		}
		return this.maleCount === requiredMales && this.femaleCount === requiredFemales;
	}
}

/**
 * Snake draft order calculator.
 */
export class SnakeDraftOrder {
	/**
	 * Calculate pick order for snake draft.
	 *
	 * Round 1: 1, 2, 3, 4, 5, 6
	 * Round 2: 6, 5, 4, 3, 2, 1
	 * Round 3: 1, 2, 3, 4, 5, 6
	 * etc.
	 */
	static getPickOrder(
		participantCount: number,
		totalRounds: number
	): Array<{ round: number; pick: number; position: number }> {
		const order: Array<{ round: number; pick: number; position: number }> = [];
		let overallPick = 1;

		for (let round = 1; round <= totalRounds; round++) {
			const isEvenRound = round % 2 === 0;

			for (let i = 0; i < participantCount; i++) {
				const position = isEvenRound ? participantCount - i : i + 1;

				order.push({
					round,
					pick: overallPick,
					position
				});

				overallPick++;
			}
		}

		return order;
	}

	/**
	 * Get the participant position for a specific pick.
	 */
	static getPositionForPick(
		pickNumber: number,
		participantCount: number
	): { round: number; positionInRound: number; draftPosition: number } {
		const round = Math.ceil(pickNumber / participantCount);
		const positionInRound = ((pickNumber - 1) % participantCount) + 1;
		const isEvenRound = round % 2 === 0;

		const draftPosition = isEvenRound
			? participantCount - positionInRound + 1
			: positionInRound;

		return { round, positionInRound, draftPosition };
	}

	/**
	 * Get next pick number for a participant.
	 */
	static getNextPickForPosition(
		draftPosition: number,
		participantCount: number,
		currentPick: number,
		totalRounds: number
	): number | null {
		const totalPicks = participantCount * totalRounds;

		for (let pick = currentPick; pick <= totalPicks; pick++) {
			const { draftPosition: pos } = SnakeDraftOrder.getPositionForPick(pick, participantCount);
			if (pos === draftPosition) {
				return pick;
			}
		}

		return null;
	}
}

/**
 * Draft filtering rules.
 */
export class DraftRules {
	/**
	 * Filter available pros based on roster composition and round.
	 *
	 * Rounds 1-2: All available pros
	 * Rounds 3-4: Filter by roster composition
	 *   - If 2 males already: only show females
	 *   - If 2 females already: only show males
	 *   - Otherwise: show all
	 */
	static filterAvailablePros(
		availablePros: Pro[],
		currentRoster: Pro[],
		roundNumber: number,
		maxMales: number = 2,
		maxFemales: number = 2
	): Pro[] {
		// Rounds 1-2: no filtering
		if (roundNumber <= 2) {
			return availablePros;
		}

		// Count current roster composition
		const maleCount = currentRoster.filter((p) => p.isMale).length;
		const femaleCount = currentRoster.filter((p) => p.isFemale).length;

		// If at max males, only show females
		if (maleCount >= maxMales) {
			return availablePros.filter((p) => p.isFemale);
		}

		// If at max females, only show males
		if (femaleCount >= maxFemales) {
			return availablePros.filter((p) => p.isMale);
		}

		// Otherwise show all
		return availablePros;
	}

	/**
	 * Validate a draft pick.
	 */
	static validatePick(
		proId: string,
		availablePros: Pro[],
		currentRoster: Pro[],
		roundNumber: number
	): string | null {
		// Check pro is available
		const pro = availablePros.find((p) => p.id === proId);
		if (!pro) {
			return 'Pro is not available';
		}

		// Check pro passes filter
		const filtered = DraftRules.filterAvailablePros(availablePros, currentRoster, roundNumber);
		if (!filtered.some((p) => p.id === proId)) {
			return 'Pro does not meet roster composition requirements';
		}

		return null;
	}
}

/**
 * Recommendation engine for draft picks.
 */
export class DraftRecommendation {
	/**
	 * Get recommended pick from available pros.
	 * Simple strategy: highest rated pro from filtered list.
	 */
	static getRecommendation(
		availablePros: Pro[],
		currentRoster: Pro[],
		roundNumber: number
	): Pro | null {
		const filtered = DraftRules.filterAvailablePros(availablePros, currentRoster, roundNumber);

		if (filtered.length === 0) {
			return null;
		}

		// Sort by rating (highest first)
		const sorted = [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

		return sorted[0];
	}
}
