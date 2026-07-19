import {
	createStoreSchema,
	updateStoreSchema,
	type CreateStoreInput,
	type UpdateStoreInput
} from '$lib/schemas/stores';
import { canManageOrganisation } from '$lib/server/organisation-auth';
import type { OrganisationAppContext, Store, StoreChangeRequest } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function createStore(
	supabase: SupabaseClient,
	user: User,
	context: OrganisationAppContext,
	input: CreateStoreInput,
	options?: { sourceChangeRequestUuid?: string }
): Promise<Store> {
	if (!canManageOrganisation(context.membership.role)) {
		throw new Error('Only organisation administrators can create stores.');
	}

	const storeUuid = crypto.randomUUID();
	const storeCode = `STR-${storeUuid.slice(0, 8).toUpperCase()}`;
	const now = new Date().toISOString();

	const { data: configuredCurrency, error: currencyError } = await supabase
		.from('organisation_currency')
		.select('currency_code')
		.eq('org_uuid', context.organisation.organisation_uuid)
		.eq('currency_code', input.currency_code)
		.maybeSingle();

	if (currencyError) throw new Error(currencyError.message);
	if (!configuredCurrency) {
		throw new Error('Choose a currency configured for this organisation.');
	}

	const { data: store, error: storeError } = await supabase
		.from('store')
		.insert({
			store_uuid: storeUuid,
			org_uuid: context.organisation.organisation_uuid,
			store_code: storeCode,
			name: input.name,
			description: input.description,
			status: 'active',
			business_mode: input.business_mode,
			retail_category: input.business_mode === 'service' ? null : input.retail_category,
			service_category: input.business_mode === 'retail' ? null : input.service_category,
			goods_characteristics: input.business_mode === 'service' ? [] : input.goods_characteristics,
			service_models: input.business_mode === 'retail' ? [] : input.service_models,
			currency_code: input.currency_code,
			source_change_request_uuid: options?.sourceChangeRequestUuid ?? null,
			email: input.email,
			phone: input.phone,
			address_line_1: input.address_line_1,
			address_line_2: input.address_line_2,
			city: input.city,
			region: input.region,
			postal_code: input.postal_code,
			country_code: input.country_code,
			created_by: user.id,
			changed_by: user.id,
			created_at: now,
			changed_at: now
		})
		.select(
			'store_uuid, org_uuid, store_code, name, description, status, business_mode, retail_category, service_category, goods_characteristics, service_models, currency_code, source_change_request_uuid, email, phone, address_line_1, address_line_2, city, region, postal_code, country_code, created_at, changed_at'
		)
		.single();

	if (storeError || !store) {
		throw new Error(storeError?.message ?? 'Unable to create store');
	}

	const { error: auditError } = await supabase.from('organisation_audit_event').insert({
		org_uuid: context.organisation.organisation_uuid,
		actor_organisation_user_uuid: context.membership.organisation_user_uuid,
		action: 'store.created',
		entity_type: 'store',
		entity_uuid: store.store_uuid,
		after_data: store,
		created_by: user.id,
		changed_by: user.id
	});

	if (auditError) {
		await supabase.from('store').delete().eq('store_uuid', store.store_uuid);
		throw new Error(`Audit write failed: ${auditError.message}`);
	}

	return store as Store;
}

export async function submitStoreChangeRequest(
	supabase: SupabaseClient,
	user: User,
	context: OrganisationAppContext,
	input: CreateStoreInput
): Promise<StoreChangeRequest> {
	if (context.membership.role !== 'viewer') {
		throw new Error('Only viewers submit store requests; administrators create stores directly.');
	}

	const { data: request, error: requestError } = await supabase
		.from('store_change_request')
		.insert({
			org_uuid: context.organisation.organisation_uuid,
			submitted_by_organisation_user_uuid: context.membership.organisation_user_uuid,
			request_type: 'create',
			proposed_data: input,
			status: 'pending',
			created_by: user.id,
			changed_by: user.id
		})
		.select(
			'store_change_request_uuid, org_uuid, submitted_by_organisation_user_uuid, request_type, target_store_uuid, proposed_data, status, reviewed_by_organisation_user_uuid, reviewed_at, review_notes, created_at, changed_at'
		)
		.single();

	if (requestError || !request) {
		throw new Error(requestError?.message ?? 'Unable to submit store request');
	}

	const { error: auditError } = await supabase.from('organisation_audit_event').insert({
		org_uuid: context.organisation.organisation_uuid,
		actor_organisation_user_uuid: context.membership.organisation_user_uuid,
		action: 'store_change_request.submitted',
		entity_type: 'store_change_request',
		entity_uuid: request.store_change_request_uuid,
		after_data: request,
		created_by: user.id,
		changed_by: user.id
	});

	if (auditError) {
		await supabase
			.from('store_change_request')
			.delete()
			.eq('store_change_request_uuid', request.store_change_request_uuid);
		throw new Error(`Audit write failed: ${auditError.message}`);
	}

	return request as StoreChangeRequest;
}

