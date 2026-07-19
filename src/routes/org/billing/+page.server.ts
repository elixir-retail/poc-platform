import { error } from '@sveltejs/kit';
import type { BillingPlan, OrganisationBilling } from '$lib/types/platform';
import type { PageServerLoad } from './$types';

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) return value[0] ?? null;
	return value ?? null;
}

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { organisationContext } = await parent();
	const orgUuid = organisationContext.organisation.organisation_uuid;

	const { data, error: billingError } = await supabase
		.from('organisation_billing')
		.select(
			`
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
		`
		)
		.eq('org_uuid', orgUuid)
		.maybeSingle();

	if (billingError) error(500, 'Unable to load billing details');

	const billing = data
		? ({
				...data,
				billing_plan: firstRelation<BillingPlan>(data.billing_plan as BillingPlan | BillingPlan[])
			} as OrganisationBilling & { billing_plan: BillingPlan | null })
		: null;

	return { billing };
};
