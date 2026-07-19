import type {
	PosCatalogProduct,
	StoreAppContext,
	StoreBill,
	StoreBillLine,
	StoreBillPayment,
	StoreBillPaymentMethod
} from '$lib/types/platform';
import { billTotals } from '$lib/pos';
import { canManageStore } from '$lib/server/store-auth';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export { billTotals };

const BILL_COLUMNS =
	'store_bill_uuid, org_uuid, store_uuid, store_counter_uuid, store_customer_uuid, bill_number, status, customer_name, customer_phone, currency_code, notes, completed_at, created_at, changed_at';
const LINE_COLUMNS =
	'store_bill_line_uuid, org_uuid, store_uuid, store_bill_uuid, store_product_uuid, sku, product_name, unit_price_cents, quantity, line_total_cents, created_at, changed_at';
const PAYMENT_COLUMNS =
	'store_bill_payment_uuid, org_uuid, store_uuid, store_bill_uuid, payment_method, amount_cents, reference, created_at, changed_at';

function assertCanManageBilling(context: StoreAppContext) {
	if (!canManageStore(context.membership.role)) {
		throw new Error('Only store admins and managers can manage billing.');
	}
}

export async function listPosCatalog(
	supabase: SupabaseClient,
	context: StoreAppContext
): Promise<PosCatalogProduct[]> {
	const [{ data: products, error: productError }, { data: inventory, error: inventoryError }] =
		await Promise.all([
			supabase
				.from('store_product')
				.select('store_product_uuid, sku, name, brand, gtin, price_cents, currency_code, status')
				.eq('store_uuid', context.store.store_uuid)
				.eq('status', 'active')
				.order('name'),
			supabase
				.from('store_inventory')
				.select('store_product_uuid, quantity_on_hand')
				.eq('store_uuid', context.store.store_uuid)
		]);

	if (productError) throw new Error(productError.message);
	if (inventoryError) throw new Error(inventoryError.message);

	const stockByProduct = new Map(
		(inventory ?? []).map((row) => [
			row.store_product_uuid as string,
			row.quantity_on_hand as number
		])
	);

	return (products ?? []).map((product) => ({
		...(product as Omit<PosCatalogProduct, 'quantity_on_hand'>),
		quantity_on_hand: stockByProduct.get(product.store_product_uuid) ?? 0
	}));
}

async function loadBillBundle(
	supabase: SupabaseClient,
	context: StoreAppContext,
	billUuid: string
): Promise<StoreBill | null> {
	const { data: bill, error } = await supabase
		.from('store_bill')
		.select(BILL_COLUMNS)
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_bill_uuid', billUuid)
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!bill) return null;

	const [linesResult, paymentsResult] = await Promise.all([
		supabase
			.from('store_bill_line')
			.select(LINE_COLUMNS)
			.eq('store_bill_uuid', billUuid)
			.order('created_at'),
		supabase
			.from('store_bill_payment')
			.select(PAYMENT_COLUMNS)
			.eq('store_bill_uuid', billUuid)
			.order('created_at')
	]);
	if (linesResult.error) throw new Error(linesResult.error.message);
	if (paymentsResult.error) throw new Error(paymentsResult.error.message);

	return {
		...(bill as Omit<StoreBill, 'lines' | 'payments'>),
		lines: (linesResult.data ?? []) as StoreBillLine[],
		payments: (paymentsResult.data ?? []) as StoreBillPayment[]
	};
}

