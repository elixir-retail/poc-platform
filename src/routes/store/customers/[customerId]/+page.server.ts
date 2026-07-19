import { error, fail, redirect } from '@sveltejs/kit';
import { updateStoreCustomerSchema } from '$lib/schemas/customers';
import {
	deleteStoreCustomer,
	getStoreCustomer,
	listCustomerPurchases,
	updateStoreCustomer
} from '$lib/server/customers';
import { getStoreAppContext } from '$lib/server/store-auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, params, locals: { supabase } }) => {
	const { storeContext } = await parent();

	try {
		const customer = await getStoreCustomer(supabase, storeContext, params.customerId);
		if (!customer) error(404, 'Customer not found');
		const purchases = await listCustomerPurchases(supabase, storeContext, customer.store_customer_uuid);
		return {
			customer,
			purchases,
			canManage: storeContext.membership.role === 'root'
		};
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		error(500, 'Unable to load customer');
	}
};

export const actions: Actions = {
	updateCustomer: async ({ request, params, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');
		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const parsed = updateStoreCustomerSchema.safeParse({
			store_customer_uuid: params.customerId,
			full_name: String(formData.get('full_name') ?? ''),
			phone: String(formData.get('phone') ?? ''),
			email: String(formData.get('email') ?? ''),
			address_line1: String(formData.get('address_line1') ?? ''),
			address_line2: String(formData.get('address_line2') ?? ''),
			city: String(formData.get('city') ?? ''),
			state: String(formData.get('state') ?? ''),
			postal_code: String(formData.get('postal_code') ?? ''),
			country: String(formData.get('country') ?? ''),
			notes: String(formData.get('notes') ?? ''),
			status: String(formData.get('status') ?? 'active')
		});
		if (!parsed.success) {
			return fail(400, {
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check customer details.'
			});
		}

		try {
			await updateStoreCustomer(supabase, user, context, parsed.data);
			return { success: true as const, message: 'Customer updated.' };
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to update customer'
			});
		}
	},

	deleteCustomer: async ({ params, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');
		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		try {
			await deleteStoreCustomer(supabase, user, context, params.customerId);
			redirect(303, '/store/customers');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err) throw err;
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to delete customer'
			});
		}
	}
};
