import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions } from './$types';

const passwordSchema = z
	.object({
		password: z
			.string()
			.min(8)
			.max(72)
			.regex(/[A-Za-z]/, 'Password must include a letter')
			.regex(/[0-9]/, 'Password must include a number'),
		confirm_password: z.string()
	})
	.refine((data) => data.password === data.confirm_password, {
		path: ['confirm_password'],
		message: 'Passwords do not match'
	});

export const actions: Actions = {
	default: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) redirect(303, '/login');

		const parsed = passwordSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, {
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check the new password.'
			});
		}

		const { error } = await supabase.auth.updateUser({
			password: parsed.data.password,
			data: { ...user.user_metadata, must_change_password: false }
		});

		if (error) {
			return fail(400, { success: false as const, message: error.message });
		}

		redirect(303, '/org');
	}
};
