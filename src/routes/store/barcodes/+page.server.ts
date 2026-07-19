import { error, redirect } from '@sveltejs/kit';
import { listStoreProducts } from '$lib/server/products';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { storeContext } = await parent();
	if (storeContext.store.business_mode === 'service') {
		redirect(303, '/store');
	}

	try {
		return {
			products: await listStoreProducts(supabase, storeContext)
		};
	} catch {
		error(500, 'Unable to load products for barcode labels');
	}
};
