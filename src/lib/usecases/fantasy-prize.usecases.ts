import { FantasyPrize, PrizeDistribution } from '$lib/domain/FantasyPrize';
import { FantasyPrizeRepo } from '$lib/data/repos/fantasy-prize.repo';
import { FantasyLeagueRepo, FantasyParticipantRepo } from '$lib/data/repos/fantasy-league.repo';
import type { FantasyPrizeCreate, PayoutStructure } from '$lib/schemas/fantasy-prize.schema';
import { PAYOUT_STRUCTURES } from '$lib/schemas/fantasy-prize.schema';
import { ValidationError, InvalidStateError, UnauthorizedError } from '$lib/core/errors';

/**
 * Use cases for Fantasy Prize management.
 */

/**
 * Create prizes for a league using a payout structure.
 */
export async function createPrizesFromStructure(
	leagueId: string,
	structureName: string,
	userId: string
): Promise<FantasyPrize[]> {
	const league = await FantasyLeagueRepo.getById(leagueId);

	if (league.commissioner_id !== userId) {
		throw new UnauthorizedError('Only commissioner can create prizes');
	}

	const structure = PrizeDistribution.getStructure(structureName);
	if (!structure) {
		throw new ValidationError(`Unknown payout structure: ${structureName}`);
	}

	// Delete existing prizes
	await FantasyPrizeRepo.deleteByLeagueId(leagueId);

	// Generate prize definitions
	const definitions = PrizeDistribution.generatePrizeDefinitions(structure, league.prize_pool);

	// Create prizes
	const prizesToCreate: FantasyPrizeCreate[] = definitions.map((d) => ({
		league_id: leagueId,
		name: d.name,
		type: d.type,
		amount: d.amount,
		position: d.position
	}));

	const created = await FantasyPrizeRepo.createMany(prizesToCreate);
	return created.map((p) => new FantasyPrize(p));
}

/**
 * Create a custom prize.
 */
export async function createCustomPrize(
	leagueId: string,
	data: Omit<FantasyPrizeCreate, 'league_id'>,
	userId: string
): Promise<FantasyPrize> {
	const league = await FantasyLeagueRepo.getById(leagueId);

	if (league.commissioner_id !== userId) {
		throw new UnauthorizedError('Only commissioner can create prizes');
	}

	const prizeDTO = await FantasyPrizeRepo.create({
		...data,
		league_id: leagueId
	});

	return new FantasyPrize(prizeDTO);
}

/**
 * Get all prizes for a league.
 */
export async function getLeaguePrizes(leagueId: string): Promise<FantasyPrize[]> {
	const prizes = await FantasyPrizeRepo.getByLeagueId(leagueId);
	return prizes.map((p) => new FantasyPrize(p));
}

/**
 * Get available payout structures.
 */
export function getPayoutStructures(): PayoutStructure[] {
	return PAYOUT_STRUCTURES;
}

/**
 * Award prizes based on final standings.
 * Should be called when league is completed.
 */
export async function awardPrizesByStandings(
	leagueId: string,
	userId: string
): Promise<FantasyPrize[]> {
	const league = await FantasyLeagueRepo.getById(leagueId);

	if (league.commissioner_id !== userId) {
		throw new UnauthorizedError('Only commissioner can award prizes');
	}

	if (league.status !== 'complete') {
		throw new InvalidStateError('League must be complete to award prizes');
	}

	// Get final standings
	const participants = await FantasyParticipantRepo.getByLeagueId(leagueId);
	const standings = [...participants].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

	// Get pending prizes
	const prizes = await FantasyPrizeRepo.getByLeagueId(leagueId);
	const pendingPrizes = prizes.filter((p) => p.status === 'pending');

	// Award position-based prizes
	const awarded: FantasyPrize[] = [];

	for (const prize of pendingPrizes) {
		if (prize.position !== undefined) {
			const winner = standings.find((p) => p.rank === prize.position);
			if (winner) {
				const awardedPrize = await FantasyPrizeRepo.award(prize.id, winner.id);
				awarded.push(new FantasyPrize(awardedPrize));
			}
		}
	}

	return awarded;
}

/**
 * Manually award a prize to a participant.
 */
export async function awardPrize(
	prizeId: string,
	participantId: string,
	userId: string
): Promise<FantasyPrize> {
	const prize = await FantasyPrizeRepo.getById(prizeId);
	const league = await FantasyLeagueRepo.getById(prize.league_id);

	if (league.commissioner_id !== userId) {
		throw new UnauthorizedError('Only commissioner can award prizes');
	}

	if (prize.status !== 'pending') {
		throw new InvalidStateError('Prize has already been awarded');
	}

	const awardedPrize = await FantasyPrizeRepo.award(prizeId, participantId);
	return new FantasyPrize(awardedPrize);
}

/**
 * Mark a prize as paid.
 */
export async function markPrizePaid(prizeId: string, userId: string): Promise<FantasyPrize> {
	const prize = await FantasyPrizeRepo.getById(prizeId);
	const league = await FantasyLeagueRepo.getById(prize.league_id);

	if (league.commissioner_id !== userId) {
		throw new UnauthorizedError('Only commissioner can mark prizes as paid');
	}

	if (prize.status !== 'awarded') {
		throw new InvalidStateError('Prize must be awarded before marking as paid');
	}

	const paidPrize = await FantasyPrizeRepo.markPaid(prizeId);
	return new FantasyPrize(paidPrize);
}

/**
 * Get prizes won by a participant.
 */
export async function getParticipantPrizes(participantId: string): Promise<FantasyPrize[]> {
	const prizes = await FantasyPrizeRepo.getByParticipantId(participantId);
	return prizes.map((p) => new FantasyPrize(p));
}

/**
 * Get prize summary for a league.
 */
export async function getPrizeSummary(leagueId: string): Promise<{
	totalPrizePool: number;
	totalAwarded: number;
	totalPaid: number;
	prizes: Array<{
		name: string;
		amount: number;
		status: string;
		winnerName: string | null;
	}>;
}> {
	const league = await FantasyLeagueRepo.getById(leagueId);
	const prizes = await FantasyPrizeRepo.getByLeagueId(leagueId);
	const participants = await FantasyParticipantRepo.getByLeagueId(leagueId);
	const participantMap = new Map(participants.map((p) => [p.id, p.display_name]));

	const awarded = prizes.filter((p) => p.status === 'awarded' || p.status === 'paid');
	const paid = prizes.filter((p) => p.status === 'paid');

	return {
		totalPrizePool: league.prize_pool,
		totalAwarded: awarded.reduce((sum, p) => sum + p.amount, 0),
		totalPaid: paid.reduce((sum, p) => sum + p.amount, 0),
		prizes: prizes.map((p) => ({
			name: p.name,
			amount: p.amount,
			status: p.status,
			winnerName: p.participant_id ? participantMap.get(p.participant_id) ?? null : null
		}))
	};
}

/**
 * Delete a prize.
 */
export async function deletePrize(prizeId: string, userId: string): Promise<void> {
	const prize = await FantasyPrizeRepo.getById(prizeId);
	const league = await FantasyLeagueRepo.getById(prize.league_id);

	if (league.commissioner_id !== userId) {
		throw new UnauthorizedError('Only commissioner can delete prizes');
	}

	if (prize.status !== 'pending') {
		throw new InvalidStateError('Cannot delete awarded or paid prizes');
	}

	await FantasyPrizeRepo.delete(prizeId);
}
