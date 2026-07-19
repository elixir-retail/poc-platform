import { redirect } from '@sveltejs/kit';
import { getStoreAppContext } from '$lib/server/store-auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) redirect(303, '/login');

	const context = await getStoreAppContext(supabase, user);
	if (!context) redirect(303, '/unauthorized');

	const mustChangePassword = user.user_metadata?.must_change_password === true;
	if (mustChangePassword && url.pathname !== '/store/change-password') {
		redirect(303, '/store/change-password');
	}
	if (!mustChangePassword && url.pathname === '/store/change-password') {
		redirect(303, '/store');
	}

	return { session, user, storeContext: context };
};
