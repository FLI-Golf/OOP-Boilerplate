import { z } from 'zod';

export const userSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	email: z.string().email('Invalid email address'),
	age: z.number().min(18, 'Must be at least 18 years old').max(120, 'Invalid age')
});

export type User = z.infer<typeof userSchema>;
