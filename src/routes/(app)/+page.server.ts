import { error } from '@sveltejs/kit';
import type {
	BillingPlan,
	OnboardingStatus,
	OrganisationBillingStatus,
	VerificationStatus
} from '$lib/types/platform';
import type { PageServerLoad } from './$types';

export type DashboardOrganisation = {
	organisation_uuid: string;
	org_code: string;
	legal_name: string;
	trade_name: string | null;
	overall_status: OnboardingStatus;
	kyc_status: VerificationStatus;
	kyb_status: VerificationStatus;
	changed_at: string;
};

export type DashboardBillingRow = {
	status: OrganisationBillingStatus;
	billing_plan: Pick<
		BillingPlan,
		'plan_type' | 'amount_cents' | 'currency_code' | 'billing_interval'
	> | null;
};

export type DashboardActivity = {
	audit_event_uuid: string;
	action: string;
	entity_type: string;
	created_at: string;
	actor: { display_name: string } | null;
};

function firstRelation<T>(value: unknown): T | null {
	if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
	return (value as T | null) ?? null;
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [orgsResult, billingResult, plansResult, usersResult, changeRequestsResult, auditResult] =
		await Promise.all([
			supabase
				.from('organisation')
				.select(
					'organisation_uuid, org_code, legal_name, trade_name, overall_status, kyc_status, kyb_status, changed_at'
				)
				.order('changed_at', { ascending: false }),
			supabase
				.from('organisation_billing')
				.select('status, billing_plan(plan_type, amount_cents, currency_code, billing_interval)'),
			supabase.from('billing_plan').select('billing_plan_uuid, is_active'),
			supabase.from('profile').select('profile_uuid, role, is_active'),
			supabase
				.from('organisation_change_request')
				.select('organisation_change_request_uuid, status')
				.eq('status', 'pending'),
			supabase
				.from('audit_event')
				.select('audit_event_uuid, action, entity_type, created_at, actor:profile(display_name)')
				.order('created_at', { ascending: false })
				.limit(8)
		]);

	if (orgsResult.error) error(500, 'Unable to load organisations');

	const billingRows = ((billingResult.data ?? []) as unknown[]).map((row) => {
		const record = row as { status: OrganisationBillingStatus; billing_plan: unknown };
		return {
			status: record.status,
			billing_plan: firstRelation<DashboardBillingRow['billing_plan']>(record.billing_plan)
		} satisfies DashboardBillingRow;
	});

	const activity = ((auditResult.data ?? []) as unknown[]).map((row) => {
		const record = row as Omit<DashboardActivity, 'actor'> & { actor: unknown };
		return {
			...record,
			actor: firstRelation<{ display_name: string }>(record.actor)
		} satisfies DashboardActivity;
	});

	return {
		organisations: (orgsResult.data ?? []) as DashboardOrganisation[],
		billing: billingRows,
		planCounts: {
			total: (plansResult.data ?? []).length,
			active: (plansResult.data ?? []).filter((plan) => plan.is_active).length
		},
		userCounts: {
			total: (usersResult.data ?? []).length,
			active: (usersResult.data ?? []).filter((profile) => profile.is_active).length,
			admins: (usersResult.data ?? []).filter(
				(profile) => profile.role === 'platform_admin' && profile.is_active
			).length
		},
		pendingChangeRequests: (changeRequestsResult.data ?? []).length,
		activity
	};
};
