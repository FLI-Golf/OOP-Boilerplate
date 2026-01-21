import { Season } from '$lib/domain/Season';
import { SeasonRepo } from '$lib/data/repos/season.repo';
import { SeasonCreateSchema, type SeasonCreate, type SeasonUpdate } from '$lib/schemas/season.schema';

/**
 * Use cases for Season management.
 */

/**
 * Create a new season.
 */
export async function createSeason(data: SeasonCreate): Promise<Season> {
	const validated = SeasonCreateSchema.parse(data);
	const seasonDTO = await SeasonRepo.create(validated);
	return new Season(seasonDTO);
}

/**
 * Get a season by ID.
 */
export async function getSeason(id: string): Promise<Season> {
	const seasonDTO = await SeasonRepo.getById(id);
	return new Season(seasonDTO);
}

/**
 * Get the currently active season.
 */
export async function getActiveSeason(): Promise<Season | null> {
	const seasonDTO = await SeasonRepo.getActive();
	return seasonDTO ? new Season(seasonDTO) : null;
}

/**
 * List all seasons (sorted by year, newest first).
 */
export async function listSeasons(): Promise<Season[]> {
	const seasons = await SeasonRepo.getAll();
	return Season.sortByYear(seasons.map((s) => new Season(s)));
}

/**
 * Update a season.
 */
export async function updateSeason(id: string, data: SeasonUpdate): Promise<Season> {
	const seasonDTO = await SeasonRepo.update(id, data);
	return new Season(seasonDTO);
}

/**
 * Set a season as the active season.
 * Deactivates any other active season.
 */
export async function setActiveSeason(id: string): Promise<Season> {
	const seasonDTO = await SeasonRepo.setActive(id);
	return new Season(seasonDTO);
}

/**
 * Delete a season.
 */
export async function deleteSeason(id: string): Promise<void> {
	await SeasonRepo.delete(id);
}
