import { redirect } from '@sveltejs/kit';
import { getOrganisationUser } from '$lib/server/organisation-auth';
import { getPlatformProfile } from '$lib/server/platform-auth';
import type { PlatformNotification } from '$lib/types/platform';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession();

	if (!session) {
		redirect(303, '/login');
	}

	const profile = await getPlatformProfile(supabase, user);

	if (!profile) {
		const organisationUser = await getOrganisationUser(supabase, user);
		if (organisationUser) {
			redirect(
				303,
				user?.user_metadata?.must_change_password ? '/org/change-password' : '/org'
			);
		}
		redirect(303, '/unauthorized');
	}

	const { data: notifications } = await supabase
		.from('notification')
		.select('notification_uuid, notification_type, title, body, link_path, read_at, created_at')
		.eq('recipient_profile_uuid', profile.profile_uuid)
		.order('created_at', { ascending: false })
		.limit(8);

	return {
		session,
		user,
		profile,
		notifications: (notifications ?? []) as PlatformNotification[]
	};
};
