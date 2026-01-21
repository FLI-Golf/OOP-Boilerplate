import { pb } from '$lib/data/pb/pb.client';
import {
	HoleScoreEventSchema,
	type HoleScoreEvent,
	type HoleScoreEventCreate
} from '$lib/schemas/score.schema';

/**
 * Repository for HoleScoreEvent persistence.
 * Events are append-only (no updates or deletes in normal operation).
 */
export const ScoreEventRepo = {
	/**
	 * Get all score events for a round.
	 */
	async getByRoundId(roundId: string): Promise<HoleScoreEvent[]> {
		const records = await pb.collection('score_events').getFullList({
			filter: `round_id = "${roundId}"`,
			sort: 'entered_at'
		});
		return records.map((r) => HoleScoreEventSchema.parse(r));
	},

	/**
	 * Get all score events for a group.
	 */
	async getByGroupId(groupId: string): Promise<HoleScoreEvent[]> {
		const records = await pb.collection('score_events').getFullList({
			filter: `group_id = "${groupId}"`,
			sort: 'entered_at'
		});
		return records.map((r) => HoleScoreEventSchema.parse(r));
	},

	/**
	 * Get score events for a specific pro in a round.
	 */
	async getByProAndRound(proId: string, roundId: string): Promise<HoleScoreEvent[]> {
		const records = await pb.collection('score_events').getFullList({
			filter: `pro_id = "${proId}" && round_id = "${roundId}"`,
			sort: 'entered_at'
		});
		return records.map((r) => HoleScoreEventSchema.parse(r));
	},

	/**
	 * Get all score events for a tournament.
	 */
	async getByTournamentId(tournamentId: string): Promise<HoleScoreEvent[]> {
		const records = await pb.collection('score_events').getFullList({
			filter: `tournament_id = "${tournamentId}"`,
			sort: 'entered_at'
		});
		return records.map((r) => HoleScoreEventSchema.parse(r));
	},

	/**
	 * Create a score event.
	 */
	async create(data: HoleScoreEventCreate): Promise<HoleScoreEvent> {
		const record = await pb.collection('score_events').create({
			...data,
			entered_at: new Date().toISOString()
		});
		return HoleScoreEventSchema.parse(record);
	},

	/**
	 * Create multiple score events (batch).
	 */
	async createMany(events: HoleScoreEventCreate[]): Promise<HoleScoreEvent[]> {
		const created: HoleScoreEvent[] = [];
		const now = new Date().toISOString();
		for (const event of events) {
			const record = await pb.collection('score_events').create({
				...event,
				entered_at: now
			});
			created.push(HoleScoreEventSchema.parse(record));
		}
		return created;
	}
};
