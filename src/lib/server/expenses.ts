import type { CreateCashIntakeInput, CreateExpenseInput } from '$lib/schemas/expenses';
import { canManageStore } from '$lib/server/store-auth';
import type { StoreAppContext, StoreTransaction } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const TRANSACTION_COLUMNS =
	'store_transaction_uuid, org_uuid, store_uuid, transaction_code, channel, status, occurred_at, currency_code, gross_amount_cents, payment_method, external_reference, direction, entry_type, notes, category, created_at';

function assertCanManageCashbook(context: StoreAppContext) {
	if (!canManageStore(context.membership.role)) {
		throw new Error('Only store admins and managers can manage expenses.');
	}
}

function makeCode(prefix: string) {
	return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
}

async function insertCashbookRow(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	row: {
		transaction_code: string;
		direction: 'in' | 'out';
		entry_type: 'cash_intake' | 'expense';
		gross_amount_cents: number;
		payment_method: string;
		occurred_at: string;
		notes?: string | null;
		category?: string | null;
	}
): Promise<StoreTransaction> {
	const { data, error } = await supabase
		.from('store_transaction')
		.insert({
			org_uuid: context.store.org_uuid,
			store_uuid: context.store.store_uuid,
			transaction_code: row.transaction_code,
			channel: 'offline',
			status: 'completed',
			occurred_at: row.occurred_at,
			currency_code: context.store.currency_code,
			gross_amount_cents: row.gross_amount_cents,
			payment_method: row.payment_method,
			external_reference: null,
			direction: row.direction,
			entry_type: row.entry_type,
			notes: row.notes ?? null,
			category: row.category ?? null,
			created_by: user.id,
			changed_by: user.id
		})
		.select(TRANSACTION_COLUMNS)
		.single();
	if (error || !data) throw new Error(error?.message ?? 'Unable to save transaction');
	return data as StoreTransaction;
}

export async function listCashbookTransactions(
	supabase: SupabaseClient,
	context: StoreAppContext,
	limit = 100
): Promise<StoreTransaction[]> {
	const { data, error } = await supabase
		.from('store_transaction')
		.select(TRANSACTION_COLUMNS)
		.eq('store_uuid', context.store.store_uuid)
		.in('entry_type', ['cash_intake', 'expense'])
		.order('occurred_at', { ascending: false })
		.limit(limit);
	if (error) throw new Error(error.message);
	return (data ?? []) as StoreTransaction[];
}

export async function createExpenseTransaction(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	input: CreateExpenseInput
): Promise<StoreTransaction> {
	assertCanManageCashbook(context);
	return insertCashbookRow(supabase, user, context, {
		transaction_code: makeCode('EXP'),
		direction: 'out',
		entry_type: 'expense',
		gross_amount_cents: input.amount,
		payment_method: input.payment_method,
		occurred_at: input.occurred_at,
		notes: input.notes,
		category: input.category
	});
}

export async function createCashIntakeTransaction(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	input: CreateCashIntakeInput
): Promise<StoreTransaction> {
	assertCanManageCashbook(context);
	const noteParts = [input.customer_name ? `Customer: ${input.customer_name}` : null, input.notes]
		.filter(Boolean)
		.join(' · ');
	return insertCashbookRow(supabase, user, context, {
		transaction_code: makeCode('CASH'),
		direction: 'in',
		entry_type: 'cash_intake',
		gross_amount_cents: input.amount,
		payment_method: 'cash',
		occurred_at: input.occurred_at,
		notes: noteParts || null
	});
}
