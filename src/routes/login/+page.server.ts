import { fail, redirect } from '@sveltejs/kit';
import { loginSchema, toLoginErrorCode } from '$lib/schemas/auth';
import { resolveAuthenticatedDestination } from '$lib/server/organisation-auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession, supabase } }) => {
	const { session, user } = await safeGetSession();
	if (session) {
		redirect(303, await resolveAuthenticatedDestination(supabase, user));
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
				errorCode: toLoginErrorCode(parsed.error.issues[0]?.message)
			});
		}

		const { error } = await supabase.auth.signInWithPassword(parsed.data);

		if (error) {
			return fail(400, {
				email: parsed.data.email,
				errorCode: 'invalidCredentials' as const
			});
		}

		const {
			data: { user }
		} = await supabase.auth.getUser();
		if (!user) {
			return fail(400, {
				email: parsed.data.email,
				errorCode: 'generic' as const
			});
		}

		redirect(303, await resolveAuthenticatedDestination(supabase, user));
	}
};
