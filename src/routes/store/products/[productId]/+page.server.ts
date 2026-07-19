import { error, fail, redirect } from '@sveltejs/kit';
import { createProductSchema } from '$lib/schemas/products';
import { getStoreAppContext } from '$lib/server/store-auth';
import { getStoreProduct, updateStoreProduct } from '$lib/server/products';
import type { Actions, PageServerLoad } from './$types';

function productFormValues(formData: FormData) {
	return {
		sku: String(formData.get('sku') ?? ''),
		name: String(formData.get('name') ?? ''),
		description: String(formData.get('description') ?? ''),
		brand: String(formData.get('brand') ?? ''),
		product_type: String(formData.get('product_type') ?? ''),
		product_category: String(formData.get('product_category') ?? ''),
		price: String(formData.get('price') ?? ''),
		package_number: String(formData.get('package_number') ?? ''),
		gtin: String(formData.get('gtin') ?? ''),
		batch_lot_number: String(formData.get('batch_lot_number') ?? ''),
		manufacturing_date: String(formData.get('manufacturing_date') ?? ''),
		expiry_date: String(formData.get('expiry_date') ?? ''),
		warranty_months: String(formData.get('warranty_months') ?? ''),
		manufacturer_serial_number: String(formData.get('manufacturer_serial_number') ?? ''),
		imei: String(formData.get('imei') ?? ''),
		tracking_number: String(formData.get('tracking_number') ?? '')
	};
}

export const load: PageServerLoad = async ({ params, parent, locals: { supabase } }) => {
	const { storeContext } = await parent();
	if (storeContext.store.business_mode === 'service') {
		redirect(303, '/store');
	}

	try {
		const product = await getStoreProduct(supabase, storeContext, params.productId);
		if (!product) error(404, 'Product not found');
		return { product };
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		error(500, 'Unable to load product');
	}
};

export const actions: Actions = {
	updateProduct: async ({ params, request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');

		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const parsed = createProductSchema.safeParse(productFormValues(formData));
		const status = String(formData.get('status') ?? '');

		if (!parsed.success) {
			return fail(400, {
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check the product details.'
			});
		}
		if (status !== 'active' && status !== 'inactive') {
			return fail(400, {
				success: false as const,
				message: status ? 'Choose a valid product status.' : 'Product status is required.'
			});
		}

		try {
			await updateStoreProduct(supabase, user, context, params.productId, parsed.data, status);
			return { success: true as const, message: 'Product updated.' };
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to update product'
			});
		}
	}
};
