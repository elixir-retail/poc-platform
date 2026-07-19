import { z } from 'zod';

export const STORE_USER_ROLES = ['root', 'manager', 'cashier'] as const;
/** Roles a store admin can assign when creating or updating staff. */
export const STORE_STAFF_ROLES = ['manager', 'cashier'] as const;

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

export const createStoreStaffUserSchema = createStoreRootUserSchema.extend({
	role: z.enum(STORE_STAFF_ROLES)
});

export const storeUserActionSchema = z.object({
	store_user_uuid: z.uuid()
});

export const updateStoreUserRoleSchema = z.object({
	store_user_uuid: z.uuid(),
	role: z.enum(STORE_STAFF_ROLES)
});

export type CreateStoreRootUserInput = z.infer<typeof createStoreRootUserSchema>;
export type CreateStoreStaffUserInput = z.infer<typeof createStoreStaffUserSchema>;
export type UpdateStoreUserRoleInput = z.infer<typeof updateStoreUserRoleSchema>;
