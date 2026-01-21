import type {
	FantasyPoints as FantasyPointsDTO,
	ScoringRules,
	ParticipantPointsSummary,
	PointSource
} from '$lib/schemas/fantasy-points.schema';
import type { ProScorecard } from '$lib/schemas/score.schema';

/**
 * Default scoring rules.
 */
export const DEFAULT_SCORING_RULES: ScoringRules = {
	position_points: [100, 75, 60, 50, 45, 40, 35, 30, 25, 20, 15, 10],
	birdie_points: 3,
	eagle_points: 5,
	albatross_points: 10,
	bogey_points: -1,
	double_bogey_points: -2,
	hole_in_one_points: 25,
	round_leader_points: 5,
	team_bonus_points: 10
};

/**
 * Fantasy Points calculation domain logic.
 */
export class FantasyPointsCalculator {
	private rules: ScoringRules;

	constructor(rules: ScoringRules = DEFAULT_SCORING_RULES) {
		this.rules = rules;
	}

	/**
	 * Calculate points for a tournament finish position.
	 */
	calculatePositionPoints(position: number): number {
		if (position < 1) return 0;
		if (position > this.rules.position_points.length) {
			return 0; // No points outside defined positions
		}
		return this.rules.position_points[position - 1];
	}

	/**
	 * Calculate points for a single hole score.
	 */
	calculateHolePoints(throws: number, par: number): number {
		const diff = throws - par;

		if (throws === 1) {
			return this.rules.hole_in_one_points;
		}

		switch (diff) {
			case -3:
				return this.rules.albatross_points;
			case -2:
				return this.rules.eagle_points;
			case -1:
				return this.rules.birdie_points;
			case 0:
				return 0; // Par
			case 1:
				return this.rules.bogey_points;
			default:
				if (diff >= 2) {
					return this.rules.double_bogey_points;
				}
				return 0;
		}
	}

	/**
	 * Calculate points for a round scorecard.
	 */
	calculateRoundPoints(scorecard: ProScorecard): number {
		let points = 0;

		for (const entry of scorecard.entries) {
			points += this.calculateHolePoints(entry.throws, entry.par);
		}

		return points;
	}

	/**
	 * Calculate total points from a list of point entries.
	 */
	static sumPoints(entries: FantasyPointsDTO[]): number {
		return entries.reduce((sum, e) => sum + e.points, 0);
	}

	/**
	 * Group points by source.
	 */
	static groupBySource(
		entries: FantasyPointsDTO[]
	): Record<PointSource, number> {
		const grouped: Record<string, number> = {
			tournament_finish: 0,
			round_score: 0,
			bonus: 0,
			penalty: 0,
			adjustment: 0
		};

		for (const entry of entries) {
			grouped[entry.source] += entry.points;
		}

		return grouped as Record<PointSource, number>;
	}

	/**
	 * Group points by pro.
	 */
	static groupByPro(entries: FantasyPointsDTO[]): Map<string, number> {
		const grouped = new Map<string, number>();

		for (const entry of entries) {
			const current = grouped.get(entry.pro_id) ?? 0;
			grouped.set(entry.pro_id, current + entry.points);
		}

		return grouped;
	}

	/**
	 * Build participant points summary.
	 */
	static buildSummary(
		participantId: string,
		entries: FantasyPointsDTO[]
	): ParticipantPointsSummary {
		const bySource = FantasyPointsCalculator.groupBySource(entries);
		const byPro = FantasyPointsCalculator.groupByPro(entries);

		return {
			participant_id: participantId,
			total_points: FantasyPointsCalculator.sumPoints(entries),
			tournament_points: bySource.tournament_finish,
			round_points: bySource.round_score,
			bonus_points: bySource.bonus,
			penalty_points: bySource.penalty,
			points_by_pro: Array.from(byPro.entries()).map(([pro_id, points]) => ({
				pro_id,
				points
			}))
		};
	}

	/**
	 * Calculate rankings from summaries.
	 */
	static calculateRankings(
		summaries: ParticipantPointsSummary[]
	): Array<{ participantId: string; points: number; rank: number }> {
		// Sort by points (highest first)
		const sorted = [...summaries].sort((a, b) => b.total_points - a.total_points);

		const rankings: Array<{ participantId: string; points: number; rank: number }> = [];
		let currentRank = 1;
		let previousPoints: number | null = null;
		let tied = 0;

		for (const summary of sorted) {
			if (previousPoints !== null && summary.total_points === previousPoints) {
				tied++;
			} else {
				currentRank += tied;
				tied = 1;
			}

			rankings.push({
				participantId: summary.participant_id,
				points: summary.total_points,
				rank: currentRank
			});

			previousPoints = summary.total_points;
		}

		return rankings;
	}
}