export async function updateStore(
	supabase: SupabaseClient,
	user: User,
	context: OrganisationAppContext,
	storeUuid: string,
	input: UpdateStoreInput
): Promise<Store> {
	if (!canManageOrganisation(context.membership.role)) {
		throw new Error('Only organisation administrators can update stores.');
	}

	const { data: configuredCurrency, error: currencyError } = await supabase
		.from('organisation_currency')
		.select('currency_code')
		.eq('org_uuid', context.organisation.organisation_uuid)
		.eq('currency_code', input.currency_code)
		.maybeSingle();
	if (currencyError) throw new Error(currencyError.message);
	if (!configuredCurrency) {
		throw new Error('Choose a currency configured for this organisation.');
	}

	const { data: before, error: beforeError } = await supabase
		.from('store')
		.select('*')
		.eq('store_uuid', storeUuid)
		.eq('org_uuid', context.organisation.organisation_uuid)
		.maybeSingle();
	if (beforeError) throw new Error(beforeError.message);
	if (!before) throw new Error('Store not found');

	const now = new Date().toISOString();
	const { data: store, error: storeError } = await supabase
		.from('store')
		.update({
			name: input.name,
			description: input.description,
			status: input.status,
			business_mode: input.business_mode,
			retail_category: input.business_mode === 'service' ? null : input.retail_category,
			service_category: input.business_mode === 'retail' ? null : input.service_category,
			goods_characteristics: input.business_mode === 'service' ? [] : input.goods_characteristics,
			service_models: input.business_mode === 'retail' ? [] : input.service_models,
			currency_code: input.currency_code,
			email: input.email,
			phone: input.phone,
			address_line_1: input.address_line_1,
			address_line_2: input.address_line_2,
			city: input.city,
			region: input.region,
			postal_code: input.postal_code,
			country_code: input.country_code,
			changed_by: user.id,
			changed_at: now
		})
		.eq('store_uuid', storeUuid)
		.eq('org_uuid', context.organisation.organisation_uuid)
		.select(
			'store_uuid, org_uuid, store_code, name, description, status, business_mode, retail_category, service_category, goods_characteristics, service_models, currency_code, source_change_request_uuid, email, phone, address_line_1, address_line_2, city, region, postal_code, country_code, created_at, changed_at'
		)
		.single();
	if (storeError || !store) {
		throw new Error(storeError?.message ?? 'Unable to update store');
	}

	const { error: auditError } = await supabase.from('organisation_audit_event').insert({
		org_uuid: context.organisation.organisation_uuid,
		actor_organisation_user_uuid: context.membership.organisation_user_uuid,
		action: 'store.updated',
		entity_type: 'store',
		entity_uuid: storeUuid,
		before_data: before,
		after_data: store,
		created_by: user.id,
		changed_by: user.id
	});
	if (auditError) throw new Error(`Audit write failed: ${auditError.message}`);

	return store as Store;
}

