import type { Season as SeasonDTO } from '$lib/schemas/season.schema';

/**
 * Season domain class.
 *
 * A season contains tournaments and has a year.
 * Only one season can be active at a time.
 */
export class Season {
	readonly id: string;
	readonly name: string;
	readonly year: number;
	readonly active: boolean;

	constructor(data: SeasonDTO) {
		this.id = data.id;
		this.name = data.name;
		this.year = data.year;
		this.active = data.active;
	}

	/**
	 * Get display name with year.
	 */
	get displayName(): string {
		return `${this.name} ${this.year}`;
	}

	/**
	 * Find the active season from a list.
	 */
	static findActive(seasons: Season[]): Season | undefined {
		return seasons.find((s) => s.active);
	}

	/**
	 * Sort seasons by year (newest first).
	 */
	static sortByYear(seasons: Season[]): Season[] {
		return [...seasons].sort((a, b) => b.year - a.year);
	}
}
