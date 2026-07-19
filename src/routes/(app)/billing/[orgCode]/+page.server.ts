import { error, fail } from '@sveltejs/kit';
import { assignOrganisationBillingSchema } from '$lib/schemas/billing';
import { assignOrganisationBilling } from '$lib/server/billing';
import { getPlatformProfile } from '$lib/server/platform-auth';
import type {
	BillingPlan,
	OrganisationBilling,
	OrganisationBillingDetail,
	PlatformProfile
} from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Actions, PageServerLoad } from './$types';

async function requireActor(
	supabase: SupabaseClient,
	safeGetSession: App.Locals['safeGetSession']
): Promise<{ user: User; profile: PlatformProfile }> {
	const { user } = await safeGetSession();
	if (!user) error(401, 'Authentication required');
	const profile = await getPlatformProfile(supabase, user);
	if (!profile) error(403, 'Platform access required');
	return { user, profile };
}

type OrgBillingDetailRow = {
	organisation_uuid: string;
	org_code: string;
	legal_name: string;
	trade_name: string | null;
	entity_type: string;
	contact_email: string;
	contact_phone: string | null;
	country_code: string;
	preferred_language: string;
	primary_currency_code: string;
	overall_status: OrganisationBillingDetail['overall_status'];
	kyc_status: OrganisationBillingDetail['kyc_status'];
	kyb_status: OrganisationBillingDetail['kyb_status'];
	organisation_billing: unknown;
};

function firstRelation<T>(value: unknown): T | null {
	if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
	return (value as T | null) ?? null;
}

function normalizeDetail(row: OrgBillingDetailRow): OrganisationBillingDetail {
	const billingRaw = firstRelation<Record<string, unknown>>(row.organisation_billing);
	const billing = billingRaw
		? ({
				...billingRaw,
				billing_plan: firstRelation<BillingPlan>(billingRaw.billing_plan)
			} as OrganisationBilling & { billing_plan: BillingPlan | null })
		: null;

	return {
		organisation_uuid: row.organisation_uuid,
		org_code: row.org_code,
		legal_name: row.legal_name,
		trade_name: row.trade_name,
		entity_type: row.entity_type,
		contact_email: row.contact_email,
		contact_phone: row.contact_phone,
		country_code: row.country_code,
		preferred_language: row.preferred_language,
		primary_currency_code: row.primary_currency_code,
		overall_status: row.overall_status,
		kyc_status: row.kyc_status,
		kyb_status: row.kyb_status,
		organisation_billing: billing
	};
}

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const [orgResult, plansResult] = await Promise.all([
		supabase
			.from('organisation')
			.select(
				`
				organisation_uuid,
				org_code,
				legal_name,
				trade_name,
				entity_type,
				contact_email,
				contact_phone,
				country_code,
				preferred_language,
				primary_currency_code,
				overall_status,
				kyc_status,
				kyb_status,
				organisation_billing(
					organisation_billing_uuid,
					org_uuid,
					billing_plan_uuid,
					status,
					started_at,
					next_billing_at,
					notes,
					created_at,
					changed_at,
					billing_plan(
						billing_plan_uuid,
						plan_code,
						name,
						description,
						plan_type,
						amount_cents,
						currency_code,
						billing_interval,
						is_active,
						created_at,
						changed_at
					)
				)
			`
			)
			.eq('org_code', params.orgCode)
			.maybeSingle(),
		supabase
			.from('billing_plan')
			.select(
				'billing_plan_uuid, plan_code, name, description, plan_type, amount_cents, currency_code, billing_interval, is_active, created_at, changed_at'
			)
			.eq('is_active', true)
			.order('plan_type', { ascending: true })
			.order('amount_cents', { ascending: true })
	]);

	if (orgResult.error) error(500, 'Unable to load organisation billing');
	if (!orgResult.data) error(404, 'Organisation not found');
	if (plansResult.error) error(500, 'Unable to load billing plans');

	return {
		organisation: normalizeDetail(orgResult.data as unknown as OrgBillingDetailRow),
		plans: (plansResult.data ?? []) as BillingPlan[]
	};
};

export const actions: Actions = {
	updateBilling: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const actor = await requireActor(supabase, safeGetSession);
		const formData = Object.fromEntries(await request.formData());
		const parsed = assignOrganisationBillingSchema.safeParse(formData);

		if (!parsed.success) {
			return fail(400, {
				action: 'updateBilling',
				success: false as const,
				message: 'Check the billing details.'
			});
		}

		const { data: organisation, error: orgError } = await supabase
			.from('organisation')
			.select('organisation_uuid, org_code')
			.eq('org_code', params.orgCode)
			.maybeSingle();

		if (orgError) {
			return fail(500, {
				action: 'updateBilling',
				success: false as const,
				message: orgError.message
			});
		}
		if (!organisation || organisation.organisation_uuid !== parsed.data.org_uuid) {
			return fail(400, {
				action: 'updateBilling',
				success: false as const,
				message: 'Organisation mismatch.'
			});
		}

		try {
			const nextBillingAt = parsed.data.next_billing_at
				? new Date(parsed.data.next_billing_at).toISOString()
				: null;

			await assignOrganisationBilling(supabase, actor, {
				...parsed.data,
				next_billing_at: nextBillingAt
			});
			return {
				action: 'updateBilling',
				success: true as const,
				message: 'Organisation billing updated.'
			};
		} catch (err) {
			return fail(400, {
				action: 'updateBilling',
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to update billing'
			});
		}
	}
};
