import { ValidationError } from '$lib/core/errors';
import type { HoleScoreEvent, ProScorecard, ScorecardEntry } from '$lib/schemas/score.schema';
import type { Hole } from '$lib/schemas/course.schema';

/**
 * Scoring domain logic.
 *
 * Handles validation and computation of scores.
 * Score events are append-only; scorecards are derived.
 */
export class Scoring {
	/**
	 * Validate a score submission.
	 */
	static validateScoreSubmission(
		holeNumber: number,
		throws: number,
		courseHoles: Hole[],
		groupProIds: string[],
		proId: string
	): string | null {
		// Check hole exists
		const hole = courseHoles.find((h) => h.number === holeNumber);
		if (!hole) {
			return `Hole ${holeNumber} does not exist on this course`;
		}

		// Check throws is reasonable
		if (throws < 1) {
			return 'Throws must be at least 1';
		}
		if (throws > 15) {
			return 'Throws cannot exceed 15';
		}

		// Check pro is in the group
		if (!groupProIds.includes(proId)) {
			return 'Pro is not in this group';
		}

		return null;
	}

	/**
	 * Build a scorecard from score events.
	 */
	static buildScorecard(
		proId: string,
		roundId: string,
		events: HoleScoreEvent[],
		courseHoles: Hole[]
	): ProScorecard {
		// Filter events for this pro and round
		const proEvents = events.filter((e) => e.pro_id === proId && e.round_id === roundId);

		// Get latest score per hole (in case of corrections)
		const latestByHole = new Map<number, HoleScoreEvent>();
		for (const event of proEvents) {
			const existing = latestByHole.get(event.hole_number);
			if (!existing || event.entered_at > existing.entered_at) {
				latestByHole.set(event.hole_number, event);
			}
		}

		// Build entries
		const entries: ScorecardEntry[] = [];
		let totalThrows = 0;
		let totalPar = 0;

		for (const hole of courseHoles) {
			const event = latestByHole.get(hole.number);
			if (event) {
				const entry: ScorecardEntry = {
					pro_id: proId,
					hole_number: hole.number,
					throws: event.throws,
					par: hole.par,
					score_to_par: event.throws - hole.par
				};
				entries.push(entry);
				totalThrows += event.throws;
				totalPar += hole.par;
			}
		}

		return {
			pro_id: proId,
			round_id: roundId,
			entries: entries.sort((a, b) => a.hole_number - b.hole_number),
			total_throws: totalThrows,
			total_par: totalPar,
			score_to_par: totalThrows - totalPar
		};
	}

	/**
	 * Calculate leaderboard position from scorecards.
	 */
	static calculateLeaderboard(
		scorecards: ProScorecard[]
	): Array<{ proId: string; scoreToPar: number; position: number }> {
		// Sort by score to par (lowest first)
		const sorted = [...scorecards].sort((a, b) => a.score_to_par - b.score_to_par);

		const leaderboard: Array<{ proId: string; scoreToPar: number; position: number }> = [];
		let currentPosition = 1;
		let previousScore: number | null = null;
		let tied = 0;

		for (const card of sorted) {
			if (previousScore !== null && card.score_to_par === previousScore) {
				tied++;
			} else {
				currentPosition += tied;
				tied = 1;
			}

			leaderboard.push({
				proId: card.pro_id,
				scoreToPar: card.score_to_par,
				position: currentPosition
			});

			previousScore = card.score_to_par;
		}

		return leaderboard;
	}

	/**
	 * Format score to par for display.
	 */
	static formatScoreToPar(scoreToPar: number): string {
		if (scoreToPar === 0) return 'E';
		if (scoreToPar > 0) return `+${scoreToPar}`;
		return scoreToPar.toString();
	}
}
