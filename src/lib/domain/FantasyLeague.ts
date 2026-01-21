import { InvalidStateError, BusinessRuleError } from '$lib/core/errors';
import type {
	FantasyLeague as FantasyLeagueDTO,
	FantasyLeagueStatus,
	FantasyParticipant as ParticipantDTO
} from '$lib/schemas/fantasy-league.schema';

/**
 * Valid state transitions for fantasy league status.
 */
const VALID_TRANSITIONS: Record<FantasyLeagueStatus, FantasyLeagueStatus[]> = {
	setup: ['drafting'],
	drafting: ['active'],
	active: ['complete'],
	complete: []
};

/**
 * FantasyLeague domain class.
 *
 * State machine: setup -> drafting -> active -> complete
 * Owns participants, draft, and rosters.
 */
export class FantasyLeague {
	readonly id: string;
	readonly name: string;
	readonly seasonId: string;
	readonly commissionerId: string;
	readonly maxParticipants: number;
	readonly draftRounds: number;
	readonly entryFee: number;
	readonly prizePool: number;
	readonly draftStartTime: string | undefined;
	private _status: FantasyLeagueStatus;
	private _participants: ParticipantDTO[];

	constructor(data: FantasyLeagueDTO, participants: ParticipantDTO[] = []) {
		this.id = data.id;
		this.name = data.name;
		this.seasonId = data.season_id;
		this.commissionerId = data.commissioner_id;
		this.maxParticipants = data.max_participants;
		this.draftRounds = data.draft_rounds;
		this.entryFee = data.entry_fee;
		this.prizePool = data.prize_pool;
		this.draftStartTime = data.draft_start_time;
		this._status = data.status;
		this._participants = participants;
	}

	get status(): FantasyLeagueStatus {
		return this._status;
	}

	get participants(): readonly ParticipantDTO[] {
		return [...this._participants];
	}

	get participantCount(): number {
		return this._participants.length;
	}

	/**
	 * Check if league is in setup phase.
	 */
	get isSetup(): boolean {
		return this._status === 'setup';
	}

	/**
	 * Check if league is drafting.
	 */
	get isDrafting(): boolean {
		return this._status === 'drafting';
	}

	/**
	 * Check if league is active (post-draft, season in progress).
	 */
	get isActive(): boolean {
		return this._status === 'active';
	}

	/**
	 * Check if league is complete.
	 */
	get isComplete(): boolean {
		return this._status === 'complete';
	}

	/**
	 * Check if league is full.
	 */
	get isFull(): boolean {
		return this._participants.length >= this.maxParticipants;
	}

	/**
	 * Check if league can accept new participants.
	 */
	get canJoin(): boolean {
		return this._status === 'setup' && !this.isFull;
	}

	/**
	 * Check if a status transition is valid.
	 */
	canTransitionTo(newStatus: FantasyLeagueStatus): boolean {
		return VALID_TRANSITIONS[this._status].includes(newStatus);
	}

	/**
	 * Validate transition to a new status.
	 */
	validateTransition(newStatus: FantasyLeagueStatus): string | null {
		if (!this.canTransitionTo(newStatus)) {
			return `Cannot transition from "${this._status}" to "${newStatus}"`;
		}
		return null;
	}

	/**
	 * Validate that draft can start.
	 */
	validateDraftStart(): string | null {
		if (this._status !== 'setup') {
			return 'League must be in setup to start draft';
		}
		if (this._participants.length < 2) {
			return 'Need at least 2 participants to start draft';
		}
		return null;
	}

	/**
	 * Check if a user is the commissioner.
	 */
	isCommissioner(userId: string): boolean {
		return this.commissionerId === userId;
	}

	/**
	 * Check if a user is a participant.
	 */
	isParticipant(userId: string): boolean {
		return this._participants.some((p) => p.user_id === userId);
	}

	/**
	 * Get a participant by user ID.
	 */
	getParticipant(userId: string): ParticipantDTO | undefined {
		return this._participants.find((p) => p.user_id === userId);
	}

	/**
	 * Get participants sorted by rank.
	 */
	getStandings(): ParticipantDTO[] {
		return [...this._participants].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
	}

	/**
	 * Calculate total prize pool from entry fees.
	 */
	calculatePrizePool(): number {
		return this._participants.filter((p) => p.paid).length * this.entryFee;
	}
}
