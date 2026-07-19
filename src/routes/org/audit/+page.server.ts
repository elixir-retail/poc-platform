import { error } from '@sveltejs/kit';
import type { OrganisationAuditEvent, OrganisationUser } from '$lib/types/platform';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { organisationContext } = await parent();
	const [eventsResult, usersResult] = await Promise.all([
		supabase
			.from('organisation_audit_event')
			.select(
				'organisation_audit_event_uuid, org_uuid, actor_organisation_user_uuid, action, entity_type, entity_uuid, before_data, after_data, created_at'
			)
			.eq('org_uuid', organisationContext.organisation.organisation_uuid)
			.order('created_at', { ascending: false })
			.limit(100),
		supabase
			.from('organisation_user')
			.select(
				'organisation_user_uuid, org_uuid, user_uuid, email, display_name, role, is_active, created_at, changed_at'
			)
			.eq('org_uuid', organisationContext.organisation.organisation_uuid)
	]);

	if (eventsResult.error) error(500, 'Unable to load organisation audit events');
	if (usersResult.error) error(500, 'Unable to load organisation users');

	return {
		events: (eventsResult.data ?? []) as OrganisationAuditEvent[],
		organisationUsers: (usersResult.data ?? []) as OrganisationUser[]
	};
};
