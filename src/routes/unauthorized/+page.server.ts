import { redirect } from '@sveltejs/kit';
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

	return { email: user?.email ?? null };
};
