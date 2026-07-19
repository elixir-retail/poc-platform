import { z } from 'zod';

export const createStoreRootUserSchema = z.object({
	display_name: z.string().trim().min(2).max(120),
	email: z
		.string()
		.trim()
		.email()
		.max(160)
		.transform((value) => value.toLowerCase()),
	temporary_password: z
		.string()
		.min(8)
		.max(72)
		.regex(/[A-Za-z]/, 'Password must include a letter')
		.regex(/[0-9]/, 'Password must include a number')
});

export type CreateStoreRootUserInput = z.infer<typeof createStoreRootUserSchema>;
