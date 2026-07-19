import { error, fail } from '@sveltejs/kit';
import { createCashIntakeSchema, createExpenseSchema } from '$lib/schemas/expenses';
import {
	createCashIntakeTransaction,
	createExpenseTransaction,
	listCashbookTransactions
} from '$lib/server/expenses';
import { canManageStore, getStoreAppContext } from '$lib/server/store-auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { storeContext } = await parent();
	try {
		return {
			entries: await listCashbookTransactions(supabase, storeContext),
			canManage: canManageStore(storeContext.membership.role),
			currencyCode: storeContext.store.currency_code
		};
	} catch {
		error(500, 'Unable to load expenses');
	}
};

export const actions: Actions = {
	addExpense: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');
		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const parsed = createExpenseSchema.safeParse({
			amount: String(formData.get('amount') ?? ''),
			category: String(formData.get('category') ?? ''),
			payment_method: String(formData.get('payment_method') ?? ''),
			notes: String(formData.get('notes') ?? ''),
			occurred_at: String(formData.get('occurred_at') ?? '')
		});
		if (!parsed.success) {
			return fail(400, {
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check expense details.'
			});
		}

		try {
			await createExpenseTransaction(supabase, user, context, parsed.data);
			return { success: true as const, message: 'Expense recorded.' };
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to record expense'
			});
		}
	},

	addCashIntake: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');
		const context = await getStoreAppContext(supabase, user);
		if (!context) error(403, 'Store access required');

		const formData = await request.formData();
		const parsed = createCashIntakeSchema.safeParse({
			amount: String(formData.get('amount') ?? ''),
			customer_name: String(formData.get('customer_name') ?? ''),
			notes: String(formData.get('notes') ?? ''),
			occurred_at: String(formData.get('occurred_at') ?? '')
		});
		if (!parsed.success) {
			return fail(400, {
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check cash intake details.'
			});
		}

		try {
			await createCashIntakeTransaction(supabase, user, context, parsed.data);
			return { success: true as const, message: 'Cash intake recorded.' };
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to record cash intake'
			});
		}
	}
};
