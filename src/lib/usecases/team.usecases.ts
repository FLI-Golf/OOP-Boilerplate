import { Team } from '$lib/domain/Team';
import { Pro } from '$lib/domain/Pro';
import { TeamRepo } from '$lib/data/repos/team.repo';
import { ProRepo } from '$lib/data/repos/pro.repo';
import { TeamCreateSchema, type TeamCreate } from '$lib/schemas/team.schema';
import { ValidationError } from '$lib/core/errors';

/**
 * Use cases for Team management.
 */

/**
 * Create a new team for a tournament.
 * Validates that:
 * - Male pro is actually male
 * - Female pro is actually female
 * - Both pros are active
 * - Neither pro is already on another team in this tournament
 */
export async function createTeam(data: TeamCreate): Promise<Team> {
	// 1. Validate input shape
	const validated = TeamCreateSchema.parse(data);

	// 2. Load the pros to validate gender
	const [maleProDTO, femaleProDTO] = await Promise.all([
		ProRepo.getById(validated.male_pro_id),
		ProRepo.getById(validated.female_pro_id)
	]);
	const malePro = new Pro(maleProDTO);
	const femalePro = new Pro(femaleProDTO);

	// 3. Validate team composition (gender + active status)
	const compositionError = Team.validateComposition(malePro, femalePro);
	if (compositionError) {
		throw new ValidationError(compositionError);
	}

	// 4. Check pros aren't already on another team in this tournament
	const existingTeams = await getTeamsForTournament(validated.tournament_id);
	const availabilityError = Team.validateProAvailability(
		validated.male_pro_id,
		validated.female_pro_id,
		existingTeams
	);
	if (availabilityError) {
		throw new ValidationError(availabilityError);
	}

	// 5. Create the team
	const teamDTO = await TeamRepo.create(validated);
	return new Team(teamDTO, malePro, femalePro);
}

/**
 * Get a team by ID with pro details loaded.
 */
export async function getTeam(id: string): Promise<Team> {
	const teamDTO = await TeamRepo.getById(id);
	const [maleProDTO, femaleProDTO] = await Promise.all([
		ProRepo.getById(teamDTO.male_pro_id),
		ProRepo.getById(teamDTO.female_pro_id)
	]);
	return new Team(teamDTO, new Pro(maleProDTO), new Pro(femaleProDTO));
}

/**
 * Get all teams for a tournament.
 */
export async function getTeamsForTournament(tournamentId: string): Promise<Team[]> {
	const teams = await TeamRepo.getByTournamentId(tournamentId);
	return teams.map((t) => new Team(t));
}

/**
 * Get all teams for a tournament with pro details loaded.
 */
export async function getTeamsForTournamentWithPros(tournamentId: string): Promise<Team[]> {
	const teamDTOs = await TeamRepo.getByTournamentId(tournamentId);
	
	// Collect all pro IDs
	const proIds = new Set<string>();
	for (const team of teamDTOs) {
		proIds.add(team.male_pro_id);
		proIds.add(team.female_pro_id);
	}

	// Load all pros in one query
	const proDTOs = await ProRepo.getByIds([...proIds]);
	const proMap = new Map(proDTOs.map((p) => [p.id, new Pro(p)]));

	// Build teams with pros
	return teamDTOs.map((t) => new Team(t, proMap.get(t.male_pro_id), proMap.get(t.female_pro_id)));
}

/**
 * Delete a team.
 */
export async function deleteTeam(id: string): Promise<void> {
	await TeamRepo.delete(id);
}

/**
 * Create multiple teams from a list of pro pairings.
 * Useful for bulk team creation.
 */
export async function createTeamsFromPairings(
	tournamentId: string,
	pairings: Array<{ name: string; maleProId: string; femaleProId: string }>
): Promise<Team[]> {
	const teams: Team[] = [];
	for (const pairing of pairings) {
		const team = await createTeam({
			name: pairing.name,
			tournament_id: tournamentId,
			male_pro_id: pairing.maleProId,
			female_pro_id: pairing.femaleProId
		});
		teams.push(team);
	}
	return teams;
}
