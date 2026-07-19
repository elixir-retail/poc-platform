import { error, fail, redirect } from '@sveltejs/kit';
import { getStoreAppContext } from '$lib/server/store-auth';
import { linkProductBarcode, listStoreProducts } from '$lib/server/products';
import type { Actions, PageServerLoad } from './$types';

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

export const actions: Actions = {
	linkBarcode: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');

		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const productUuid = String(formData.get('store_product_uuid') ?? '');
		const gtin = String(formData.get('gtin') ?? '').trim();

		if (!productUuid || productUuid === 'custom') {
			return fail(400, { success: false as const, message: 'Choose a product first.' });
		}

		try {
			await linkProductBarcode(supabase, user, context, productUuid, gtin);
			return {
				success: true as const,
				message: 'Barcode linked to product.'
			};
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to link barcode'
			});
		}
	}
};
