import { error, redirect } from '@sveltejs/kit';
import { billTotals } from '$lib/pos';
import { listCompletedStoreBills } from '$lib/server/pos-billing';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { storeContext } = await parent();
	if (storeContext.store.business_mode === 'service') {
		redirect(303, '/store');
	}

	try {
		const bills = await listCompletedStoreBills(supabase, storeContext, 100);
		const currencyCode = storeContext.store.currency_code;
		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);

		const todayBills = bills.filter(
			(bill) => bill.completed_at && new Date(bill.completed_at) >= startOfDay
		);

		const salesTodayCents = todayBills.reduce(
			(sum, bill) => sum + billTotals(bill).totalCents,
			0
		);
		const billsToday = todayBills.length;
		const avgTicketCents = billsToday > 0 ? Math.round(salesTodayCents / billsToday) : 0;

		const tenderMix = new Map<string, number>();
		for (const bill of todayBills) {
			for (const payment of bill.payments) {
				tenderMix.set(
					payment.payment_method,
					(tenderMix.get(payment.payment_method) ?? 0) + payment.amount_cents
				);
			}
		}

		return {
			currencyCode,
			summary: {
				salesTodayCents,
				billsToday,
				avgTicketCents
			},
			tenderMix: [...tenderMix.entries()].map(([method, amountCents]) => ({
				method,
				amountCents
			})),
			bills: bills.map((bill) => {
				const totals = billTotals(bill);
				return {
					store_bill_uuid: bill.store_bill_uuid,
					bill_number: bill.bill_number,
					customer_name: bill.customer_name,
					customer_phone: bill.customer_phone,
					total_cents: totals.totalCents,
					completed_at: bill.completed_at,
					payments: bill.payments.map((payment) => ({
						payment_method: payment.payment_method,
						amount_cents: payment.amount_cents
					}))
				};
			})
		};
	} catch {
		error(500, 'Unable to load sales reports');
	}
};
