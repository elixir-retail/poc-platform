import { error } from '@sveltejs/kit';
import type { OrganisationListItem } from '$lib/types/platform';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error: queryError } = await supabase
		.from('organisation')
		.select(
			`
			organisation_uuid,
			org_code,
			legal_name,
			trade_name,
			country_code,
			preferred_language,
			primary_currency_code,
			overall_status,
			kyc_status,
			kyb_status,
			changed_at,
			organisation_currency(currency_code, is_primary),
			organisation_tax_id(tax_type, tax_value, is_primary, verification_status)
		`
		)
		.order('changed_at', { ascending: false });

	if (queryError) {
		error(500, 'Unable to load onboarding organisations');
	}

	return { organisations: (data ?? []) as OrganisationListItem[] };
};
