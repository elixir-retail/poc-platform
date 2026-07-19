import type { CreateProductInput } from '$lib/schemas/products';
import type { StoreAppContext, StoreProduct } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const PRODUCT_COLUMNS =
	'store_product_uuid, org_uuid, store_uuid, sku, name, description, brand, product_type, product_category, price_cents, currency_code, package_number, gtin, batch_lot_number, manufacturing_date, expiry_date, warranty_months, manufacturer_serial_number, imei, tracking_number, status, created_at, changed_at';

export async function listStoreProducts(
	supabase: SupabaseClient,
	context: StoreAppContext
): Promise<StoreProduct[]> {
	const { data, error } = await supabase
		.from('store_product')
		.select(PRODUCT_COLUMNS)
		.eq('store_uuid', context.store.store_uuid)
		.order('created_at', { ascending: false });

	if (error) throw new Error(error.message);
	return (data ?? []) as StoreProduct[];
}

export async function getStoreProduct(
	supabase: SupabaseClient,
	context: StoreAppContext,
	productUuid: string
): Promise<StoreProduct | null> {
	const { data, error } = await supabase
		.from('store_product')
		.select(PRODUCT_COLUMNS)
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_product_uuid', productUuid)
		.maybeSingle();

	if (error) throw new Error(error.message);
	return data ? (data as StoreProduct) : null;
}

export async function createStoreProduct(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	input: CreateProductInput
): Promise<StoreProduct> {
	if (context.membership.role !== 'root') {
		throw new Error('Only the store root user can add products.');
	}
	if (context.store.business_mode === 'service') {
		throw new Error('Products are only available to retail and hybrid stores.');
	}

	const now = new Date().toISOString();
	const { data, error } = await supabase
		.from('store_product')
		.insert({
			org_uuid: context.store.org_uuid,
			store_uuid: context.store.store_uuid,
			sku: input.sku,
			name: input.name,
			description: input.description,
			brand: input.brand,
			product_type: input.product_type,
			product_category: input.product_category,
			price_cents: Math.round(input.price * 100),
			currency_code: context.store.currency_code,
			package_number: input.package_number,
			gtin: input.gtin,
			batch_lot_number: input.batch_lot_number,
			manufacturing_date: input.manufacturing_date,
			expiry_date: input.expiry_date,
			warranty_months: input.warranty_months,
			manufacturer_serial_number: input.manufacturer_serial_number,
			imei: input.imei,
			tracking_number: input.tracking_number,
			status: 'active',
			created_by: user.id,
			changed_by: user.id,
			created_at: now,
			changed_at: now
		})
		.select(PRODUCT_COLUMNS)
		.single();

	if (error || !data) {
		if (error?.code === '23505') {
			throw new Error('SKU, GTIN, IMEI, and serial numbers must be unique within the store.');
		}
		throw new Error(error?.message ?? 'Unable to add product');
	}

	const { error: inventoryError } = await supabase.from('store_inventory').insert({
		org_uuid: context.store.org_uuid,
		store_uuid: context.store.store_uuid,
		store_product_uuid: data.store_product_uuid,
		quantity_on_hand: input.quantity_on_hand,
		storage_location: 'Main stockroom',
		last_counted_at: input.quantity_on_hand > 0 ? now : null,
		created_by: user.id,
		changed_by: user.id
	});
	if (inventoryError) {
		throw new Error(`Product created, but inventory setup failed: ${inventoryError.message}`);
	}

	return data as StoreProduct;
}

export async function updateStoreProduct(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	productUuid: string,
	input: CreateProductInput,
	status: StoreProduct['status']
): Promise<StoreProduct> {
	if (context.membership.role !== 'root') {
		throw new Error('Only the store root user can edit products.');
	}
	if (context.store.business_mode === 'service') {
		throw new Error('Products are only available to retail and hybrid stores.');
	}

	const { data, error } = await supabase
		.from('store_product')
		.update({
			sku: input.sku,
			name: input.name,
			description: input.description,
			brand: input.brand,
			product_type: input.product_type,
			product_category: input.product_category,
			price_cents: Math.round(input.price * 100),
			package_number: input.package_number,
			gtin: input.gtin,
			batch_lot_number: input.batch_lot_number,
			manufacturing_date: input.manufacturing_date,
			expiry_date: input.expiry_date,
			warranty_months: input.warranty_months,
			manufacturer_serial_number: input.manufacturer_serial_number,
			imei: input.imei,
			tracking_number: input.tracking_number,
			status,
			changed_by: user.id,
			changed_at: new Date().toISOString()
		})
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_product_uuid', productUuid)
		.select(PRODUCT_COLUMNS)
		.single();

	if (error || !data) {
		if (error?.code === '23505') {
			throw new Error('SKU, GTIN, IMEI, and serial numbers must be unique within the store.');
		}
		throw new Error(error?.message ?? 'Unable to update product');
	}

	return data as StoreProduct;
}
