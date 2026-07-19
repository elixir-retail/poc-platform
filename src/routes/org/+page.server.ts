import { error } from '@sveltejs/kit';
import type { BillingPlan, OrganisationAuditEvent, StoreTransaction } from '$lib/types/platform';
import type { PageServerLoad } from './$types';

function firstRelation<T>(value: T | T[] | null): T | null {
	return Array.isArray(value) ? (value[0] ?? null) : value;
}

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { organisationContext } = await parent();
	const orgUuid = organisationContext.organisation.organisation_uuid;

	const [
		storesResult,
		usersResult,
		transactionsResult,
		billingResult,
		storeRequestsResult,
		auditResult
	] = await Promise.all([
		supabase
			.from('store')
			.select('store_uuid, store_code, name, status, business_mode')
			.eq('org_uuid', orgUuid),
		supabase
			.from('organisation_user')
			.select('organisation_user_uuid, role, is_active')
			.eq('org_uuid', orgUuid),
		supabase
			.from('store_transaction')
			.select(
				'store_transaction_uuid, store_uuid, transaction_code, channel, status, occurred_at, currency_code, gross_amount_cents, payment_method, external_reference, direction, entry_type, notes, category, org_uuid, created_at, store(store_code, name)'
			)
			.eq('org_uuid', orgUuid)
			.order('occurred_at', { ascending: false }),
		supabase
			.from('organisation_billing')
			.select(
				'status, billing_plan(name, plan_code, plan_type, amount_cents, currency_code, billing_interval)'
			)
			.eq('org_uuid', orgUuid)
			.maybeSingle(),
		supabase
			.from('store_change_request')
			.select('store_change_request_uuid, request_type, status')
			.eq('org_uuid', orgUuid)
			.eq('status', 'pending'),
		supabase
			.from('organisation_audit_event')
			.select('organisation_audit_event_uuid, action, entity_type, created_at')
			.eq('org_uuid', orgUuid)
			.order('created_at', { ascending: false })
			.limit(6)
	]);

	if (storesResult.error) error(500, 'Unable to load stores');
	if (usersResult.error) error(500, 'Unable to load organisation users');
	if (transactionsResult.error) error(500, 'Unable to load transactions');
	if (storeRequestsResult.error) error(500, 'Unable to load store requests');
	if (auditResult.error) error(500, 'Unable to load activity');

	const transactions = (transactionsResult.data ?? []).map((row) => ({
		...row,
		store: firstRelation(row.store)
	})) as StoreTransaction[];

	const billing = billingResult.data
		? {
				status: billingResult.data.status as string,
				billing_plan: firstRelation(
					billingResult.data.billing_plan as
						| Pick<
								BillingPlan,
								| 'name'
								| 'plan_code'
								| 'plan_type'
								| 'amount_cents'
								| 'currency_code'
								| 'billing_interval'
						  >[]
						| null
				)
			}
		: null;

	return {
		stores: storesResult.data ?? [],
		userCounts: {
			total: (usersResult.data ?? []).length,
			active: (usersResult.data ?? []).filter((user) => user.is_active).length,
			admins: (usersResult.data ?? []).filter(
				(user) => user.is_active && (user.role === 'root' || user.role === 'admin')
			).length
		},
		transactions,
		billing,
		pendingStoreRequests: (storeRequestsResult.data ?? []).length,
		activity: (auditResult.data ?? []) as Pick<
			OrganisationAuditEvent,
			'organisation_audit_event_uuid' | 'action' | 'entity_type' | 'created_at'
		>[]
	};
};