export async function listOpenStoreBills(
	supabase: SupabaseClient,
	context: StoreAppContext
): Promise<StoreBill[]> {
	const { data: bills, error } = await supabase
		.from('store_bill')
		.select(BILL_COLUMNS)
		.eq('store_uuid', context.store.store_uuid)
		.in('status', ['open', 'held'])
		.order('bill_number', { ascending: true });
	if (error) throw new Error(error.message);
	if (!bills?.length) return [];

	const billUuids = bills.map((bill) => bill.store_bill_uuid);
	const [linesResult, paymentsResult] = await Promise.all([
		supabase
			.from('store_bill_line')
			.select(LINE_COLUMNS)
			.in('store_bill_uuid', billUuids)
			.order('created_at'),
		supabase
			.from('store_bill_payment')
			.select(PAYMENT_COLUMNS)
			.in('store_bill_uuid', billUuids)
			.order('created_at')
	]);
	if (linesResult.error) throw new Error(linesResult.error.message);
	if (paymentsResult.error) throw new Error(paymentsResult.error.message);

	const linesByBill = new Map<string, StoreBillLine[]>();
	for (const line of (linesResult.data ?? []) as StoreBillLine[]) {
		const current = linesByBill.get(line.store_bill_uuid) ?? [];
		current.push(line);
		linesByBill.set(line.store_bill_uuid, current);
	}
	const paymentsByBill = new Map<string, StoreBillPayment[]>();
	for (const payment of (paymentsResult.data ?? []) as StoreBillPayment[]) {
		const current = paymentsByBill.get(payment.store_bill_uuid) ?? [];
		current.push(payment);
		paymentsByBill.set(payment.store_bill_uuid, current);
	}

	return bills.map((bill) => ({
		...(bill as Omit<StoreBill, 'lines' | 'payments'>),
		lines: linesByBill.get(bill.store_bill_uuid) ?? [],
		payments: paymentsByBill.get(bill.store_bill_uuid) ?? []
	}));
}

export async function createStoreBill(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	input: {
		customer_name: string | null;
		customer_phone: string | null;
		store_customer_uuid?: string | null;
	},
	counterUuid: string | null
): Promise<StoreBill> {
	assertCanManageBilling(context);

	const { data: latest, error: latestError } = await supabase
		.from('store_bill')
		.select('bill_number')
		.eq('store_uuid', context.store.store_uuid)
		.order('bill_number', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (latestError) throw new Error(latestError.message);

	const now = new Date().toISOString();
	const { data, error } = await supabase
		.from('store_bill')
		.insert({
			org_uuid: context.store.org_uuid,
			store_uuid: context.store.store_uuid,
			store_counter_uuid: counterUuid,
			store_customer_uuid: input.store_customer_uuid ?? null,
			bill_number: (latest?.bill_number ?? 0) + 1,
			status: 'open',
			customer_name: input.customer_name,
			customer_phone: input.customer_phone,
			currency_code: context.store.currency_code,
			created_by: user.id,
			changed_by: user.id,
			created_at: now,
			changed_at: now
		})
		.select(BILL_COLUMNS)
		.single();
	if (error || !data) throw new Error(error?.message ?? 'Unable to create bill');

	return { ...(data as Omit<StoreBill, 'lines' | 'payments'>), lines: [], payments: [] };
}

export async function updateStoreBillCustomer(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	billUuid: string,
	input: {
		customer_name: string | null;
		customer_phone: string | null;
		store_customer_uuid?: string | null;
	}
): Promise<void> {
	assertCanManageBilling(context);
	const { data, error } = await supabase
		.from('store_bill')
		.update({
			customer_name: input.customer_name,
			customer_phone: input.customer_phone,
			store_customer_uuid: input.store_customer_uuid ?? null,
			changed_by: user.id,
			changed_at: new Date().toISOString()
		})
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_bill_uuid', billUuid)
		.in('status', ['open', 'held'])
		.select('store_bill_uuid')
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) throw new Error('Open bill not found.');
}

