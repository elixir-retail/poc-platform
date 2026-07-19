import type { Store, StoreAppContext, StoreUser } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function getStoreUser(
	supabase: SupabaseClient,
	user: User | null
): Promise<StoreUser | null> {
	if (!user) return null;

	const { data, error } = await supabase
		.from('store_user')
		.select(
			'store_user_uuid, org_uuid, store_uuid, user_uuid, email, display_name, role, is_active, created_at, changed_at'
		)
		.eq('user_uuid', user.id)
		.eq('is_active', true)
		.maybeSingle();

	if (error || !data || data.role !== 'root') return null;
	return data as StoreUser;
}

export async function getStoreAppContext(
	supabase: SupabaseClient,
	user: User | null
): Promise<StoreAppContext | null> {
	const membership = await getStoreUser(supabase, user);
	if (!membership) return null;

	const [storeResult, organisationResult] = await Promise.all([
		supabase
			.from('store')
			.select(
				'store_uuid, org_uuid, store_code, name, description, status, business_mode, retail_category, service_category, goods_characteristics, service_models, currency_code, source_change_request_uuid, email, phone, address_line_1, address_line_2, city, region, postal_code, country_code, created_at, changed_at'
			)
			.eq('store_uuid', membership.store_uuid)
			.maybeSingle(),
		supabase
			.from('organisation')
			.select('organisation_uuid, org_code, legal_name, trade_name')
			.eq('organisation_uuid', membership.org_uuid)
			.maybeSingle()
	]);

	if (storeResult.error || !storeResult.data) return null;
	if (organisationResult.error || !organisationResult.data) return null;

	return {
		membership,
		store: storeResult.data as Store,
		organisation: organisationResult.data
	};
}
