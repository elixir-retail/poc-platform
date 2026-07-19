import type { CreateStoreCustomerInput, UpdateStoreCustomerInput } from '$lib/schemas/customers';
import { canManageStore, canManageStoreUsers } from '$lib/server/store-auth';
import type { StoreAppContext, StoreBill, StoreCustomer } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

const CUSTOMER_COLUMNS =
	'store_customer_uuid, org_uuid, store_uuid, full_name, phone, email, address_line1, address_line2, city, state, postal_code, country, notes, status, created_at, changed_at';

function assertCanManageCustomers(context: StoreAppContext) {
	if (!canManageStore(context.membership.role)) {
		throw new Error('Only store admins and managers can manage customers.');
	}
}

function assertCanDeleteCustomers(context: StoreAppContext) {
	if (!canManageStoreUsers(context.membership.role)) {
		throw new Error('Only the store admin can delete customers.');
	}
}

export async function listStoreCustomers(
	supabase: SupabaseClient,
	context: StoreAppContext
): Promise<StoreCustomer[]> {
	const { data, error } = await supabase
		.from('store_customer')
		.select(CUSTOMER_COLUMNS)
		.eq('store_uuid', context.store.store_uuid)
		.order('full_name');
	if (error) throw new Error(error.message);
	return (data ?? []) as StoreCustomer[];
}

export async function searchStoreCustomers(
	supabase: SupabaseClient,
	context: StoreAppContext,
	query: string,
	limit = 12
): Promise<StoreCustomer[]> {
	const trimmed = query.trim();
	if (!trimmed) {
		const { data, error } = await supabase
			.from('store_customer')
			.select(CUSTOMER_COLUMNS)
			.eq('store_uuid', context.store.store_uuid)
			.eq('status', 'active')
			.order('changed_at', { ascending: false })
			.limit(limit);
		if (error) throw new Error(error.message);
		return (data ?? []) as StoreCustomer[];
	}

	const pattern = `%${trimmed.replace(/[%_]/g, '\\$&')}%`;
	const { data, error } = await supabase
		.from('store_customer')
		.select(CUSTOMER_COLUMNS)
		.eq('store_uuid', context.store.store_uuid)
		.eq('status', 'active')
		.or(`phone.ilike.${pattern},full_name.ilike.${pattern},email.ilike.${pattern}`)
		.order('full_name')
		.limit(limit);
	if (error) throw new Error(error.message);
	return (data ?? []) as StoreCustomer[];
}

export async function getStoreCustomer(
	supabase: SupabaseClient,
	context: StoreAppContext,
	customerUuid: string
): Promise<StoreCustomer | null> {
	const { data, error } = await supabase
		.from('store_customer')
		.select(CUSTOMER_COLUMNS)
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_customer_uuid', customerUuid)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as StoreCustomer | null) ?? null;
}

export async function createStoreCustomer(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	input: CreateStoreCustomerInput
): Promise<StoreCustomer> {
	assertCanManageCustomers(context);
	const now = new Date().toISOString();
	const { data, error } = await supabase
		.from('store_customer')
		.insert({
			org_uuid: context.store.org_uuid,
			store_uuid: context.store.store_uuid,
			full_name: input.full_name,
			phone: input.phone,
			email: input.email,
			address_line1: input.address_line1,
			address_line2: input.address_line2,
			city: input.city,
			state: input.state,
			postal_code: input.postal_code,
			country: input.country,
			notes: input.notes,
			status: 'active',
			created_by: user.id,
			changed_by: user.id,
			created_at: now,
			changed_at: now
		})
		.select(CUSTOMER_COLUMNS)
		.single();

	if (error || !data) {
		if (error?.code === '23505') {
			throw new Error('A customer with this phone number already exists.');
		}
		throw new Error(error?.message ?? 'Unable to create customer');
	}

	return data as StoreCustomer;
}

export async function updateStoreCustomer(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	input: UpdateStoreCustomerInput
): Promise<StoreCustomer> {
	assertCanManageCustomers(context);
	const { data, error } = await supabase
		.from('store_customer')
		.update({
			full_name: input.full_name,
			phone: input.phone,
			email: input.email,
			address_line1: input.address_line1,
			address_line2: input.address_line2,
			city: input.city,
			state: input.state,
			postal_code: input.postal_code,
			country: input.country,
			notes: input.notes,
			status: input.status,
			changed_by: user.id,
			changed_at: new Date().toISOString()
		})
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_customer_uuid', input.store_customer_uuid)
		.select(CUSTOMER_COLUMNS)
		.single();

	if (error || !data) {
		if (error?.code === '23505') {
			throw new Error('A customer with this phone number already exists.');
		}
		throw new Error(error?.message ?? 'Unable to update customer');
	}

	return data as StoreCustomer;
}

export async function listCustomerPurchases(
	supabase: SupabaseClient,
	context: StoreAppContext,
	customerUuid: string
): Promise<StoreBill[]> {
	const { data: bills, error } = await supabase
		.from('store_bill')
		.select(
			'store_bill_uuid, org_uuid, store_uuid, store_counter_uuid, store_customer_uuid, bill_number, status, customer_name, customer_phone, currency_code, notes, completed_at, created_at, changed_at'
		)
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_customer_uuid', customerUuid)
		.eq('status', 'completed')
		.order('completed_at', { ascending: false });
	if (error) throw new Error(error.message);
	if (!bills?.length) return [];

	const billUuids = bills.map((bill) => bill.store_bill_uuid);
	const [linesResult, paymentsResult] = await Promise.all([
		supabase
			.from('store_bill_line')
			.select(
				'store_bill_line_uuid, org_uuid, store_uuid, store_bill_uuid, store_product_uuid, sku, product_name, unit_price_cents, quantity, line_total_cents, created_at, changed_at'
			)
			.in('store_bill_uuid', billUuids)
			.order('created_at'),
		supabase
			.from('store_bill_payment')
			.select(
				'store_bill_payment_uuid, org_uuid, store_uuid, store_bill_uuid, payment_method, amount_cents, reference, created_at, changed_at'
			)
			.in('store_bill_uuid', billUuids)
			.order('created_at')
	]);
	if (linesResult.error) throw new Error(linesResult.error.message);
	if (paymentsResult.error) throw new Error(paymentsResult.error.message);

	const linesByBill = new Map<string, StoreBill['lines']>();
	for (const line of linesResult.data ?? []) {
		const current = linesByBill.get(line.store_bill_uuid) ?? [];
		current.push(line as StoreBill['lines'][number]);
		linesByBill.set(line.store_bill_uuid, current);
	}
	const paymentsByBill = new Map<string, StoreBill['payments']>();
	for (const payment of paymentsResult.data ?? []) {
		const current = paymentsByBill.get(payment.store_bill_uuid) ?? [];
		current.push(payment as StoreBill['payments'][number]);
		paymentsByBill.set(payment.store_bill_uuid, current);
	}

	return bills.map((bill) => ({
		...(bill as Omit<StoreBill, 'lines' | 'payments'>),
		lines: linesByBill.get(bill.store_bill_uuid) ?? [],
		payments: paymentsByBill.get(bill.store_bill_uuid) ?? []
	}));
}

export async function deleteStoreCustomer(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	customerUuid: string
): Promise<void> {
	assertCanDeleteCustomers(context);
	const { data, error } = await supabase
		.from('store_customer')
		.delete()
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_customer_uuid', customerUuid)
		.select('store_customer_uuid')
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) throw new Error('Customer not found.');
	void user;
}
