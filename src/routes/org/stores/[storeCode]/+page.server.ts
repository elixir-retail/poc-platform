import { error, fail } from '@sveltejs/kit';
import { updateStoreSchema } from '$lib/schemas/stores';
import { getOrganisationAppContext } from '$lib/server/organisation-auth';
import { submitStoreUpdateRequest, updateStore } from '$lib/server/stores';
import type { Store, StoreChangeRequest } from '$lib/types/platform';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent, locals: { supabase } }) => {
	const { organisationContext } = await parent();
	const orgUuid = organisationContext.organisation.organisation_uuid;

	const { data: store, error: storeError } = await supabase
		.from('store')
		.select(
			'store_uuid, org_uuid, store_code, name, description, status, business_mode, retail_category, service_category, goods_characteristics, service_models, currency_code, source_change_request_uuid, email, phone, address_line_1, address_line_2, city, region, postal_code, country_code, created_at, changed_at'
		)
		.eq('org_uuid', orgUuid)
		.eq('store_code', params.storeCode)
		.maybeSingle();

	if (storeError) error(500, 'Unable to load store');
	if (!store) error(404, 'Store not found');

	const [currenciesResult, requestsResult] = await Promise.all([
		supabase
			.from('organisation_currency')
			.select('currency_code, is_primary')
			.eq('org_uuid', orgUuid)
			.order('is_primary', { ascending: false })
			.order('currency_code', { ascending: true }),
		supabase
			.from('store_change_request')
			.select(
				'store_change_request_uuid, org_uuid, submitted_by_organisation_user_uuid, request_type, target_store_uuid, proposed_data, status, reviewed_by_organisation_user_uuid, reviewed_at, review_notes, created_at, changed_at'
			)
			.eq('target_store_uuid', store.store_uuid)
			.eq('request_type', 'update')
			.order('created_at', { ascending: false })
	]);

	if (currenciesResult.error) error(500, 'Unable to load organisation currencies');
	if (requestsResult.error) error(500, 'Unable to load store requests');

	return {
		store: store as Store,
		currencies: currenciesResult.data ?? [],
		storeRequests: (requestsResult.data ?? []) as StoreChangeRequest[]
	};
};

export const actions: Actions = {
	updateStore: async ({ params, request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');

		const context = await getOrganisationAppContext(supabase, user);
		if (!context) error(403, 'Organisation access required');

		const { data: store, error: storeError } = await supabase
			.from('store')
			.select('store_uuid')
			.eq('org_uuid', context.organisation.organisation_uuid)
			.eq('store_code', params.storeCode)
			.maybeSingle();
		if (storeError) error(500, 'Unable to load store');
		if (!store) error(404, 'Store not found');

		const formData = await request.formData();
		const businessMode = String(formData.get('business_mode') ?? '');
		const parsed = updateStoreSchema.safeParse({
			name: formData.get('name'),
			description: formData.get('description'),
			status: formData.get('status'),
			business_mode: businessMode,
			retail_category:
				businessMode === 'service' ? null : String(formData.get('retail_category') ?? ''),
			service_category:
				businessMode === 'retail' ? null : String(formData.get('service_category') ?? ''),
			goods_characteristics: formData.getAll('goods_characteristics').map(String),
			service_models: formData.getAll('service_models').map(String),
			currency_code: formData.get('currency_code'),
			email: formData.get('email'),
			phone: formData.get('phone'),
			address_line_1: formData.get('address_line_1'),
			address_line_2: formData.get('address_line_2'),
			city: formData.get('city'),
			region: formData.get('region'),
			postal_code: formData.get('postal_code'),
			country_code: formData.get('country_code')
		});

		if (!parsed.success) {
			return fail(400, {
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check the store details.'
			});
		}

		try {
			if (context.membership.role === 'viewer') {
				await submitStoreUpdateRequest(supabase, user, context, store.store_uuid, parsed.data);
				return {
					success: true as const,
					message: 'Store changes submitted for administrator approval.'
				};
			}

			await updateStore(supabase, user, context, store.store_uuid, parsed.data);
			return { success: true as const, message: 'Store updated.' };
		} catch (err) {
			return fail(400, {
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to update store'
			});
		}
	}
};
