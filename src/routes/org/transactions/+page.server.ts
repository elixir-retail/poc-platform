import { error } from '@sveltejs/kit';
import type { StoreTransaction } from '$lib/types/platform';
import type { PageServerLoad } from './$types';

function firstRelation<T>(value: T | T[] | null): T | null {
	return Array.isArray(value) ? (value[0] ?? null) : value;
}

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { organisationContext } = await parent();
	const orgUuid = organisationContext.organisation.organisation_uuid;

	const { data, error: transactionError } = await supabase
		.from('store_transaction')
		.select(
			'store_transaction_uuid, org_uuid, store_uuid, transaction_code, channel, status, occurred_at, currency_code, gross_amount_cents, payment_method, external_reference, direction, entry_type, notes, category, created_at, store(store_code, name)'
		)
		.eq('org_uuid', orgUuid)
		.order('occurred_at', { ascending: false });

	if (transactionError) error(500, 'Unable to load transactions');

	const transactions = (data ?? []).map((row) => ({
		...row,
		store: firstRelation(row.store)
	})) as StoreTransaction[];

	const stores = Array.from(
		new Map(
			transactions
				.filter((transaction) => transaction.store)
				.map((transaction) => [transaction.store_uuid, transaction.store!])
		).entries()
	).map(([store_uuid, store]) => ({ store_uuid, ...store }));

	return { transactions, stores };
};
