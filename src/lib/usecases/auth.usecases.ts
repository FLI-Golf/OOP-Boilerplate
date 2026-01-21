import { pb } from '$lib/data/pb/pb.client';
import { UserProfileRepo, LeagueHistoryRepo } from '$lib/data/repos/user.repo';
import {
	RegisterInputSchema,
	LoginInputSchema,
	UserProfileUpdateSchema,
	type RegisterInput,
	type LoginInput,
	type UserProfile,
	type UserProfileUpdate,
	type LeagueHistoryEntry
} from '$lib/schemas/user.schema';
import { ValidationError, UnauthorizedError } from '$lib/core/errors';

/**
 * Auth result returned after login/register.
 */
export interface AuthResult {
	userId: string;
	email: string;
	verified: boolean;
	profile: UserProfile | null;
}

/**
 * Register a new user.
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
	// Validate input
	const validated = RegisterInputSchema.parse(input);

	try {
		// Create auth user in PocketBase
		const authUser = await pb.collection('users').create({
			email: validated.email,
			password: validated.password,
			passwordConfirm: validated.passwordConfirm
		});

		// Create user profile
		const profile = await UserProfileRepo.create({
			user_id: authUser.id,
			display_name: validated.displayName
		});

		// Auto-login after registration
		await pb.collection('users').authWithPassword(validated.email, validated.password);

		return {
			userId: authUser.id,
			email: authUser.email,
			verified: authUser.verified ?? false,
			profile
		};
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'data' in err) {
			const pbError = err as { data?: { data?: Record<string, { message: string }> } };
			if (pbError.data?.data?.email?.message) {
				throw new ValidationError(pbError.data.data.email.message);
			}
		}
		throw err;
	}
}

/**
 * Login an existing user.
 */
export async function login(input: LoginInput): Promise<AuthResult> {
	// Validate input
	const validated = LoginInputSchema.parse(input);

	try {
		const authData = await pb.collection('users').authWithPassword(
			validated.email,
			validated.password
		);

		const profile = await UserProfileRepo.getByUserId(authData.record.id);

		return {
			userId: authData.record.id,
			email: authData.record.email,
			verified: authData.record.verified ?? false,
			profile
		};
	} catch (err: unknown) {
		throw new ValidationError('Invalid email or password');
	}
}

/**
 * Logout the current user.
 */
export function logout(): void {
	pb.authStore.clear();
}

/**
 * Get current authenticated user.
 */
export async function getCurrentUser(): Promise<AuthResult | null> {
	if (!pb.authStore.isValid || !pb.authStore.model) {
		return null;
	}

	const user = pb.authStore.model;
	const profile = await UserProfileRepo.getByUserId(user.id);

	return {
		userId: user.id,
		email: user.email,
		verified: user.verified ?? false,
		profile
	};
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated(): boolean {
	return pb.authStore.isValid;
}

/**
 * Get current user ID.
 */
export function getCurrentUserId(): string | null {
	return pb.authStore.model?.id ?? null;
}

/**
 * Update user profile.
 */
export async function updateProfile(data: UserProfileUpdate): Promise<UserProfile> {
	const userId = getCurrentUserId();
	if (!userId) {
		throw new UnauthorizedError('Not authenticated');
	}

	const validated = UserProfileUpdateSchema.parse(data);
	const profile = await UserProfileRepo.getByUserId(userId);

	if (!profile) {
		throw new ValidationError('Profile not found');
	}

	return UserProfileRepo.update(profile.id, validated);
}

/**
 * Get user profile by user ID.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
	return UserProfileRepo.getByUserId(userId);
}

/**
 * Get current user's profile.
 */
export async function getMyProfile(): Promise<UserProfile | null> {
	const userId = getCurrentUserId();
	if (!userId) return null;
	return UserProfileRepo.getByUserId(userId);
}

/**
 * Get user's league history.
 */
export async function getMyLeagueHistory(): Promise<LeagueHistoryEntry[]> {
	const userId = getCurrentUserId();
	if (!userId) return [];
	return LeagueHistoryRepo.getByUserId(userId);
}

/**
 * Get league history for a specific user.
 */
export async function getUserLeagueHistory(userId: string): Promise<LeagueHistoryEntry[]> {
	return LeagueHistoryRepo.getByUserId(userId);
}

/**
 * Request password reset email.
 */
export async function requestPasswordReset(email: string): Promise<void> {
	await pb.collection('users').requestPasswordReset(email);
}

/**
 * Request email verification.
 */
export async function requestEmailVerification(): Promise<void> {
	const userId = getCurrentUserId();
	if (!userId) {
		throw new UnauthorizedError('Not authenticated');
	}

	const user = pb.authStore.model;
	if (user?.email) {
		await pb.collection('users').requestVerification(user.email);
	}
}

/**
 * Check if current user is admin.
 */
export async function isAdmin(): Promise<boolean> {
	const profile = await getMyProfile();
	return profile?.role === 'admin';
}

/**
 * Check if current user is scorekeeper.
 */
export async function isScorekeeper(): Promise<boolean> {
	const profile = await getMyProfile();
	return profile?.role === 'scorekeeper' || profile?.role === 'admin';
}
