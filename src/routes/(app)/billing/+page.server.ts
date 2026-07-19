import { error, fail } from '@sveltejs/kit';
import { assignOrganisationBillingSchema, createBillingPlanSchema } from '$lib/schemas/billing';
import { assignOrganisationBilling, createBillingPlan } from '$lib/server/billing';
import { getPlatformProfile } from '$lib/server/platform-auth';
import type {
	BillingPlan,
	OrganisationBilling,
	OrganisationBillingListItem,
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

type OrgBillingRow = {
	organisation_uuid: string;
	org_code: string;
	legal_name: string;
	trade_name: string | null;
	contact_email: string;
	country_code: string;
	overall_status: OrganisationBillingListItem['overall_status'];
	organisation_billing: unknown;
};

function firstRelation<T>(value: unknown): T | null {
	if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
	return (value as T | null) ?? null;
}

function normalizeOrgBilling(row: OrgBillingRow): OrganisationBillingListItem {
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
		contact_email: row.contact_email,
		country_code: row.country_code,
		overall_status: row.overall_status,
		organisation_billing: billing
	};
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [plansResult, orgsResult] = await Promise.all([
		supabase
			.from('billing_plan')
			.select(
				'billing_plan_uuid, plan_code, name, description, plan_type, amount_cents, currency_code, billing_interval, is_active, created_at, changed_at'
			)
			.order('plan_type', { ascending: true })
			.order('amount_cents', { ascending: true }),
		supabase
			.from('organisation')
			.select(
				`
				organisation_uuid,
				org_code,
				legal_name,
				trade_name,
				contact_email,
				country_code,
				overall_status,
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
			.order('legal_name', { ascending: true })
	]);

	if (plansResult.error) error(500, 'Unable to load billing plans');
	if (orgsResult.error) error(500, 'Unable to load organisation billing');

	return {
		plans: (plansResult.data ?? []) as BillingPlan[],
		organisations: ((orgsResult.data ?? []) as unknown as OrgBillingRow[]).map(normalizeOrgBilling)
	};
};

export const actions: Actions = {
	createPlan: async ({ request, locals: { supabase, safeGetSession } }) => {
		const actor = await requireActor(supabase, safeGetSession);
		const parsed = createBillingPlanSchema.safeParse(Object.fromEntries(await request.formData()));

		if (!parsed.success) {
			return fail(400, {
				action: 'createPlan',
				success: false as const,
				message: 'Check the billing plan details.'
			});
		}

		try {
			await createBillingPlan(supabase, actor, parsed.data);
			return {
				action: 'createPlan',
				success: true as const,
				message: 'Billing plan created.'
			};
		} catch (err) {
			return fail(400, {
				action: 'createPlan',
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to create billing plan'
			});
		}
	},

	assignBilling: async ({ request, locals: { supabase, safeGetSession } }) => {
		const actor = await requireActor(supabase, safeGetSession);
		const parsed = assignOrganisationBillingSchema.safeParse(
			Object.fromEntries(await request.formData())
		);

		if (!parsed.success) {
			return fail(400, {
				action: 'assignBilling',
				success: false as const,
				message: 'Check the organisation billing assignment.'
			});
		}

		try {
			await assignOrganisationBilling(supabase, actor, parsed.data);
			return {
				action: 'assignBilling',
				success: true as const,
				message: 'Organisation billing updated.'
			};
		} catch (err) {
			return fail(400, {
				action: 'assignBilling',
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to assign billing'
			});
		}
	}
};
