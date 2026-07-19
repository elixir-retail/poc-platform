import { error, redirect } from '@sveltejs/kit';
import { listStoreCustomers } from '$lib/server/customers';
import { listPosCatalog } from '$lib/server/pos-billing';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent, locals: { supabase }, depends }) => {
	const { storeContext } = await parent();
	if (storeContext.store.business_mode === 'service') {
		redirect(303, '/store');
	}

	depends('store:billing:catalog');
	depends('store:billing:customers');

	try {
		const [catalog, customers] = await Promise.all([
			listPosCatalog(supabase, storeContext),
			listStoreCustomers(supabase, storeContext)
		]);
		return { catalog, customers };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unable to load billing catalog';
		error(500, message);
	}
};
