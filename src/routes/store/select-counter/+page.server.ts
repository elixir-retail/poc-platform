import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { getStoreAppContext } from '$lib/server/store-auth';
import type { Actions } from './$types';

const selectCounterSchema = z.object({
	store_counter_uuid: z.uuid()
});

export const actions: Actions = {
	default: async ({ request, cookies, url, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) redirect(303, '/login');

		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const parsed = selectCounterSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, { success: false as const, message: 'Choose a counter.' });
		}

		const { data: counter, error: counterError } = await supabase
			.from('store_counter')
			.select('store_counter_uuid, status, active_store_user_uuid')
			.eq('store_counter_uuid', parsed.data.store_counter_uuid)
			.eq('store_uuid', context.store.store_uuid)
			.maybeSingle();
		if (counterError) return fail(400, { success: false as const, message: counterError.message });
		if (!counter) return fail(400, { success: false as const, message: 'Counter not found.' });
		if (
			counter.status === 'online' &&
			counter.active_store_user_uuid !== context.membership.store_user_uuid
		) {
			return fail(409, {
				success: false as const,
				message: 'This counter is already being used by another user.'
			});
		}

		const now = new Date().toISOString();
		const { error: releaseError } = await supabase
			.from('store_counter')
			.update({
				status: 'offline',
				active_store_user_uuid: null,
				changed_by: user.id,
				changed_at: now
			})
			.eq('store_uuid', context.store.store_uuid)
			.eq('active_store_user_uuid', context.membership.store_user_uuid)
			.neq('store_counter_uuid', counter.store_counter_uuid);
		if (releaseError) {
			return fail(400, { success: false as const, message: releaseError.message });
		}

		const { error: updateError } = await supabase
			.from('store_counter')
			.update({
				status: 'online',
				active_store_user_uuid: context.membership.store_user_uuid,
				last_seen_at: now,
				changed_by: user.id,
				changed_at: now
			})
			.eq('store_counter_uuid', counter.store_counter_uuid);
		if (updateError) return fail(400, { success: false as const, message: updateError.message });

		cookies.set('store_counter_uuid', counter.store_counter_uuid, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 12
		});

		redirect(303, '/store');
	}
};
