import { fail } from '@sveltejs/kit';
import { getPlatformProfile } from '$lib/server/platform-auth';
import type { PlatformNotification } from '$lib/types/platform';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	const profile = await getPlatformProfile(supabase, user);
	if (!profile) return { notifications: [] as PlatformNotification[] };

	const { data } = await supabase
		.from('notification')
		.select('notification_uuid, notification_type, title, body, link_path, read_at, created_at')
		.eq('recipient_profile_uuid', profile.profile_uuid)
		.order('created_at', { ascending: false });

	return { notifications: (data ?? []) as PlatformNotification[] };
};

export const actions: Actions = {
	markRead: async ({ request, locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		const profile = await getPlatformProfile(supabase, user);
		if (!profile) return fail(403, { message: 'Platform access required.' });

		const formData = await request.formData();
		const notificationUuid = String(formData.get('notification_uuid') ?? '');
		if (!notificationUuid) return fail(400, { message: 'Notification is required.' });

		const { error } = await supabase
			.from('notification')
			.update({
				read_at: new Date().toISOString(),
				changed_by: user?.id,
				changed_at: new Date().toISOString()
			})
			.eq('notification_uuid', notificationUuid)
			.eq('recipient_profile_uuid', profile.profile_uuid);

		if (error) return fail(500, { message: error.message });
		return { success: true };
	},

	markAllRead: async ({ locals: { supabase, safeGetSession } }) => {
		const { user } = await safeGetSession();
		const profile = await getPlatformProfile(supabase, user);
		if (!profile) return fail(403, { message: 'Platform access required.' });

		const now = new Date().toISOString();
		const { error } = await supabase
			.from('notification')
			.update({ read_at: now, changed_by: user?.id, changed_at: now })
			.eq('recipient_profile_uuid', profile.profile_uuid)
			.is('read_at', null);

		if (error) return fail(500, { message: error.message });
		return { success: true };
	}
};
