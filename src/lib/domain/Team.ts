import { BusinessRuleError } from '$lib/core/errors';
import type { Team as TeamDTO } from '$lib/schemas/team.schema';
import type { Pro } from '$lib/domain/Pro';

/**
 * Team domain class.
 *
 * A team MUST have exactly 1 male pro + 1 female pro.
 * This invariant is enforced at creation time via usecase.
 */
export class Team {
	readonly id: string;
	readonly name: string;
	readonly tournamentId: string;
	readonly maleProId: string;
	readonly femaleProId: string;

	// Optionally loaded pro details
	private _malePro?: Pro;
	private _femalePro?: Pro;

	constructor(data: TeamDTO, malePro?: Pro, femalePro?: Pro) {
		this.id = data.id;
		this.name = data.name;
		this.tournamentId = data.tournament_id;
		this.maleProId = data.male_pro_id;
		this.femaleProId = data.female_pro_id;
		this._malePro = malePro;
		this._femalePro = femalePro;
	}

	/**
	 * Get male pro if loaded.
	 */
	get malePro(): Pro | undefined {
		return this._malePro;
	}

	/**
	 * Get female pro if loaded.
	 */
	get femalePro(): Pro | undefined {
		return this._femalePro;
	}

	/**
	 * Get both pro IDs as array.
	 */
	get proIds(): [string, string] {
		return [this.maleProId, this.femaleProId];
	}

	/**
	 * Check if a pro is on this team.
	 */
	hasPro(proId: string): boolean {
		return this.maleProId === proId || this.femaleProId === proId;
	}

	/**
	 * Validate team composition.
	 * Returns error message or null if valid.
	 */
	static validateComposition(malePro: Pro, femalePro: Pro): string | null {
		if (!malePro.isMale) {
			return `Pro "${malePro.name}" must be male for male_pro position`;
		}
		if (!femalePro.isFemale) {
			return `Pro "${femalePro.name}" must be female for female_pro position`;
		}
		if (!malePro.active) {
			return `Pro "${malePro.name}" is not active`;
		}
		if (!femalePro.active) {
			return `Pro "${femalePro.name}" is not active`;
		}
		return null;
	}

	/**
	 * Check if a pro is already on any team in a list.
	 */
	static isProOnAnyTeam(proId: string, teams: Team[]): boolean {
		return teams.some((t) => t.hasPro(proId));
	}

	/**
	 * Validate that pros are not already on another team in the tournament.
	 */
	static validateProAvailability(
		maleProId: string,
		femaleProId: string,
		existingTeams: Team[]
	): string | null {
		if (Team.isProOnAnyTeam(maleProId, existingTeams)) {
			return 'Male pro is already on another team in this tournament';
		}
		if (Team.isProOnAnyTeam(femaleProId, existingTeams)) {
			return 'Female pro is already on another team in this tournament';
		}
		return null;
	}
}
