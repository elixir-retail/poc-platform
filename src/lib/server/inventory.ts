import type { UpdateInventoryInput } from '$lib/schemas/inventory';
import type { StoreAppContext, StoreInventory } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const INVENTORY_COLUMNS =
	'store_inventory_uuid, org_uuid, store_uuid, store_product_uuid, quantity_on_hand, storage_location, last_counted_at, created_at, changed_at, product:store_product!inner(store_product_uuid, sku, name, brand, product_category, product_type, status)';

export async function listStoreInventory(
	supabase: SupabaseClient,
	context: StoreAppContext
): Promise<StoreInventory[]> {
	const { data, error } = await supabase
		.from('store_inventory')
		.select(INVENTORY_COLUMNS)
		.eq('store_uuid', context.store.store_uuid)
		.order('quantity_on_hand', { ascending: true });

	if (error) throw new Error(error.message);
	return (data ?? []) as unknown as StoreInventory[];
}

export async function updateStoreInventory(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	input: UpdateInventoryInput
): Promise<void> {
	if (context.membership.role !== 'root') {
		throw new Error('Only the store root user can update inventory.');
	}

	const now = new Date().toISOString();
	const { data, error } = await supabase
		.from('store_inventory')
		.update({
			quantity_on_hand: input.quantity_on_hand,
			storage_location: input.storage_location,
			last_counted_at: now,
			changed_by: user.id,
			changed_at: now
		})
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_inventory_uuid', input.store_inventory_uuid)
		.select('store_inventory_uuid')
		.maybeSingle();

	if (error) throw new Error(error.message);
	if (!data) throw new Error('Inventory entry not found.');
}
