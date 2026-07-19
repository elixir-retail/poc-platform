import { redirect } from '@sveltejs/kit';
import { getStoreUser } from '$lib/server/store-auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ locals: { safeGetSession, supabase }, cookies }) => {
		const counterUuid = cookies.get('store_counter_uuid');
		if (counterUuid) {
			const { user } = await safeGetSession();
			const storeUser = await getStoreUser(supabase, user);
			if (storeUser) {
				await supabase
					.from('store_counter')
					.update({
						status: 'offline',
						active_store_user_uuid: null,
						changed_by: user?.id,
						changed_at: new Date().toISOString()
					})
					.eq('store_counter_uuid', counterUuid)
					.eq('active_store_user_uuid', storeUser.store_user_uuid);
			}
			cookies.delete('store_counter_uuid', { path: '/' });
		}

		const { error } = await supabase.auth.signOut({ scope: 'global' });
		if (error) {
			await supabase.auth.signOut({ scope: 'local' });
		}
		for (const cookie of cookies.getAll()) {
			if (cookie.name.includes('-auth-token')) {
				cookies.delete(cookie.name, { path: '/' });
			}
		}
		redirect(303, '/login');
	}
};