export async function submitStoreUpdateRequest(
	supabase: SupabaseClient,
	user: User,
	context: OrganisationAppContext,
	storeUuid: string,
	input: UpdateStoreInput
): Promise<StoreChangeRequest> {
	if (context.membership.role !== 'viewer') {
		throw new Error('Only viewers submit store update requests.');
	}

	const { data: store, error: storeError } = await supabase
		.from('store')
		.select('store_uuid')
		.eq('store_uuid', storeUuid)
		.eq('org_uuid', context.organisation.organisation_uuid)
		.maybeSingle();
	if (storeError) throw new Error(storeError.message);
	if (!store) throw new Error('Store not found');

	const { data: pending, error: pendingError } = await supabase
		.from('store_change_request')
		.select('store_change_request_uuid')
		.eq('target_store_uuid', storeUuid)
		.eq('request_type', 'update')
		.eq('status', 'pending')
		.maybeSingle();
	if (pendingError) throw new Error(pendingError.message);
	if (pending) throw new Error('This store already has an update awaiting approval.');

	const { data: changeRequest, error } = await supabase
		.from('store_change_request')
		.insert({
			org_uuid: context.organisation.organisation_uuid,
			submitted_by_organisation_user_uuid: context.membership.organisation_user_uuid,
			request_type: 'update',
			target_store_uuid: storeUuid,
			proposed_data: input,
			status: 'pending',
			created_by: user.id,
			changed_by: user.id
		})
		.select(
			'store_change_request_uuid, org_uuid, submitted_by_organisation_user_uuid, request_type, target_store_uuid, proposed_data, status, reviewed_by_organisation_user_uuid, reviewed_at, review_notes, created_at, changed_at'
		)
		.single();
	if (error || !changeRequest) {
		throw new Error(error?.message ?? 'Unable to submit store update request');
	}

	const { error: auditError } = await supabase.from('organisation_audit_event').insert({
		org_uuid: context.organisation.organisation_uuid,
		actor_organisation_user_uuid: context.membership.organisation_user_uuid,
		action: 'store_change_request.submitted',
		entity_type: 'store_change_request',
		entity_uuid: changeRequest.store_change_request_uuid,
		before_data: null,
		after_data: changeRequest,
		created_by: user.id,
		changed_by: user.id
	});
	if (auditError) {
		await supabase
			.from('store_change_request')
			.delete()
			.eq('store_change_request_uuid', changeRequest.store_change_request_uuid);
		throw new Error(`Audit write failed: ${auditError.message}`);
	}

	return changeRequest as StoreChangeRequest;
}

export async function reviewStoreChangeRequest(
	supabase: SupabaseClient,
	user: User,
	context: OrganisationAppContext,
	input: {
		store_change_request_uuid: string;
		decision: 'approved' | 'rejected';
		review_notes: string | null;
	}
): Promise<void> {
	if (!canManageOrganisation(context.membership.role)) {
		throw new Error('Only organisation administrators can review store requests.');
	}

	const { data: request, error: requestError } = await supabase
		.from('store_change_request')
		.select(
			'store_change_request_uuid, org_uuid, submitted_by_organisation_user_uuid, request_type, target_store_uuid, proposed_data, status, reviewed_by_organisation_user_uuid, reviewed_at, review_notes, created_at, changed_at'
		)
		.eq('store_change_request_uuid', input.store_change_request_uuid)
		.eq('org_uuid', context.organisation.organisation_uuid)
		.maybeSingle();

	if (requestError) throw new Error(requestError.message);
	if (!request) throw new Error('Store request not found');
	if (request.status !== 'pending') throw new Error('This store request has already been reviewed');

	if (input.decision === 'approved') {
		if (request.request_type === 'create') {
			const parsed = createStoreSchema.safeParse(request.proposed_data);
			if (!parsed.success) throw new Error('The proposed store data is no longer valid');

			const { data: existingStore, error: existingStoreError } = await supabase
				.from('store')
				.select('store_uuid')
				.eq('source_change_request_uuid', request.store_change_request_uuid)
				.maybeSingle();
			if (existingStoreError) throw new Error(existingStoreError.message);

			if (!existingStore) {
				await createStore(supabase, user, context, parsed.data, {
					sourceChangeRequestUuid: request.store_change_request_uuid
				});
			}
		} else {
			const parsed = updateStoreSchema.safeParse(request.proposed_data);
			if (!parsed.success || !request.target_store_uuid) {
				throw new Error('The proposed store update is no longer valid');
			}
			await updateStore(supabase, user, context, request.target_store_uuid, parsed.data);
		}
	}

	const now = new Date().toISOString();
	const { error: updateError } = await supabase
		.from('store_change_request')
		.update({
			status: input.decision,
			reviewed_by_organisation_user_uuid: context.membership.organisation_user_uuid,
			reviewed_at: now,
			review_notes: input.review_notes,
			changed_by: user.id,
			changed_at: now
		})
		.eq('store_change_request_uuid', request.store_change_request_uuid)
		.eq('status', 'pending');

	if (updateError) throw new Error(updateError.message);

	const { error: auditError } = await supabase.from('organisation_audit_event').insert({
		org_uuid: context.organisation.organisation_uuid,
		actor_organisation_user_uuid: context.membership.organisation_user_uuid,
		action: `store_change_request.${input.decision}`,
		entity_type: 'store_change_request',
		entity_uuid: request.store_change_request_uuid,
		before_data: request,
		after_data: {
			status: input.decision,
			review_notes: input.review_notes,
			reviewed_at: now
		},
		created_by: user.id,
		changed_by: user.id
	});

	if (auditError) throw new Error(`Audit write failed: ${auditError.message}`);
}
