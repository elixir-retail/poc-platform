import { error, fail } from '@sveltejs/kit';
import {
	loadOrganisationProfile,
	submitTenantProfileChange
} from '$lib/server/organisation-profile';
import { getOrganisationAppContext } from '$lib/server/organisation-auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { organisationContext } = await parent();

	try {
		const profile = await loadOrganisationProfile(
			supabase,
			organisationContext.organisation.organisation_uuid
		);
		return { profile };
	} catch {
		error(500, 'Unable to load organisation profile');
	}
};

export const actions: Actions = {
	submitProfile: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();
		if (!user) error(401, 'Authentication required');

		const context = await getOrganisationAppContext(supabase, user);
		if (!context) error(403, 'Organisation access required');

		const formData = await request.formData();

		try {
			const result = await submitTenantProfileChange(supabase, user, context, {
				legal_name: formData.get('legal_name'),
				trade_name: formData.get('trade_name'),
				entity_type: formData.get('entity_type'),
				contact_email: formData.get('contact_email'),
				contact_phone: formData.get('contact_phone'),
				country_code: formData.get('country_code'),
				preferred_language: formData.get('preferred_language'),
				primary_currency_code: formData.get('primary_currency_code')
			});
			return result;
		} catch (err) {
			return fail(400, {
				success: false,
				message: err instanceof Error ? err.message : 'Unable to submit profile changes'
			});
		}
	}
};
