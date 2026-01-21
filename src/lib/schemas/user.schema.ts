import { z } from 'zod';

/**
 * User role enum.
 */
export const UserRoleEnum = z.enum(['user', 'admin', 'scorekeeper']);
export type UserRole = z.infer<typeof UserRoleEnum>;

/**
 * Schema for PocketBase auth user (minimal, from users collection).
 */
export const AuthUserSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	verified: z.boolean().default(false),
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

/**
 * Schema for User Profile (extended user data).
 */
export const UserProfileSchema = z.object({
	id: z.string(),
	user_id: z.string(), // Links to PocketBase users collection
	display_name: z.string().min(1, 'Display name is required'),
	avatar_url: z.string().url().optional(),
	role: UserRoleEnum.default('user'),
	
	// Preferences
	email_notifications: z.boolean().default(true),
	
	// Lifetime stats (denormalized for quick access)
	leagues_joined: z.number().int().default(0),
	leagues_won: z.number().int().default(0),
	tournaments_played: z.number().int().default(0),
	total_fantasy_points: z.number().default(0),
	best_finish: z.number().int().optional(),
	
	// Financial
	total_winnings: z.number().default(0),
	total_entry_fees: z.number().default(0),
	
	created: z.string().datetime().optional(),
	updated: z.string().datetime().optional()
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

/**
 * Schema for creating a User Profile.
 */
export const UserProfileCreateSchema = z.object({
	user_id: z.string(),
	display_name: z.string().min(1, 'Display name is required'),
	avatar_url: z.string().url().optional()
});
export type UserProfileCreate = z.infer<typeof UserProfileCreateSchema>;

/**
 * Schema for updating a User Profile.
 */
export const UserProfileUpdateSchema = z.object({
	display_name: z.string().min(1).optional(),
	avatar_url: z.string().url().optional(),
	email_notifications: z.boolean().optional()
});
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;

/**
 * Schema for registration input.
 */
export const RegisterInputSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	passwordConfirm: z.string(),
	displayName: z.string().min(1, 'Display name is required')
}).refine((data) => data.password === data.passwordConfirm, {
	message: 'Passwords do not match',
	path: ['passwordConfirm']
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

/**
 * Schema for login input.
 */
export const LoginInputSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(1, 'Password is required')
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

/**
 * User with profile (combined view).
 */
export const UserWithProfileSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	verified: z.boolean(),
	profile: UserProfileSchema.optional()
});
export type UserWithProfile = z.infer<typeof UserWithProfileSchema>;

/**
 * User league history entry.
 */
export const LeagueHistoryEntrySchema = z.object({
	id: z.string(),
	user_id: z.string(),
	league_id: z.string(),
	league_name: z.string(),
	season_name: z.string(),
	final_rank: z.number().int().optional(),
	total_points: z.number(),
	winnings: z.number().default(0),
	entry_fee: z.number().default(0),
	completed_at: z.string().datetime().optional(),
	created: z.string().datetime().optional()
});

export type LeagueHistoryEntry = z.infer<typeof LeagueHistoryEntrySchema>;

/**
 * Schema for creating a league history entry.
 */
export const LeagueHistoryCreateSchema = LeagueHistoryEntrySchema.omit({
	id: true,
	created: true
});
export type LeagueHistoryCreate = z.infer<typeof LeagueHistoryCreateSchema>;
