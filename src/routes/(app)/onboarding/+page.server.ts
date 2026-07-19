import { error, fail, isRedirect, redirect } from '@sveltejs/kit';
import { createOrganisationSchema } from '$lib/schemas/onboarding';
import { createOrganisation } from '$lib/server/organisation-create';
import { getPlatformProfile } from '$lib/server/platform-auth';
import type { OrganisationListItem, PlatformProfile } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 10;

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

function parsePage(value: string | null): number {
	const parsed = Number(value ?? '1');
	if (!Number.isFinite(parsed) || parsed < 1) return 1;
	return Math.floor(parsed);
}

export const load: PageServerLoad = async ({ url, locals: { supabase } }) => {
	const requestedPage = parsePage(url.searchParams.get('page'));
	const from = (requestedPage - 1) * PAGE_SIZE;
	const to = from + PAGE_SIZE - 1;

	const {
		data,
		error: queryError,
		count
	} = await supabase
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
		`,
			{ count: 'exact' }
		)
		.order('changed_at', { ascending: false })
		.range(from, to);

	if (queryError) {
		error(500, 'Unable to load onboarding organisations');
	}

	const total = count ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);

	if (total > 0 && requestedPage > totalPages) {
		const params = new URLSearchParams(url.searchParams);
		if (totalPages <= 1) params.delete('page');
		else params.set('page', String(totalPages));
		const query = params.toString();
		redirect(303, query ? `/onboarding?${query}` : '/onboarding');
	}

	return {
		organisations: (data ?? []) as OrganisationListItem[],
		pagination: {
			page: requestedPage,
			perPage: PAGE_SIZE,
			total,
			totalPages
		}
	};
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
