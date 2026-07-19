import type { StoreBill } from '$lib/types/platform';

export function billTotals(bill: Pick<StoreBill, 'lines' | 'payments'>) {
	const totalCents = bill.lines.reduce((sum, line) => sum + line.line_total_cents, 0);
	const paidCents = bill.payments.reduce((sum, payment) => sum + payment.amount_cents, 0);
	return {
		totalCents,
		paidCents,
		pendingCents: Math.max(totalCents - paidCents, 0),
		changeCents: Math.max(paidCents - totalCents, 0)
	};
}
