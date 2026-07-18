import { error, fail } from '@sveltejs/kit';
import { createPlatformUserSchema, updatePlatformUserSchema } from '$lib/schemas/users';
import { getPlatformProfile } from '$lib/server/platform-auth';
import { createPlatformUser, updatePlatformUser } from '$lib/server/platform-users';
import type { PlatformProfile, PlatformUserListItem } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Actions, PageServerLoad } from './$types';

async function requireActor(
	supabase: SupabaseClient,
	safeGetSession: App.Locals['safeGetSession']
): Promise<{ user: User; profile: PlatformProfile }> {
	const { user } = await safeGetSession();
	if (!user) error(401, 'Authentication required');
	const profile = await getPlatformProfile(supabase, user);
	if (!profile) error(403, 'Platform access required');
	return { user, profile };
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error: queryError } = await supabase
		.from('profile')
		.select('profile_uuid, user_uuid, email, display_name, role, is_active, created_at, changed_at')
		.order('created_at', { ascending: false });

	if (queryError) {
		error(500, 'Unable to load platform users');
	}

	return { users: (data ?? []) as PlatformUserListItem[] };
};

export const actions: Actions = {
	createUser: async ({ request, locals: { supabase, safeGetSession } }) => {
		const actor = await requireActor(supabase, safeGetSession);
		const formData = await request.formData();
		const parsed = createPlatformUserSchema.safeParse(Object.fromEntries(formData));

		if (!parsed.success) {
			return fail(400, {
				action: 'createUser',
				message: 'Check the user details and temporary password.',
				success: false as const
			});
		}

		try {
			await createPlatformUser(supabase, actor, {
				...parsed.data,
				role: actor.profile.role === 'platform_admin' ? parsed.data.role : 'platform_op'
			});
			return {
				success: true as const,
				action: 'createUser',
				message: 'Platform user created with temporary password.'
			};
		} catch (err) {
			return fail(500, {
				action: 'createUser',
				message: err instanceof Error ? err.message : 'Unable to create user',
				success: false as const
			});
		}
	},

	updateUser: async ({ request, locals: { supabase, safeGetSession } }) => {
		const actor = await requireActor(supabase, safeGetSession);
		const parsed = updatePlatformUserSchema.safeParse(Object.fromEntries(await request.formData()));

		if (!parsed.success) {
			return fail(400, {
				action: 'updateUser',
				message: 'Invalid user update.',
				success: false as const
			});
		}

		try {
			await updatePlatformUser(supabase, actor, parsed.data);
			return {
				success: true as const,
				action: 'updateUser',
				message: 'Platform user updated.'
			};
		} catch (err) {
			return fail(400, {
				action: 'updateUser',
				message: err instanceof Error ? err.message : 'Unable to update user',
				success: false as const
			});
		}
	}
};
