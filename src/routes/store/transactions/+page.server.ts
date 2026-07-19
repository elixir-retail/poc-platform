import { error } from '@sveltejs/kit';
import type { StoreTransaction } from '$lib/types/platform';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { storeContext } = await parent();
	const { data, error: transactionError } = await supabase
		.from('store_transaction')
		.select(
			'store_transaction_uuid, org_uuid, store_uuid, transaction_code, channel, status, occurred_at, currency_code, gross_amount_cents, payment_method, external_reference, direction, entry_type, notes, category, created_at'
		)
		.eq('store_uuid', storeContext.store.store_uuid)
		.order('occurred_at', { ascending: false });

	if (transactionError) error(500, 'Unable to load transactions');
	return { transactions: (data ?? []) as StoreTransaction[] };
};
