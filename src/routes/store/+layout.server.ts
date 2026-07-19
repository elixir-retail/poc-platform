import { redirect } from '@sveltejs/kit';
import { getStoreAppContext } from '$lib/server/store-auth';
import type { StoreCounter } from '$lib/types/platform';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({
	url,
	cookies,
	locals: { safeGetSession, supabase }
}) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) redirect(303, '/login');

	const context = await getStoreAppContext(supabase, user);
	if (!context) redirect(303, '/unauthorized');

	const mustChangePassword = user.user_metadata?.must_change_password === true;
	if (mustChangePassword && url.pathname !== '/store/change-password') {
		redirect(303, '/store/change-password');
	}
	if (!mustChangePassword && url.pathname === '/store/change-password') {
		redirect(303, '/store');
	}

	const { data: counterRows, error: counterError } = await supabase
		.from('store_counter')
		.select(
			'store_counter_uuid, org_uuid, store_uuid, counter_code, name, status, active_store_user_uuid, last_seen_at, created_at, changed_at'
		)
		.eq('store_uuid', context.store.store_uuid)
		.order('counter_code');
	if (counterError) redirect(303, '/unauthorized');

	const counters = (counterRows ?? []) as StoreCounter[];
	const selectedCounterUuid = cookies.get('store_counter_uuid');
	const activeCounter =
		counters.find(
			(counter) =>
				counter.store_counter_uuid === selectedCounterUuid &&
				counter.active_store_user_uuid === context.membership.store_user_uuid
		) ?? null;

	if (!mustChangePassword && url.pathname !== '/store/select-counter' && !activeCounter) {
		redirect(303, '/store/select-counter');
	}
	if (activeCounter && url.pathname === '/store/select-counter') {
		redirect(303, '/store');
	}

	return { session, user, storeContext: context, counters, activeCounter };
};
