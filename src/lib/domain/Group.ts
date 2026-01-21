import { BusinessRuleError } from '$lib/core/errors';
import type { Group as GroupDTO } from '$lib/schemas/group.schema';
import type { Team } from '$lib/domain/Team';

/**
 * Group domain class.
 *
 * A group is a pairing of teams for a specific round.
 * Contains 1-4 teams and optionally has an assigned scorekeeper.
 */
export class Group {
	readonly id: string;
	readonly tournamentId: string;
	readonly roundId: string;
	readonly name: string;
	readonly teamIds: readonly string[];
	readonly scorekeeperId: string | undefined;
	readonly teeTime: string | undefined;

	private _teams?: Team[];

	constructor(data: GroupDTO, teams?: Team[]) {
		this.id = data.id;
		this.tournamentId = data.tournament_id;
		this.roundId = data.round_id;
		this.name = data.name;
		this.teamIds = data.team_ids;
		this.scorekeeperId = data.scorekeeper_id;
		this.teeTime = data.tee_time;
		this._teams = teams;
	}

	/**
	 * Get teams if loaded.
	 */
	get teams(): readonly Team[] | undefined {
		return this._teams;
	}

	/**
	 * Number of teams in this group.
	 */
	get teamCount(): number {
		return this.teamIds.length;
	}

	/**
	 * Check if a team is in this group.
	 */
	hasTeam(teamId: string): boolean {
		return this.teamIds.includes(teamId);
	}

	/**
	 * Check if group has a scorekeeper assigned.
	 */
	get hasScorekeeper(): boolean {
		return this.scorekeeperId !== undefined;
	}

	/**
	 * Check if a user is the scorekeeper for this group.
	 */
	isScorekeeper(userId: string): boolean {
		return this.scorekeeperId === userId;
	}

	/**
	 * Validate group creation.
	 */
	static validateCreation(
		teamIds: string[],
		allTeamsInRound: Group[],
		availableTeamIds: string[]
	): string | null {
		if (teamIds.length < 1 || teamIds.length > 4) {
			return 'Group must have 1-4 teams';
		}

		// Check for duplicates
		const uniqueIds = new Set(teamIds);
		if (uniqueIds.size !== teamIds.length) {
			return 'Duplicate teams in group';
		}

		// Check teams exist
		for (const teamId of teamIds) {
			if (!availableTeamIds.includes(teamId)) {
				return `Team ${teamId} not found in tournament`;
			}
		}

		// Check teams aren't already in another group
		for (const teamId of teamIds) {
			for (const existingGroup of allTeamsInRound) {
				if (existingGroup.hasTeam(teamId)) {
					return `Team ${teamId} is already in group "${existingGroup.name}"`;
				}
			}
		}

		return null;
	}

	/**
	 * Get all pro IDs from teams in this group.
	 * Requires teams to be loaded.
	 */
	getAllProIds(): string[] {
		if (!this._teams) {
			throw new BusinessRuleError('Teams not loaded');
		}
		return this._teams.flatMap((t) => [t.maleProId, t.femaleProId]);
	}
}