export async function addProductToBill(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	billUuid: string,
	productUuid: string,
	quantity = 1
): Promise<void> {
	assertCanManageBilling(context);

	const [billResult, existingResult, productResult] = await Promise.all([
		supabase
			.from('store_bill')
			.select('store_bill_uuid, status')
			.eq('store_uuid', context.store.store_uuid)
			.eq('store_bill_uuid', billUuid)
			.maybeSingle(),
		supabase
			.from('store_bill_line')
			.select('store_bill_line_uuid, quantity, unit_price_cents')
			.eq('store_bill_uuid', billUuid)
			.eq('store_product_uuid', productUuid)
			.maybeSingle(),
		supabase
			.from('store_product')
			.select('store_product_uuid, sku, name, price_cents, status')
			.eq('store_uuid', context.store.store_uuid)
			.eq('store_product_uuid', productUuid)
			.maybeSingle()
	]);

	if (billResult.error) throw new Error(billResult.error.message);
	if (existingResult.error) throw new Error(existingResult.error.message);
	if (productResult.error) throw new Error(productResult.error.message);

	const bill = billResult.data;
	if (!bill || (bill.status !== 'open' && bill.status !== 'held')) {
		throw new Error('Open bill not found.');
	}

	const product = productResult.data;
	if (!product || product.status !== 'active') throw new Error('Product not found.');

	const now = new Date().toISOString();
	const existing = existingResult.data;

	if (existing) {
		const nextQty = existing.quantity + quantity;
		const { error } = await supabase
			.from('store_bill_line')
			.update({
				quantity: nextQty,
				line_total_cents: existing.unit_price_cents * nextQty,
				changed_by: user.id,
				changed_at: now
			})
			.eq('store_bill_line_uuid', existing.store_bill_line_uuid);
		if (error) throw new Error(error.message);
	} else {
		const { error } = await supabase.from('store_bill_line').insert({
			org_uuid: context.store.org_uuid,
			store_uuid: context.store.store_uuid,
			store_bill_uuid: billUuid,
			store_product_uuid: product.store_product_uuid,
			sku: product.sku,
			product_name: product.name,
			unit_price_cents: product.price_cents,
			quantity,
			line_total_cents: product.price_cents * quantity,
			created_by: user.id,
			changed_by: user.id,
			created_at: now,
			changed_at: now
		});
		if (error) throw new Error(error.message);
	}

	if (bill.status === 'held') {
		const { error } = await supabase
			.from('store_bill')
			.update({ status: 'open', changed_by: user.id, changed_at: now })
			.eq('store_bill_uuid', billUuid);
		if (error) throw new Error(error.message);
	}
}

export async function updateBillLineQuantity(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	lineUuid: string,
	quantity: number
): Promise<void> {
	assertCanManageBilling(context);
	const { data: line, error: lineError } = await supabase
		.from('store_bill_line')
		.select('store_bill_line_uuid, store_bill_uuid, unit_price_cents, store_bill!inner(status)')
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_bill_line_uuid', lineUuid)
		.maybeSingle();
	if (lineError) throw new Error(lineError.message);
	if (!line) throw new Error('Line not found.');
	const billStatus = Array.isArray(line.store_bill)
		? line.store_bill[0]?.status
		: (line.store_bill as { status?: string } | null)?.status;
	if (billStatus !== 'open' && billStatus !== 'held') {
		throw new Error('Only open bills can be edited.');
	}

	const { error } = await supabase
		.from('store_bill_line')
		.update({
			quantity,
			line_total_cents: line.unit_price_cents * quantity,
			changed_by: user.id,
			changed_at: new Date().toISOString()
		})
		.eq('store_bill_line_uuid', lineUuid);
	if (error) throw new Error(error.message);
}

export async function removeBillLine(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	lineUuid: string
): Promise<void> {
	assertCanManageBilling(context);
	const { data: line, error: lineError } = await supabase
		.from('store_bill_line')
		.select('store_bill_line_uuid, store_bill!inner(status)')
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_bill_line_uuid', lineUuid)
		.maybeSingle();
	if (lineError) throw new Error(lineError.message);
	if (!line) throw new Error('Line not found.');
	const billStatus = Array.isArray(line.store_bill)
		? line.store_bill[0]?.status
		: (line.store_bill as { status?: string } | null)?.status;
	if (billStatus !== 'open' && billStatus !== 'held') {
		throw new Error('Only open bills can be edited.');
	}

	const { error } = await supabase
		.from('store_bill_line')
		.delete()
		.eq('store_bill_line_uuid', lineUuid);
	if (error) throw new Error(error.message);
	void user;
}

