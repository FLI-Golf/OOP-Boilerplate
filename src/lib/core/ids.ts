/**
 * ID utilities for working with PocketBase record IDs.
 * PocketBase generates 15-character alphanumeric IDs by default.
 */

/**
 * Check if a string is a valid PocketBase ID format.
 * PocketBase IDs are 15 alphanumeric characters.
 */
export function isValidId(id: string): boolean {
	return /^[a-zA-Z0-9]{15}$/.test(id);
}

/**
 * Assert that an ID is valid, throw if not.
 */
export function assertValidId(id: string, context?: string): void {
	if (!isValidId(id)) {
		const prefix = context ? `${context}: ` : '';
		throw new Error(`${prefix}Invalid ID format: ${id}`);
	}
}

/**
 * Create a display-friendly short ID (first 6 chars).
 * Useful for logs and debugging.
 */
export function shortId(id: string): string {
	return id.slice(0, 6);
}
