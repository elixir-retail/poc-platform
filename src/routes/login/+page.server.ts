import { fail, redirect } from '@sveltejs/kit';
import { loginSchema } from '$lib/schemas/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (session) {
		redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	login: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const parsed = loginSchema.safeParse({
			email: formData.get('email'),
			password: formData.get('password')
		});

		if (!parsed.success) {
			return fail(400, {
				email: String(formData.get('email') ?? ''),
				error: parsed.error.issues[0]?.message ?? 'Invalid credentials'
			});
		}

		const { error } = await supabase.auth.signInWithPassword(parsed.data);

		if (error) {
			return fail(400, {
				email: parsed.data.email,
				error: error.message
			});
		}

		redirect(303, '/');
	}
};
