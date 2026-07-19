import { redirect } from '@sveltejs/kit';
import { getOrganisationUser } from '$lib/server/organisation-auth';
import { getPlatformProfile } from '$lib/server/platform-auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession();

	if (!session) {
		redirect(303, '/login');
	}

	const profile = await getPlatformProfile(supabase, user);
	if (profile) {
		redirect(303, '/onboarding');
	}

	const organisationUser = await getOrganisationUser(supabase, user);
	if (organisationUser) {
		redirect(303, user?.user_metadata?.must_change_password ? '/org/change-password' : '/org');
	}

	return { email: user?.email ?? null };
};
