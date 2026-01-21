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
	pending_players: ['ready'],
	ready: ['drafting'],
	drafting: ['active'],
	active: ['complete'],
	complete: []
};

/**
 * FantasyLeague domain class.
 *
 * Workflow:
 * 1. Owner purchases/creates league (status: pending_players)
 * 2. Users request to join, owner approves
 * 3. When full (6/6), status -> ready
 * 4. Owner configures settings, starts draft (status: drafting)
 * 5. Draft completes, status -> active
 * 6. Season ends, status -> complete
 */
export class FantasyLeague {
	readonly id: string;
	readonly name: string;
	readonly seasonId: string;
	readonly ownerId: string;
	readonly maxParticipants: number;
	readonly currentParticipants: number;
	readonly draftRounds: number;
	readonly secondsPerPick: number;
	readonly entryFee: number;
	readonly prizePool: number;
	readonly draftStartTime: string | undefined;
	readonly autoPickEnabled: boolean;
	private _status: FantasyLeagueStatus;
	private _participants: ParticipantDTO[];

	constructor(data: FantasyLeagueDTO, participants: ParticipantDTO[] = []) {
		this.id = data.id;
		this.name = data.name;
		this.seasonId = data.season_id;
		this.ownerId = data.owner_id;
		this.maxParticipants = data.max_participants;
		this.currentParticipants = data.current_participants;
		this.draftRounds = data.draft_rounds;
		this.secondsPerPick = data.seconds_per_pick;
		this.entryFee = data.entry_fee;
		this.prizePool = data.prize_pool;
		this.draftStartTime = data.draft_start_time;
		this.autoPickEnabled = data.auto_pick_enabled;
		this._status = data.status;
		this._participants = participants;
	}

	get status(): FantasyLeagueStatus {
		return this._status;
	}

	get participants(): readonly ParticipantDTO[] {
		return [...this._participants];
	}

	get spotsRemaining(): number {
		return this.maxParticipants - this.currentParticipants;
	}

	get isFull(): boolean {
		return this.currentParticipants >= this.maxParticipants;
	}

	get isPendingPlayers(): boolean {
		return this._status === 'pending_players';
	}

	get isReady(): boolean {
		return this._status === 'ready';
	}

	get isDrafting(): boolean {
		return this._status === 'drafting';
	}

	get isActive(): boolean {
		return this._status === 'active';
	}

	get isComplete(): boolean {
		return this._status === 'complete';
	}

	/**
	 * Check if user is the owner.
	 */
	isOwner(userId: string): boolean {
		return this.ownerId === userId;
	}

	/**
	 * Check if user is a participant.
	 */
	isParticipant(userId: string): boolean {
		return this._participants.some((p) => p.user_id === userId);
	}

	/**
	 * Check if league can accept join requests.
	 */
	get canAcceptJoinRequests(): boolean {
		return this._status === 'pending_players' && !this.isFull;
	}

	/**
	 * Check if a status transition is valid.
	 */
	canTransitionTo(newStatus: FantasyLeagueStatus): boolean {
		return VALID_TRANSITIONS[this._status].includes(newStatus);
	}

	/**
	 * Validate that league can transition to ready.
	 * Happens automatically when league fills.
	 */
	validateReadyTransition(): string | null {
		if (this._status !== 'pending_players') {
			return 'League must be pending players';
		}
		if (!this.isFull) {
			return `League needs ${this.spotsRemaining} more participants`;
		}
		return null;
	}

	/**
	 * Validate that draft can start.
	 */
	validateDraftStart(): string | null {
		if (this._status !== 'ready') {
			return 'League must be ready to start draft';
		}
		return null;
	}

	/**
	 * Get participants sorted by draft position.
	 */
	getDraftOrder(): ParticipantDTO[] {
		return [...this._participants].sort(
			(a, b) => (a.draft_position ?? 999) - (b.draft_position ?? 999)
		);
	}

	/**
	 * Get participants sorted by rank/points.
	 */
	getStandings(): ParticipantDTO[] {
		return [...this._participants].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
	}

	/**
	 * Calculate prize pool from paid participants.
	 */
	calculatePrizePool(): number {
		return this._participants.filter((p) => p.paid).length * this.entryFee;
	}
}

/**
 * Shuffle array using Fisher-Yates algorithm.
 */
export function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}
