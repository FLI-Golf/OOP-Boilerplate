import { Group } from '$lib/domain/Group';
import { Team } from '$lib/domain/Team';
import { GroupRepo } from '$lib/data/repos/group.repo';
import { TeamRepo } from '$lib/data/repos/team.repo';
import { TournamentRoundRepo } from '$lib/data/repos/tournament.repo';
import { GroupCreateSchema, type GroupCreate, type GroupUpdate } from '$lib/schemas/group.schema';
import { ValidationError } from '$lib/core/errors';

/**
 * Use cases for Group (pairing) management.
 */

/**
 * Create groups for a round.
 * Validates that teams aren't already in another group.
 */
export async function createGroup(data: GroupCreate): Promise<Group> {
	// 1. Validate input
	const validated = GroupCreateSchema.parse(data);

	// 2. Load existing groups for this round
	const existingGroups = await getGroupsForRound(validated.round_id);

	// 3. Load all teams for the tournament
	const allTeams = await TeamRepo.getByTournamentId(validated.tournament_id);
	const availableTeamIds = allTeams.map((t) => t.id);

	// 4. Validate group creation
	const error = Group.validateCreation(validated.team_ids, existingGroups, availableTeamIds);
	if (error) {
		throw new ValidationError(error);
	}

	// 5. Create the group
	const groupDTO = await GroupRepo.create(validated);
	return new Group(groupDTO);
}

/**
 * Get a group by ID.
 */
export async function getGroup(id: string): Promise<Group> {
	const groupDTO = await GroupRepo.getById(id);
	return new Group(groupDTO);
}

/**
 * Get a group with teams loaded.
 */
export async function getGroupWithTeams(id: string): Promise<Group> {
	const groupDTO = await GroupRepo.getById(id);
	const teamDTOs = await TeamRepo.getByTournamentId(groupDTO.tournament_id);
	const teams = teamDTOs
		.filter((t) => groupDTO.team_ids.includes(t.id))
		.map((t) => new Team(t));
	return new Group(groupDTO, teams);
}

/**
 * Get all groups for a round.
 */
export async function getGroupsForRound(roundId: string): Promise<Group[]> {
	const groups = await GroupRepo.getByRoundId(roundId);
	return groups.map((g) => new Group(g));
}

/**
 * Get all groups for a round with teams loaded.
 */
export async function getGroupsForRoundWithTeams(
	roundId: string,
	tournamentId: string
): Promise<Group[]> {
	const groupDTOs = await GroupRepo.getByRoundId(roundId);
	const teamDTOs = await TeamRepo.getByTournamentId(tournamentId);
	const teamMap = new Map(teamDTOs.map((t) => [t.id, new Team(t)]));

	return groupDTOs.map((g) => {
		const teams = g.team_ids.map((id) => teamMap.get(id)).filter((t): t is Team => t !== undefined);
		return new Group(g, teams);
	});
}

/**
 * Assign a scorekeeper to a group.
 */
export async function assignScorekeeper(groupId: string, scorekeeperId: string): Promise<Group> {
	const groupDTO = await GroupRepo.assignScorekeeper(groupId, scorekeeperId);
	return new Group(groupDTO);
}

/**
 * Update a group.
 */
export async function updateGroup(id: string, data: GroupUpdate): Promise<Group> {
	const groupDTO = await GroupRepo.update(id, data);
	return new Group(groupDTO);
}

/**
 * Delete a group.
 */
export async function deleteGroup(id: string): Promise<void> {
	await GroupRepo.delete(id);
}

/**
 * Get groups assigned to a scorekeeper for a round.
 */
export async function getScorekeeperGroups(
	scorekeeperId: string,
	roundId: string
): Promise<Group[]> {
	const groups = await GroupRepo.getByScorekeeperIdAndRound(scorekeeperId, roundId);
	return groups.map((g) => new Group(g));
}

/**
 * Auto-generate groups for a round (simple pairing).
 * Creates groups of 2 teams each.
 */
export async function autoGenerateGroups(
	tournamentId: string,
	roundId: string
): Promise<Group[]> {
	// Load teams
	const teams = await TeamRepo.getByTournamentId(tournamentId);

	// Check no groups exist yet
	const existingGroups = await getGroupsForRound(roundId);
	if (existingGroups.length > 0) {
		throw new ValidationError('Groups already exist for this round');
	}

	// Create groups of 2 teams
	const groups: Group[] = [];
	for (let i = 0; i < teams.length; i += 2) {
		const teamIds = teams.slice(i, i + 2).map((t) => t.id);
		if (teamIds.length > 0) {
			const group = await createGroup({
				tournament_id: tournamentId,
				round_id: roundId,
				name: `Group ${groups.length + 1}`,
				team_ids: teamIds
			});
			groups.push(group);
		}
	}

	return groups;
}
