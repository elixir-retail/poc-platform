import { z } from 'zod';

export const createPlatformUserSchema = z.object({
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
		.regex(/[0-9]/, 'Password must include a number'),
	role: z.enum(['platform_admin', 'platform_op']).optional().default('platform_op')
});

export const updatePlatformUserSchema = z.object({
	profile_uuid: z.uuid(),
	role: z.enum(['platform_admin', 'platform_op']),
	is_active: z
		.union([z.literal('true'), z.literal('false'), z.boolean()])
		.transform((value) => value === true || value === 'true')
});
