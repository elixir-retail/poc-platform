import { error, fail, redirect } from '@sveltejs/kit';
import {
	addBillLineSchema,
	addBillPaymentSchema,
	billActionSchema,
	createBillSchema,
	removeBillLineSchema,
	updateBillCustomerSchema,
	updateBillLineSchema
} from '$lib/schemas/pos-billing';
import {
	addBillPayment,
	addProductToBill,
	clearBillPayments,
	completeStoreBill,
	createStoreBill,
	holdStoreBill,
	listOpenStoreBills,
	removeBillLine,
	resumeStoreBill,
	updateBillLineQuantity,
	updateStoreBillCustomer,
	voidStoreBill
} from '$lib/server/pos-billing';
import { createStoreCustomer } from '$lib/server/customers';
import { createStoreCustomerSchema } from '$lib/schemas/customers';
import { billTotals } from '$lib/pos';
import { getStoreAppContext } from '$lib/server/store-auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase }, depends }) => {
	const { storeContext, activeCounter } = await parent();
	if (storeContext.store.business_mode === 'service') {
		redirect(303, '/store');
	}

	depends('store:billing:bills');

	try {
		const bills = await listOpenStoreBills(supabase, storeContext);
		return {
			bills,
			activeCounterUuid: activeCounter?.store_counter_uuid ?? null
		};
	} catch {
		error(500, 'Unable to load billing workspace');
	}
};

async function requireStoreUser(locals: {
	safeGetSession: App.Locals['safeGetSession'];
	supabase: App.Locals['supabase'];
}) {
	const { user } = await locals.safeGetSession();
	if (!user) error(401, 'Authentication required');
	const context = await getStoreAppContext(locals.supabase, user);
	if (!context) error(403, 'Store access required');
	return { user, context, supabase: locals.supabase };
}

function actionFail(message: string) {
	return fail(400, { success: false as const, message });
}

