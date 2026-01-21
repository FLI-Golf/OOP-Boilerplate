import { InvalidStateError, BusinessRuleError } from '$lib/core/errors';
import type {
	Tournament as TournamentDTO,
	TournamentStatus,
	TournamentRound as RoundDTO
} from '$lib/schemas/tournament.schema';

/**
 * Valid state transitions for tournament status.
 */
const VALID_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
	scheduled: ['live'],
	live: ['final'],
	final: []
};

/**
 * Tournament domain class.
 *
 * State machine: scheduled -> live -> final
 * Owns rounds, groups, and scoring state.
 */
export class Tournament {
	readonly id: string;
	readonly name: string;
	readonly seasonId: string;
	readonly courseId: string;
	readonly totalRounds: number;
	private _status: TournamentStatus;
	private _currentRound: number;
	private _rounds: RoundDTO[];

	constructor(data: TournamentDTO, rounds: RoundDTO[] = []) {
		this.id = data.id;
		this.name = data.name;
		this.seasonId = data.season_id;
		this.courseId = data.course_id;
		this.totalRounds = data.total_rounds;
		this._status = data.status;
		this._currentRound = data.current_round;
		this._rounds = rounds;
	}

	get status(): TournamentStatus {
		return this._status;
	}

	get currentRound(): number {
		return this._currentRound;
	}

	get rounds(): readonly RoundDTO[] {
		return [...this._rounds].sort((a, b) => a.round_number - b.round_number);
	}

	/**
	 * Check if tournament is in scheduled state.
	 */
	get isScheduled(): boolean {
		return this._status === 'scheduled';
	}

	/**
	 * Check if tournament is live.
	 */
	get isLive(): boolean {
		return this._status === 'live';
	}

	/**
	 * Check if tournament is finalized.
	 */
	get isFinal(): boolean {
		return this._status === 'final';
	}

	/**
	 * Check if a status transition is valid.
	 */
	canTransitionTo(newStatus: TournamentStatus): boolean {
		return VALID_TRANSITIONS[this._status].includes(newStatus);
	}

	/**
	 * Validate transition to a new status.
	 * Returns error message or null if valid.
	 */
	validateTransition(newStatus: TournamentStatus): string | null {
		if (!this.canTransitionTo(newStatus)) {
			return `Cannot transition from "${this._status}" to "${newStatus}"`;
		}
		return null;
	}

	/**
	 * Check if scoring is allowed.
	 */
	canSubmitScores(): boolean {
		return this._status === 'live';
	}

	/**
	 * Validate that scoring can be submitted.
	 */
	assertCanSubmitScores(): void {
		if (!this.canSubmitScores()) {
			throw new InvalidStateError(
				`Cannot submit scores: tournament is "${this._status}", must be "live"`
			);
		}
	}

	/**
	 * Check if all rounds are complete.
	 */
	get allRoundsComplete(): boolean {
		if (this._rounds.length !== this.totalRounds) {
			return false;
		}
		return this._rounds.every((r) => r.status === 'complete');
	}

	/**
	 * Validate that tournament can be finalized.
	 */
	validateFinalization(): string | null {
		if (this._status !== 'live') {
			return 'Tournament must be live to finalize';
		}
		if (!this.allRoundsComplete) {
			return 'All rounds must be complete before finalizing';
		}
		return null;
	}

	/**
	 * Get the current active round.
	 */
	getCurrentRound(): RoundDTO | undefined {
		return this._rounds.find((r) => r.round_number === this._currentRound);
	}

	/**
	 * Check if a round number is valid.
	 */
	isValidRoundNumber(roundNumber: number): boolean {
		return roundNumber >= 1 && roundNumber <= this.totalRounds;
	}

	/**
	 * Validate round creation.
	 */
	validateRoundCreation(roundNumber: number): string | null {
		if (!this.isValidRoundNumber(roundNumber)) {
			return `Round number must be between 1 and ${this.totalRounds}`;
		}
		if (this._rounds.some((r) => r.round_number === roundNumber)) {
			return `Round ${roundNumber} already exists`;
		}
		return null;
	}
}
