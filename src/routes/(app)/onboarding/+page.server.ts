import { error, fail, isRedirect, redirect } from '@sveltejs/kit';
import { createOrganisationSchema } from '$lib/schemas/onboarding';
import { createOrganisation } from '$lib/server/organisation-create';
import { getPlatformProfile } from '$lib/server/platform-auth';
import type { OrganisationListItem, PlatformProfile } from '$lib/types/platform';
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

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error: queryError } = await supabase
		.from('organisation')
		.select(
			`
			organisation_uuid,
			org_code,
			legal_name,
			trade_name,
			contact_email,
			contact_phone,
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

export const actions: Actions = {
	createOrganisation: async ({ request, locals: { supabase, safeGetSession } }) => {
		const actor = await requireActor(supabase, safeGetSession);
		const formData = await request.formData();
		const parsed = createOrganisationSchema.safeParse(Object.fromEntries(formData));

		if (!parsed.success) {
			return fail(400, {
				action: 'createOrganisation',
				message: 'Check the organisation details.',
				success: false as const
			});
		}

		try {
			const organisation = await createOrganisation(supabase, actor, parsed.data);
			redirect(303, `/onboarding/${organisation.org_code}?step=overview`);
		} catch (err) {
			if (isRedirect(err)) throw err;
			return fail(500, {
				action: 'createOrganisation',
				message: err instanceof Error ? err.message : 'Unable to create organisation',
				success: false as const
			});
		}
	}
};
