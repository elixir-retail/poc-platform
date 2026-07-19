import { error, fail } from '@sveltejs/kit';
import { createStoreCustomerSchema } from '$lib/schemas/customers';
import {
	createStoreCustomer,
	deleteStoreCustomer,
	listStoreCustomers
} from '$lib/server/customers';
import { getStoreAppContext } from '$lib/server/store-auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { storeContext } = await parent();

	try {
		return {
			customers: await listStoreCustomers(supabase, storeContext),
			canManage: storeContext.membership.role === 'root'
		};
	} catch {
		error(500, 'Unable to load customers');
	}
};

export const actions: Actions = {
	createCustomer: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');
		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const parsed = createStoreCustomerSchema.safeParse({
			full_name: String(formData.get('full_name') ?? ''),
			phone: String(formData.get('phone') ?? ''),
			email: String(formData.get('email') ?? ''),
			address_line1: String(formData.get('address_line1') ?? ''),
			address_line2: String(formData.get('address_line2') ?? ''),
			city: String(formData.get('city') ?? ''),
			state: String(formData.get('state') ?? ''),
			postal_code: String(formData.get('postal_code') ?? ''),
			country: String(formData.get('country') ?? ''),
			notes: String(formData.get('notes') ?? '')
		});
		if (!parsed.success) {
			return fail(400, {
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check customer details.'
			});
		}

		try {
			const customer = await createStoreCustomer(supabase, user, context, parsed.data);
			return {
				success: true as const,
				message: 'Customer added.',
				store_customer_uuid: customer.store_customer_uuid
			};
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to add customer'
			});
		}
	},

	deleteCustomer: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');
		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const customerUuid = String(formData.get('store_customer_uuid') ?? '');
		if (!customerUuid) {
			return fail(400, { success: false as const, message: 'Customer not found.' });
		}

		try {
			await deleteStoreCustomer(supabase, user, context, customerUuid);
			return { success: true as const, message: 'Customer deleted.' };
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to delete customer'
			});
		}
	}
};
