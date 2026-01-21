import PocketBase from 'pocketbase';

/**
 * PocketBase client singleton.
 *
 * Usage:
 *   import { pb } from '$lib/data/pb/pb.client';
 *   const records = await pb.collection('courses').getFullList();
 *
 * The URL defaults to localhost for development.
 * In production, set the VITE_POCKETBASE_URL environment variable.
 */

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090';

export const pb = new PocketBase(POCKETBASE_URL);

/**
 * Enable auto-refresh of auth token.
 * Call this once on app initialization if using auth.
 */
export function initAuthRefresh(): void {
	pb.authStore.onChange(() => {
		// Auth state changed - you can add logging or side effects here
	});
}

/**
 * Check if user is currently authenticated.
 */
export function isAuthenticated(): boolean {
	return pb.authStore.isValid;
}

/**
 * Get current user ID or null if not authenticated.
 */
export function getCurrentUserId(): string | null {
	return pb.authStore.model?.id ?? null;
}

/**
 * Clear auth state (logout).
 */
export function logout(): void {
	pb.authStore.clear();
}
