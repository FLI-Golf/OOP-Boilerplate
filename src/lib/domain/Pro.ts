import type { Pro as ProDTO, Gender } from '$lib/schemas/pro.schema';

/**
 * Pro domain class.
 *
 * Represents a professional player in the league.
 * Gender is immutable after creation.
 */
export class Pro {
	readonly id: string;
	readonly name: string;
	readonly gender: Gender;
	readonly rating: number | undefined;
	readonly active: boolean;

	constructor(data: ProDTO) {
		this.id = data.id;
		this.name = data.name;
		this.gender = data.gender;
		this.rating = data.rating;
		this.active = data.active;
	}

	/**
	 * Check if pro is male.
	 */
	get isMale(): boolean {
		return this.gender === 'male';
	}

	/**
	 * Check if pro is female.
	 */
	get isFemale(): boolean {
		return this.gender === 'female';
	}

	/**
	 * Get display name with rating.
	 */
	get displayName(): string {
		if (this.rating !== undefined) {
			return `${this.name} (${this.rating})`;
		}
		return this.name;
	}

	/**
	 * Filter a list of pros by gender.
	 */
	static filterByGender(pros: Pro[], gender: Gender): Pro[] {
		return pros.filter((p) => p.gender === gender);
	}

	/**
	 * Filter to only active pros.
	 */
	static filterActive(pros: Pro[]): Pro[] {
		return pros.filter((p) => p.active);
	}

	/**
	 * Sort pros by rating (highest first).
	 */
	static sortByRating(pros: Pro[]): Pro[] {
		return [...pros].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
	}
}
