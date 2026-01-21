import { Pro } from '$lib/domain/Pro';
import { ProRepo } from '$lib/data/repos/pro.repo';
import { ProCreateSchema, type ProCreate, type ProUpdate } from '$lib/schemas/pro.schema';

/**
 * Use cases for Pro management.
 */

/**
 * Create a new pro.
 */
export async function createPro(data: ProCreate): Promise<Pro> {
	const validated = ProCreateSchema.parse(data);
	const proDTO = await ProRepo.create(validated);
	return new Pro(proDTO);
}

/**
 * Get a pro by ID.
 */
export async function getPro(id: string): Promise<Pro> {
	const proDTO = await ProRepo.getById(id);
	return new Pro(proDTO);
}

/**
 * List all pros.
 */
export async function listPros(): Promise<Pro[]> {
	const pros = await ProRepo.getAll();
	return pros.map((p) => new Pro(p));
}

/**
 * List all active pros.
 */
export async function listActivePros(): Promise<Pro[]> {
	const pros = await ProRepo.getActive();
	return pros.map((p) => new Pro(p));
}

/**
 * List pros by gender.
 */
export async function listProsByGender(gender: 'male' | 'female'): Promise<Pro[]> {
	const pros = await ProRepo.getByGender(gender);
	return pros.map((p) => new Pro(p));
}

/**
 * Update a pro.
 */
export async function updatePro(id: string, data: ProUpdate): Promise<Pro> {
	const proDTO = await ProRepo.update(id, data);
	return new Pro(proDTO);
}

/**
 * Deactivate a pro (soft delete).
 */
export async function deactivatePro(id: string): Promise<Pro> {
	const proDTO = await ProRepo.update(id, { active: false });
	return new Pro(proDTO);
}

/**
 * Get available pros for draft (active, sorted by rating).
 */
export async function getAvailableProsForDraft(): Promise<{ males: Pro[]; females: Pro[] }> {
	const pros = await listActivePros();
	const sorted = Pro.sortByRating(pros);
	return {
		males: Pro.filterByGender(sorted, 'male'),
		females: Pro.filterByGender(sorted, 'female')
	};
}
