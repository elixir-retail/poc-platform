import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ locals: { supabase }, cookies }) => {
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