export async function addBillPayment(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	billUuid: string,
	paymentMethod: StoreBillPaymentMethod,
	amountCents: number,
	reference: string | null
): Promise<void> {
	assertCanManageBilling(context);

	const [billResult, linesResult, paymentsResult] = await Promise.all([
		supabase
			.from('store_bill')
			.select('store_bill_uuid, status')
			.eq('store_uuid', context.store.store_uuid)
			.eq('store_bill_uuid', billUuid)
			.maybeSingle(),
		supabase
			.from('store_bill_line')
			.select('line_total_cents')
			.eq('store_bill_uuid', billUuid),
		supabase
			.from('store_bill_payment')
			.select('amount_cents')
			.eq('store_bill_uuid', billUuid)
	]);

	if (billResult.error) throw new Error(billResult.error.message);
	if (linesResult.error) throw new Error(linesResult.error.message);
	if (paymentsResult.error) throw new Error(paymentsResult.error.message);

	const bill = billResult.data;
	if (!bill || (bill.status !== 'open' && bill.status !== 'held')) {
		throw new Error('Open bill not found.');
	}
	if (!linesResult.data?.length) throw new Error('Add products before taking payment.');

	const totalCents = linesResult.data.reduce((sum, line) => sum + line.line_total_cents, 0);
	const paidCents = (paymentsResult.data ?? []).reduce(
		(sum, payment) => sum + payment.amount_cents,
		0
	);
	const remaining = Math.max(totalCents - paidCents, 0);
	if (remaining <= 0) {
		throw new Error('This bill is already fully paid.');
	}
	if (paymentMethod !== 'cash' && amountCents > remaining) {
		throw new Error('Card, UPI, and voucher payments cannot exceed the pending amount.');
	}

	const { error } = await supabase.from('store_bill_payment').insert({
		org_uuid: context.store.org_uuid,
		store_uuid: context.store.store_uuid,
		store_bill_uuid: billUuid,
		payment_method: paymentMethod,
		amount_cents: amountCents,
		reference,
		created_by: user.id,
		changed_by: user.id
	});
	if (error) throw new Error(error.message);
}

export async function clearBillPayments(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	billUuid: string
): Promise<void> {
	assertCanManageBilling(context);
	const bill = await loadBillBundle(supabase, context, billUuid);
	if (!bill || (bill.status !== 'open' && bill.status !== 'held')) {
		throw new Error('Open bill not found.');
	}
	const { error } = await supabase
		.from('store_bill_payment')
		.delete()
		.eq('store_bill_uuid', billUuid);
	if (error) throw new Error(error.message);
	void user;
}

export async function holdStoreBill(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	billUuid: string
): Promise<void> {
	assertCanManageBilling(context);
	const { data, error } = await supabase
		.from('store_bill')
		.update({
			status: 'held',
			changed_by: user.id,
			changed_at: new Date().toISOString()
		})
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_bill_uuid', billUuid)
		.eq('status', 'open')
		.select('store_bill_uuid')
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) throw new Error('Open bill not found.');
}

export async function resumeStoreBill(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	billUuid: string
): Promise<void> {
	assertCanManageBilling(context);
	const { data, error } = await supabase
		.from('store_bill')
		.update({
			status: 'open',
			changed_by: user.id,
			changed_at: new Date().toISOString()
		})
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_bill_uuid', billUuid)
		.eq('status', 'held')
		.select('store_bill_uuid')
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) throw new Error('Held bill not found.');
}

