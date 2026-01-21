import { Tournament } from '$lib/domain/Tournament';
import { TournamentRepo, TournamentRoundRepo } from '$lib/data/repos/tournament.repo';
import { CourseRepo } from '$lib/data/repos/course.repo';
import {
	TournamentCreateSchema,
	type TournamentCreate,
	type TournamentUpdate,
	type TournamentStatus
} from '$lib/schemas/tournament.schema';
import { ValidationError, InvalidStateError } from '$lib/core/errors';

/**
 * Use cases for Tournament management.
 */

/**
 * Create a new tournament.
 * Validates that the course exists.
 */
export async function createTournament(data: TournamentCreate): Promise<Tournament> {
	// 1. Validate input
	const validated = TournamentCreateSchema.parse(data);

	// 2. Verify course exists
	await CourseRepo.getById(validated.course_id);

	// 3. Create tournament
	const tournamentDTO = await TournamentRepo.create(validated);
	return new Tournament(tournamentDTO);
}

/**
 * Get a tournament with its rounds.
 */
export async function getTournament(id: string): Promise<Tournament> {
	const tournamentDTO = await TournamentRepo.getById(id);
	const rounds = await TournamentRoundRepo.getByTournamentId(id);
	return new Tournament(tournamentDTO, rounds);
}

/**
 * List all tournaments.
 */
export async function listTournaments(): Promise<Tournament[]> {
	const tournaments = await TournamentRepo.getAll();
	return tournaments.map((t) => new Tournament(t));
}

/**
 * List tournaments for a season.
 */
export async function listTournamentsBySeason(seasonId: string): Promise<Tournament[]> {
	const tournaments = await TournamentRepo.getBySeasonId(seasonId);
	return tournaments.map((t) => new Tournament(t));
}

/**
 * Update tournament details.
 */
export async function updateTournament(id: string, data: TournamentUpdate): Promise<Tournament> {
	const tournamentDTO = await TournamentRepo.update(id, data);
	const rounds = await TournamentRoundRepo.getByTournamentId(id);
	return new Tournament(tournamentDTO, rounds);
}

/**
 * Start a tournament (transition to live).
 */
export async function startTournament(id: string): Promise<Tournament> {
	const tournament = await getTournament(id);

	const error = tournament.validateTransition('live');
	if (error) {
		throw new InvalidStateError(error);
	}

	const updatedDTO = await TournamentRepo.updateStatus(id, 'live');
	await TournamentRepo.updateCurrentRound(id, 1);

	const rounds = await TournamentRoundRepo.getByTournamentId(id);
	return new Tournament({ ...updatedDTO, current_round: 1 }, rounds);
}

/**
 * Finalize a tournament.
 */
export async function finalizeTournament(id: string): Promise<Tournament> {
	const tournament = await getTournament(id);

	const error = tournament.validateFinalization();
	if (error) {
		throw new InvalidStateError(error);
	}

	const updatedDTO = await TournamentRepo.updateStatus(id, 'final');
	const rounds = await TournamentRoundRepo.getByTournamentId(id);
	return new Tournament(updatedDTO, rounds);
}

/**
 * Create a round for a tournament.
 */
export async function createRound(tournamentId: string, roundNumber: number): Promise<Tournament> {
	const tournament = await getTournament(tournamentId);

	const error = tournament.validateRoundCreation(roundNumber);
	if (error) {
		throw new ValidationError(error);
	}

	await TournamentRoundRepo.create({
		tournament_id: tournamentId,
		round_number: roundNumber
	});

	return getTournament(tournamentId);
}

/**
 * Start a round (set to in_progress).
 */
export async function startRound(tournamentId: string, roundNumber: number): Promise<Tournament> {
	const tournament = await getTournament(tournamentId);

	if (!tournament.isLive) {
		throw new InvalidStateError('Tournament must be live to start a round');
	}

	const round = tournament.rounds.find((r) => r.round_number === roundNumber);
	if (!round) {
		throw new ValidationError(`Round ${roundNumber} does not exist`);
	}

	await TournamentRoundRepo.updateStatus(round.id, 'in_progress');
	await TournamentRepo.updateCurrentRound(tournamentId, roundNumber);

	return getTournament(tournamentId);
}

/**
 * Complete a round.
 */
export async function completeRound(tournamentId: string, roundNumber: number): Promise<Tournament> {
	const tournament = await getTournament(tournamentId);

	const round = tournament.rounds.find((r) => r.round_number === roundNumber);
	if (!round) {
		throw new ValidationError(`Round ${roundNumber} does not exist`);
	}

	if (round.status !== 'in_progress') {
		throw new InvalidStateError('Round must be in progress to complete');
	}

	await TournamentRoundRepo.updateStatus(round.id, 'complete');

	return getTournament(tournamentId);
}

/**
 * Delete a tournament and all related data.
 */
export async function deleteTournament(id: string): Promise<void> {
	// Delete rounds first
	await TournamentRoundRepo.deleteByTournamentId(id);
	// Then delete tournament
	await TournamentRepo.delete(id);
}
