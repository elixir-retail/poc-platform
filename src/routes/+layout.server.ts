import { getPlatformProfile } from '$lib/server/platform-auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	locals: { safeGetSession, supabase, locale },
	cookies
}) => {
	const { session, user } = await safeGetSession();
	const profile = await getPlatformProfile(supabase, user);

	return {
		session,
		user,
		profile,
		locale,
		cookies: cookies.getAll()
	};
};