export async function completeStoreBill(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	billUuid: string
): Promise<StoreBill> {
	assertCanManageBilling(context);
	const bill = await loadBillBundle(supabase, context, billUuid);
	if (!bill || (bill.status !== 'open' && bill.status !== 'held')) {
		throw new Error('Open bill not found.');
	}
	if (bill.lines.length === 0) throw new Error('Add products before charging the bill.');

	const totals = billTotals(bill);
	if (totals.paidCents < totals.totalCents) {
		throw new Error('Collect the pending amount before completing the bill.');
	}

	for (const line of bill.lines) {
		if (!line.store_product_uuid) continue;
		const { data: inventory, error: inventoryError } = await supabase
			.from('store_inventory')
			.select('store_inventory_uuid, quantity_on_hand')
			.eq('store_uuid', context.store.store_uuid)
			.eq('store_product_uuid', line.store_product_uuid)
			.maybeSingle();
		if (inventoryError) throw new Error(inventoryError.message);
		if (!inventory) continue;
		const nextQty = Math.max(inventory.quantity_on_hand - line.quantity, 0);
		const { error: stockError } = await supabase
			.from('store_inventory')
			.update({
				quantity_on_hand: nextQty,
				last_counted_at: new Date().toISOString(),
				changed_by: user.id,
				changed_at: new Date().toISOString()
			})
			.eq('store_inventory_uuid', inventory.store_inventory_uuid);
		if (stockError) throw new Error(stockError.message);
	}

	const now = new Date().toISOString();
	const { error } = await supabase
		.from('store_bill')
		.update({
			status: 'completed',
			completed_at: now,
			changed_by: user.id,
			changed_at: now
		})
		.eq('store_bill_uuid', billUuid);
	if (error) throw new Error(error.message);

	await supabase.from('store_transaction').insert({
		org_uuid: context.store.org_uuid,
		store_uuid: context.store.store_uuid,
		transaction_code: `POS-BILL-${bill.bill_number}-${Date.now().toString().slice(-6)}`,
		channel: 'offline',
		status: 'completed',
		occurred_at: now,
		currency_code: bill.currency_code,
		gross_amount_cents: totals.totalCents,
		payment_method:
			bill.payments.length > 1
				? `split:${bill.payments.map((payment) => payment.payment_method).join('+')}`
				: (bill.payments.at(-1)?.payment_method ?? 'cash'),
		external_reference: `bill:${bill.store_bill_uuid}`,
		direction: 'in',
		entry_type: 'sale',
		notes: null,
		category: null,
		created_by: user.id,
		changed_by: user.id
	});

	const updated = await loadBillBundle(supabase, context, billUuid);
	if (!updated) throw new Error('Unable to reload bill.');
	return updated;
}

export async function listCompletedStoreBills(
	supabase: SupabaseClient,
	context: StoreAppContext,
	limit = 50
): Promise<StoreBill[]> {
	const { data: bills, error } = await supabase
		.from('store_bill')
		.select(BILL_COLUMNS)
		.eq('store_uuid', context.store.store_uuid)
		.eq('status', 'completed')
		.order('completed_at', { ascending: false })
		.limit(limit);
	if (error) throw new Error(error.message);
	if (!bills?.length) return [];

	const billUuids = bills.map((bill) => bill.store_bill_uuid);
	const [linesResult, paymentsResult] = await Promise.all([
		supabase
			.from('store_bill_line')
			.select(LINE_COLUMNS)
			.in('store_bill_uuid', billUuids)
			.order('created_at'),
		supabase
			.from('store_bill_payment')
			.select(PAYMENT_COLUMNS)
			.in('store_bill_uuid', billUuids)
			.order('created_at')
	]);
	if (linesResult.error) throw new Error(linesResult.error.message);
	if (paymentsResult.error) throw new Error(paymentsResult.error.message);

	const linesByBill = new Map<string, StoreBillLine[]>();
	for (const line of (linesResult.data ?? []) as StoreBillLine[]) {
		const current = linesByBill.get(line.store_bill_uuid) ?? [];
		current.push(line);
		linesByBill.set(line.store_bill_uuid, current);
	}
	const paymentsByBill = new Map<string, StoreBillPayment[]>();
	for (const payment of (paymentsResult.data ?? []) as StoreBillPayment[]) {
		const current = paymentsByBill.get(payment.store_bill_uuid) ?? [];
		current.push(payment);
		paymentsByBill.set(payment.store_bill_uuid, current);
	}

	return bills.map((bill) => ({
		...(bill as Omit<StoreBill, 'lines' | 'payments'>),
		lines: linesByBill.get(bill.store_bill_uuid) ?? [],
		payments: paymentsByBill.get(bill.store_bill_uuid) ?? []
	}));
}

export async function voidStoreBill(
	supabase: SupabaseClient,
	user: User,
	context: StoreAppContext,
	billUuid: string
): Promise<void> {
	assertCanManageBilling(context);
	const { data, error } = await supabase
		.from('store_bill')
		.update({
			status: 'void',
			changed_by: user.id,
			changed_at: new Date().toISOString()
		})
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_bill_uuid', billUuid)
		.in('status', ['open', 'held'])
		.select('store_bill_uuid')
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) throw new Error('Open bill not found.');
}
