import { pb } from '$lib/data/pb/pb.client';
import type { UserProfile } from '$lib/schemas/user.schema';
import {
	login as loginUsecase,
	register as registerUsecase,
	logout as logoutUsecase,
	getCurrentUser,
	type AuthResult
} from '$lib/usecases/auth.usecases';

/**
 * Auth state interface.
 */
interface AuthState {
	user: AuthResult | null;
	loading: boolean;
	error: string | null;
}

/**
 * Create reactive auth state using Svelte 5 runes.
 * This must be called within a component context.
 */
export function createAuthState() {
	let user = $state<AuthResult | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Initialize auth state
	async function init() {
		loading = true;
		error = null;
		try {
			user = await getCurrentUser();
		} catch (e) {
			user = null;
		} finally {
			loading = false;
		}
	}

	// Login
	async function login(email: string, password: string) {
		loading = true;
		error = null;
		try {
			user = await loginUsecase({ email, password });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Login failed';
			throw e;
		} finally {
			loading = false;
		}
	}

	// Register
	async function register(email: string, password: string, passwordConfirm: string, displayName: string) {
		loading = true;
		error = null;
		try {
			user = await registerUsecase({ email, password, passwordConfirm, displayName });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Registration failed';
			throw e;
		} finally {
			loading = false;
		}
	}

	// Logout
	function logout() {
		logoutUsecase();
		user = null;
		error = null;
	}

	// Clear error
	function clearError() {
		error = null;
	}

	return {
		get user() { return user; },
		get loading() { return loading; },
		get error() { return error; },
		get isAuthenticated() { return user !== null; },
		get profile() { return user?.profile ?? null; },
		get userId() { return user?.userId ?? null; },
		init,
		login,
		register,
		logout,
		clearError
	};
}

/**
 * Simple auth check functions (non-reactive, for use outside components).
 */
export function isLoggedIn(): boolean {
	return pb.authStore.isValid;
}

export function getAuthUserId(): string | null {
	return pb.authStore.model?.id ?? null;
}

export function getAuthEmail(): string | null {
	return pb.authStore.model?.email ?? null;
}
