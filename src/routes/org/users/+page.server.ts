import { error, fail } from '@sveltejs/kit';
import { createOrganisationUserSchema } from '$lib/schemas/organisation-users';
import { getOrganisationAppContext } from '$lib/server/organisation-auth';
import { createOrganisationUser } from '$lib/server/organisation-users';
import type { OrganisationUser } from '$lib/types/platform';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { organisationContext } = await parent();
	const { data, error: queryError } = await supabase
		.from('organisation_user')
		.select(
			'organisation_user_uuid, org_uuid, user_uuid, email, display_name, role, is_active, created_at, changed_at'
		)
		.eq('org_uuid', organisationContext.organisation.organisation_uuid)
		.order('created_at', { ascending: true });

	if (queryError) error(500, 'Unable to load organisation users');
	return { users: (data ?? []) as OrganisationUser[] };
};

export const actions: Actions = {
	createUser: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');

		const context = await getOrganisationAppContext(supabase, user);
		if (!context) error(403, 'Organisation access required');

		const parsed = createOrganisationUserSchema.safeParse(
			Object.fromEntries(await request.formData())
		);
		if (!parsed.success) {
			return fail(400, {
				action: 'createUser',
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check the user details.'
			});
		}

		try {
			await createOrganisationUser(supabase, user, context, parsed.data);
			return {
				action: 'createUser',
				success: true as const,
				message: 'Organisation user created.'
			};
		} catch (err) {
			return fail(400, {
				action: 'createUser',
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to create user'
			});
		}
	}
};
