import { getPlatformProfile } from '$lib/server/platform-auth';
import { getStoreUser } from '$lib/server/store-auth';
import type {
	OrganisationAppContext,
	OrganisationUser,
	OrganisationUserRole
} from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function getOrganisationUser(
	supabase: SupabaseClient,
	user: User | null
): Promise<OrganisationUser | null> {
	if (!user) return null;

	const { data, error } = await supabase
		.from('organisation_user')
		.select(
			'organisation_user_uuid, org_uuid, user_uuid, email, display_name, role, is_active, created_at, changed_at'
		)
		.eq('user_uuid', user.id)
		.eq('is_active', true)
		.maybeSingle();

	if (error || !data) return null;
	if (!['root', 'admin', 'viewer'].includes(data.role)) return null;
	return data as OrganisationUser;
}

export async function getOrganisationAppContext(
	supabase: SupabaseClient,
	user: User | null
): Promise<OrganisationAppContext | null> {
	const membership = await getOrganisationUser(supabase, user);
	if (!membership) return null;

	const { data: organisation, error } = await supabase
		.from('organisation')
		.select(
			'organisation_uuid, org_code, legal_name, trade_name, contact_email, contact_phone, country_code, primary_currency_code, overall_status'
		)
		.eq('organisation_uuid', membership.org_uuid)
		.maybeSingle();

	if (error || !organisation) return null;

	return {
		membership,
		organisation: organisation as OrganisationAppContext['organisation']
	};
}

export function canManageOrganisation(role: OrganisationUserRole): boolean {
	return role === 'root' || role === 'admin';
}

export async function resolveAuthenticatedDestination(
	supabase: SupabaseClient,
	user: User | null
): Promise<
	'/' | '/org' | '/org/change-password' | '/store' | '/store/change-password' | '/unauthorized'
> {
	if (!user) return '/unauthorized';

	const profile = await getPlatformProfile(supabase, user);
	if (profile) return '/';

	const accountType = user.user_metadata?.account_type;
	if (accountType === 'store') {
		const storeUser = await getStoreUser(supabase, user);
		if (storeUser) {
			return user.user_metadata?.must_change_password ? '/store/change-password' : '/store';
		}
	}

	const organisationUser = await getOrganisationUser(supabase, user);
	if (organisationUser) {
		return user.user_metadata?.must_change_password ? '/org/change-password' : '/org';
	}

	const storeUser = await getStoreUser(supabase, user);
	if (!storeUser) return '/unauthorized';

	return user.user_metadata?.must_change_password ? '/store/change-password' : '/store';
}
