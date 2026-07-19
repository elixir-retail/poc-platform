import { error, fail } from '@sveltejs/kit';
import {
	createStoreSchema,
	reviewStoreChangeRequestSchema,
	storeCounterCountSchema
} from '$lib/schemas/stores';
import { createStoreRootUserSchema } from '$lib/schemas/store-users';
import { getOrganisationAppContext } from '$lib/server/organisation-auth';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import {
	createStore,
	reviewStoreChangeRequest,
	submitStoreChangeRequest
} from '$lib/server/stores';
import { createStoreRootUser } from '$lib/server/store-users';
import type { OrganisationUser, Store, StoreChangeRequest } from '$lib/types/platform';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { organisationContext } = await parent();
	const [storesResult, currenciesResult, requestsResult, usersResult] = await Promise.all([
		supabase
			.from('store')
			.select(
				'store_uuid, org_uuid, store_code, name, description, status, business_mode, retail_category, service_category, goods_characteristics, service_models, currency_code, source_change_request_uuid, email, phone, address_line_1, address_line_2, city, region, postal_code, country_code, created_at, changed_at'
			)
			.eq('org_uuid', organisationContext.organisation.organisation_uuid)
			.order('created_at', { ascending: false }),
		supabase
			.from('organisation_currency')
			.select('currency_code, is_primary')
			.eq('org_uuid', organisationContext.organisation.organisation_uuid)
			.order('is_primary', { ascending: false })
			.order('currency_code', { ascending: true }),
		supabase
			.from('store_change_request')
			.select(
				'store_change_request_uuid, org_uuid, submitted_by_organisation_user_uuid, request_type, target_store_uuid, proposed_data, status, reviewed_by_organisation_user_uuid, reviewed_at, review_notes, created_at, changed_at'
			)
			.eq('org_uuid', organisationContext.organisation.organisation_uuid)
			.order('created_at', { ascending: false }),
		supabase
			.from('organisation_user')
			.select(
				'organisation_user_uuid, org_uuid, user_uuid, email, display_name, role, is_active, created_at, changed_at'
			)
			.eq('org_uuid', organisationContext.organisation.organisation_uuid)
	]);

	if (storesResult.error) error(500, 'Unable to load stores');
	if (currenciesResult.error) error(500, 'Unable to load organisation currencies');
	if (requestsResult.error) error(500, 'Unable to load store requests');
	if (usersResult.error) error(500, 'Unable to load organisation users');
	return {
		stores: (storesResult.data ?? []) as Store[],
		currencies: currenciesResult.data ?? [],
		storeRequests: (requestsResult.data ?? []) as StoreChangeRequest[],
		organisationUsers: (usersResult.data ?? []) as OrganisationUser[]
	};
};

export const actions: Actions = {
	createStore: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');

		const context = await getOrganisationAppContext(supabase, user);
		if (!context) error(403, 'Organisation access required');

		const formData = await request.formData();
		const businessMode = String(formData.get('business_mode') ?? '');
		const counterCount = storeCounterCountSchema.safeParse(formData.get('counter_count'));
		const parsed = createStoreSchema.safeParse({
			name: formData.get('name'),
			description: formData.get('description'),
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
				action: 'createStore',
				success: false as const,
				message: parsed.error.issues[0]?.message ?? 'Check the store details.'
			});
		}
		if (!counterCount.success) {
			return fail(400, {
				action: 'createStore',
				success: false as const,
				message: 'Choose between 1 and 20 counters.'
			});
		}

		try {
			if (context.membership.role === 'viewer') {
				await submitStoreChangeRequest(supabase, user, context, parsed.data, counterCount.data);
			} else {
				const rootUser = createStoreRootUserSchema.safeParse({
					display_name: formData.get('root_display_name'),
					email: formData.get('root_email'),
					temporary_password: formData.get('root_temporary_password')
				});
				if (!rootUser.success) {
					return fail(400, {
						action: 'createStore',
						success: false as const,
						message: rootUser.error.issues[0]?.message ?? 'Check the store root user details.'
					});
				}

				const store = await createStore(supabase, user, context, parsed.data, {
					counterCount: counterCount.data
				});
				try {
					await createStoreRootUser(supabase, user, context, store.store_uuid, rootUser.data);
				} catch (rootError) {
					const admin = getSupabaseAdmin();
					await admin
						.from('organisation_audit_event')
						.delete()
						.eq('entity_type', 'store')
						.eq('entity_uuid', store.store_uuid);
					await admin.from('store').delete().eq('store_uuid', store.store_uuid);
					throw rootError;
				}
			}
			return {
				action: 'createStore',
				success: true as const,
				message:
					context.membership.role === 'viewer'
						? 'Store request submitted for approval.'
						: 'Store created.'
			};
		} catch (err) {
			return fail(400, {
				action: 'createStore',
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to create store'
			});
		}
	},

	reviewStore: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');

		const context = await getOrganisationAppContext(supabase, user);
		if (!context) error(403, 'Organisation access required');

		const parsed = reviewStoreChangeRequestSchema.safeParse(
			Object.fromEntries(await request.formData())
		);
		if (!parsed.success) {
			return fail(400, {
				action: 'reviewStore',
				success: false as const,
				message: 'Check the store review.'
			});
		}

		try {
			await reviewStoreChangeRequest(supabase, user, context, parsed.data);
			return {
				action: 'reviewStore',
				success: true as const,
				message:
					parsed.data.decision === 'approved'
						? 'Store request approved.'
						: 'Store request rejected.'
			};
		} catch (err) {
			return fail(400, {
				action: 'reviewStore',
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to review store request'
			});
		}
	}
};