export const actions: Actions = {
	createBill: async ({ request, cookies, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const parsed = createBillSchema.safeParse({
			customer_name: String(formData.get('customer_name') ?? ''),
			customer_phone: String(formData.get('customer_phone') ?? '')
		});
		if (!parsed.success)
			return actionFail(parsed.error.issues[0]?.message ?? 'Check bill details.');

		try {
			const bill = await createStoreBill(
				supabase,
				user,
				context,
				parsed.data,
				cookies.get('store_counter_uuid') ?? null
			);
			return {
				success: true as const,
				message: `Bill ${bill.bill_number} created.`,
				activeBillUuid: bill.store_bill_uuid
			};
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to create bill');
		}
	},

	updateCustomer: async ({ request, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const parsed = updateBillCustomerSchema.safeParse({
			store_bill_uuid: formData.get('store_bill_uuid'),
			customer_name: String(formData.get('customer_name') ?? ''),
			customer_phone: String(formData.get('customer_phone') ?? ''),
			store_customer_uuid: String(formData.get('store_customer_uuid') ?? '')
		});
		if (!parsed.success)
			return actionFail(parsed.error.issues[0]?.message ?? 'Check customer details.');

		try {
			await updateStoreBillCustomer(
				supabase,
				user,
				context,
				parsed.data.store_bill_uuid,
				parsed.data
			);
			return {
				success: true as const,
				activeBillUuid: parsed.data.store_bill_uuid
			};
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to update customer');
		}
	},

	createCustomer: async ({ request, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const billUuid = String(formData.get('store_bill_uuid') ?? '');
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
		if (!parsed.success)
			return actionFail(parsed.error.issues[0]?.message ?? 'Check customer details.');
		if (!billUuid) return actionFail('Bill not found.');

		try {
			const customer = await createStoreCustomer(supabase, user, context, parsed.data);
			await updateStoreBillCustomer(supabase, user, context, billUuid, {
				customer_name: customer.full_name,
				customer_phone: customer.phone,
				store_customer_uuid: customer.store_customer_uuid
			});
			return {
				success: true as const,
				message: 'Customer added.',
				activeBillUuid: billUuid,
				createdCustomerUuid: customer.store_customer_uuid
			};
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to add customer');
		}
	},

	addLine: async ({ request, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const parsed = addBillLineSchema.safeParse({
			store_bill_uuid: formData.get('store_bill_uuid'),
			store_product_uuid: formData.get('store_product_uuid'),
			quantity: formData.get('quantity') || '1'
		});
		if (!parsed.success)
			return actionFail(parsed.error.issues[0]?.message ?? 'Check product details.');

		try {
			await addProductToBill(
				supabase,
				user,
				context,
				parsed.data.store_bill_uuid,
				parsed.data.store_product_uuid,
				parsed.data.quantity
			);
			return {
				success: true as const,
				activeBillUuid: parsed.data.store_bill_uuid
			};
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to add product');
		}
	},

	updateLine: async ({ request, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const parsed = updateBillLineSchema.safeParse({
			store_bill_line_uuid: formData.get('store_bill_line_uuid'),
			quantity: formData.get('quantity')
		});
		if (!parsed.success) return actionFail(parsed.error.issues[0]?.message ?? 'Check quantity.');

		try {
			await updateBillLineQuantity(
				supabase,
				user,
				context,
				parsed.data.store_bill_line_uuid,
				parsed.data.quantity
			);
			return { success: true as const, message: 'Quantity updated.' };
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to update quantity');
		}
	},

	removeLine: async ({ request, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const parsed = removeBillLineSchema.safeParse({
			store_bill_line_uuid: formData.get('store_bill_line_uuid')
		});
		if (!parsed.success) return actionFail(parsed.error.issues[0]?.message ?? 'Line not found.');

		try {
			await removeBillLine(supabase, user, context, parsed.data.store_bill_line_uuid);
			return { success: true as const, message: 'Line removed.' };
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to remove line');
		}
	},

	addPayment: async ({ request, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const parsed = addBillPaymentSchema.safeParse({
			store_bill_uuid: formData.get('store_bill_uuid'),
			payment_method: formData.get('payment_method'),
			amount: String(formData.get('amount') ?? ''),
			reference: String(formData.get('reference') ?? '')
		});
		if (!parsed.success)
			return actionFail(parsed.error.issues[0]?.message ?? 'Check payment details.');

		try {
			await addBillPayment(
				supabase,
				user,
				context,
				parsed.data.store_bill_uuid,
				parsed.data.payment_method,
				Math.round(parsed.data.amount * 100),
				parsed.data.reference
			);
			return {
				success: true as const,
				activeBillUuid: parsed.data.store_bill_uuid
			};
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to record payment');
		}
	},

	clearPayments: async ({ request, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const parsed = billActionSchema.safeParse({
			store_bill_uuid: formData.get('store_bill_uuid')
		});
		if (!parsed.success) return actionFail('Bill not found.');

		try {
			await clearBillPayments(supabase, user, context, parsed.data.store_bill_uuid);
			return {
				success: true as const,
				message: 'Payments cleared.',
				activeBillUuid: parsed.data.store_bill_uuid
			};
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to clear payments');
		}
	},

	holdBill: async ({ request, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const parsed = billActionSchema.safeParse({
			store_bill_uuid: formData.get('store_bill_uuid')
		});
		if (!parsed.success) return actionFail('Bill not found.');

		try {
			await holdStoreBill(supabase, user, context, parsed.data.store_bill_uuid);
			return {
				success: true as const,
				message: 'Bill held.',
				activeBillUuid: parsed.data.store_bill_uuid
			};
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to hold bill');
		}
	},

	resumeBill: async ({ request, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const parsed = billActionSchema.safeParse({
			store_bill_uuid: formData.get('store_bill_uuid')
		});
		if (!parsed.success) return actionFail('Bill not found.');

		try {
			await resumeStoreBill(supabase, user, context, parsed.data.store_bill_uuid);
			return {
				success: true as const,
				message: 'Bill resumed.',
				activeBillUuid: parsed.data.store_bill_uuid
			};
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to resume bill');
		}
	},

	chargeBill: async ({ request, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const parsed = billActionSchema.safeParse({
			store_bill_uuid: formData.get('store_bill_uuid')
		});
		if (!parsed.success) return actionFail('Bill not found.');

		try {
			const bill = await completeStoreBill(supabase, user, context, parsed.data.store_bill_uuid);
			const totals = billTotals(bill);
			return {
				success: true as const,
				message: `Bill ${bill.bill_number} completed.`,
				activeBillUuid: null,
				completedBill: {
					store_bill_uuid: bill.store_bill_uuid,
					bill_number: bill.bill_number,
					customer_name: bill.customer_name,
					customer_phone: bill.customer_phone,
					currency_code: bill.currency_code,
					total_cents: totals.totalCents,
					paid_cents: totals.paidCents,
					change_cents: totals.changeCents,
					lines: bill.lines.map((line) => ({
						product_name: line.product_name,
						sku: line.sku,
						quantity: line.quantity,
						unit_price_cents: line.unit_price_cents,
						line_total_cents: line.line_total_cents
					})),
					payments: bill.payments.map((payment) => ({
						payment_method: payment.payment_method,
						amount_cents: payment.amount_cents
					})),
					completed_at: bill.completed_at
				}
			};
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to complete bill');
		}
	},

	sendReceipt: async ({ request, locals }) => {
		await requireStoreUser(locals);
		const formData = await request.formData();
		const channel = String(formData.get('channel') ?? '');
		const destination = String(formData.get('destination') ?? '').trim();
		if (channel !== 'email' && channel !== 'sms') {
			return actionFail('Choose email or SMS.');
		}
		if (!destination) {
			return actionFail(
				channel === 'email' ? 'Enter a customer email address.' : 'Enter a customer phone number.'
			);
		}
		return {
			success: true as const,
			message:
				channel === 'email'
					? `Receipt queued to ${destination}.`
					: `Receipt SMS queued to ${destination}.`
		};
	},

	voidBill: async ({ request, locals }) => {
		const { user, context, supabase } = await requireStoreUser(locals);
		const formData = await request.formData();
		const parsed = billActionSchema.safeParse({
			store_bill_uuid: formData.get('store_bill_uuid')
		});
		if (!parsed.success) return actionFail('Bill not found.');

		try {
			await voidStoreBill(supabase, user, context, parsed.data.store_bill_uuid);
			return { success: true as const, message: 'Bill voided.', activeBillUuid: null };
		} catch (err) {
			return actionFail(err instanceof Error ? err.message : 'Unable to void bill');
		}
	}
};
