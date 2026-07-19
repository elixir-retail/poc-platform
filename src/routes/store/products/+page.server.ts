import { error, fail, redirect } from '@sveltejs/kit';
import { createProductSchema } from '$lib/schemas/products';
import { getStoreAppContext } from '$lib/server/store-auth';
import { createStoreProduct, listStoreProducts } from '$lib/server/products';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { storeContext } = await parent();
	if (storeContext.store.business_mode === 'service') {
		redirect(303, '/store');
	}

	try {
		return { products: await listStoreProducts(supabase, storeContext) };
	} catch {
		error(500, 'Unable to load products');
	}
};

export const actions: Actions = {
	createProduct: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');

		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const parsed = createProductSchema.safeParse({
			sku: String(formData.get('sku') ?? ''),
			name: String(formData.get('name') ?? ''),
			description: String(formData.get('description') ?? ''),
			brand: String(formData.get('brand') ?? ''),
			product_type: String(formData.get('product_type') ?? ''),
			product_category: String(formData.get('product_category') ?? ''),
			price: String(formData.get('price') ?? ''),
			quantity_on_hand: String(formData.get('quantity_on_hand') ?? ''),
			package_number: String(formData.get('package_number') ?? ''),
			gtin: String(formData.get('gtin') ?? ''),
			batch_lot_number: String(formData.get('batch_lot_number') ?? ''),
			manufacturing_date: String(formData.get('manufacturing_date') ?? ''),
			expiry_date: String(formData.get('expiry_date') ?? ''),
			warranty_months: String(formData.get('warranty_months') ?? ''),
			manufacturer_serial_number: String(formData.get('manufacturer_serial_number') ?? ''),
			imei: String(formData.get('imei') ?? ''),
			tracking_number: String(formData.get('tracking_number') ?? '')
		});

		if (!parsed.success) {
			return fail(400, {
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check the product details.'
			});
		}

		try {
			await createStoreProduct(supabase, user, context, parsed.data);
			return {
				success: true as const,
				message: 'Product added to the catalog.'
			};
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to add product'
			});
		}
	}
};
