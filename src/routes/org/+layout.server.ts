import { redirect } from '@sveltejs/kit';
import { getOrganisationAppContext } from '$lib/server/organisation-auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) redirect(303, '/login');

	const context = await getOrganisationAppContext(supabase, user);
	if (!context) redirect(303, '/unauthorized');

	const mustChangePassword = user.user_metadata?.must_change_password === true;
	if (mustChangePassword && url.pathname !== '/org/change-password') {
		redirect(303, '/org/change-password');
	}
	if (!mustChangePassword && url.pathname === '/org/change-password') {
		redirect(303, '/org');
	}

	return { session, user, organisationContext: context };
};
