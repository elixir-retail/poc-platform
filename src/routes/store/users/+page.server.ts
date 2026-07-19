import { error, fail } from '@sveltejs/kit';
import {
	createStoreStaffUserSchema,
	STORE_STAFF_ROLES,
	storeUserActionSchema,
	updateStoreUserRoleSchema
} from '$lib/schemas/store-users';
import { getStoreAppContext } from '$lib/server/store-auth';
import { canManageStoreUsers } from '$lib/server/store-auth';
import {
	createStoreStaffUser,
	deactivateStoreUser,
	deleteStoreUser,
	listStoreUsers,
	updateStoreUserRole
} from '$lib/server/store-users';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { storeContext } = await parent();
	try {
		return {
			users: await listStoreUsers(supabase, storeContext),
			canManage: canManageStoreUsers(storeContext.membership.role),
			staffRoles: [...STORE_STAFF_ROLES]
		};
	} catch {
		error(500, 'Unable to load store users');
	}
};

export const actions: Actions = {
	createUser: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');
		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const parsed = createStoreStaffUserSchema.safeParse({
			display_name: String(formData.get('display_name') ?? ''),
			email: String(formData.get('email') ?? ''),
			temporary_password: String(formData.get('temporary_password') ?? ''),
			role: String(formData.get('role') ?? '')
		});
		if (!parsed.success) {
			return fail(400, {
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check user details.'
			});
		}

		try {
			await createStoreStaffUser(supabase, user, context, parsed.data);
			return {
				success: true as const,
				message: 'Store user created. They can sign in with the temporary password.'
			};
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to create store user'
			});
		}
	},

	updateRole: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');
		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const parsed = updateStoreUserRoleSchema.safeParse({
			store_user_uuid: formData.get('store_user_uuid'),
			role: String(formData.get('role') ?? '')
		});
		if (!parsed.success) {
			return fail(400, {
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Invalid role.'
			});
		}

		try {
			await updateStoreUserRole(supabase, user, context, parsed.data);
			return { success: true as const, message: 'User role updated.' };
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to update role'
			});
		}
	},

	deactivateUser: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');
		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const parsed = storeUserActionSchema.safeParse({
			store_user_uuid: formData.get('store_user_uuid')
		});
		if (!parsed.success) {
			return fail(400, { success: false as const, message: 'User not found.' });
		}

		try {
			await deactivateStoreUser(supabase, user, context, parsed.data.store_user_uuid);
			return { success: true as const, message: 'User deactivated.' };
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to deactivate user'
			});
		}
	},

	deleteUser: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');
		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const parsed = storeUserActionSchema.safeParse({
			store_user_uuid: formData.get('store_user_uuid')
		});
		if (!parsed.success) {
			return fail(400, { success: false as const, message: 'User not found.' });
		}

		try {
			await deleteStoreUser(supabase, user, context, parsed.data.store_user_uuid);
			return { success: true as const, message: 'User deleted.' };
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to delete user'
			});
		}
	}
};
