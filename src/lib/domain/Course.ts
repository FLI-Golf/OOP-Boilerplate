import { BusinessRuleError } from '$lib/core/errors';
import type { Course as CourseDTO, Hole as HoleDTO, HoleCreate } from '$lib/schemas/course.schema';

/**
 * Course domain class.
 *
 * This class contains business logic and validation rules.
 * It does NOT know about PocketBase or any persistence layer.
 */
export class Course {
	readonly id: string;
	readonly name: string;
	readonly location: string | undefined;
	readonly holeCount: number;
	private _holes: HoleDTO[];

	constructor(data: CourseDTO, holes: HoleDTO[] = []) {
		this.id = data.id;
		this.name = data.name;
		this.location = data.location;
		this.holeCount = data.hole_count;
		this._holes = holes;
	}

	/**
	 * Get all holes, sorted by number.
	 */
	get holes(): readonly HoleDTO[] {
		return [...this._holes].sort((a, b) => a.number - b.number);
	}

	/**
	 * Check if course has all holes defined.
	 */
	get isComplete(): boolean {
		return this._holes.length === this.holeCount;
	}

	/**
	 * Get total par for the course.
	 */
	get totalPar(): number {
		return this._holes.reduce((sum, hole) => sum + hole.par, 0);
	}

	/**
	 * Get par for a specific hole.
	 * Throws if hole doesn't exist.
	 */
	getHolePar(holeNumber: number): number {
		const hole = this._holes.find((h) => h.number === holeNumber);
		if (!hole) {
			throw new BusinessRuleError(`Hole ${holeNumber} does not exist on course ${this.name}`);
		}
		return hole.par;
	}

	/**
	 * Validate that a hole number exists on this course.
	 */
	hasHole(holeNumber: number): boolean {
		return this._holes.some((h) => h.number === holeNumber);
	}

	/**
	 * Validate hole data before creation.
	 * Returns error message or null if valid.
	 */
	static validateNewHole(holeCount: number, existingHoles: HoleDTO[], newHole: HoleCreate): string | null {
		if (newHole.number < 1 || newHole.number > holeCount) {
			return `Hole number must be between 1 and ${holeCount}`;
		}

		if (existingHoles.some((h) => h.number === newHole.number)) {
			return `Hole ${newHole.number} already exists`;
		}

		if (newHole.par < 2 || newHole.par > 6) {
			return 'Par must be between 2 and 6';
		}

		return null;
	}

	/**
	 * Generate default holes for a course (all par 3).
	 * Useful for quick setup of a par-3 course.
	 */
	static generateDefaultHoles(holeCount: number, defaultPar: number = 3): HoleCreate[] {
		const holes: HoleCreate[] = [];
		for (let i = 1; i <= holeCount; i++) {
			holes.push({ number: i, par: defaultPar });
		}
		return holes;
	}
}
