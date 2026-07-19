import { error, fail, redirect } from '@sveltejs/kit';
import { updateInventorySchema } from '$lib/schemas/inventory';
import { listStoreInventory, updateStoreInventory } from '$lib/server/inventory';
import { getStoreAppContext } from '$lib/server/store-auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { storeContext } = await parent();
	if (storeContext.store.business_mode === 'service') {
		redirect(303, '/store');
	}

	try {
		return { inventory: await listStoreInventory(supabase, storeContext) };
	} catch {
		error(500, 'Unable to load inventory');
	}
};

export const actions: Actions = {
	updateInventory: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');

		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const parsed = updateInventorySchema.safeParse({
			store_inventory_uuid: formData.get('store_inventory_uuid'),
			quantity_on_hand: formData.get('quantity_on_hand'),
			storage_location: String(formData.get('storage_location') ?? '')
		});

		if (!parsed.success) {
			return fail(400, {
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check the inventory details.'
			});
		}

		try {
			await updateStoreInventory(supabase, user, context, parsed.data);
			return { success: true as const, message: 'Inventory updated.' };
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to update inventory'
			});
		}
	}
};
