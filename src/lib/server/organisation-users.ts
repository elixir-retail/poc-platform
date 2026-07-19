import type { CreateOrganisationUserInput } from '$lib/schemas/organisation-users';
import { canManageOrganisation } from '$lib/server/organisation-auth';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import type { OrganisationAppContext, OrganisationUser } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function createOrganisationUser(
	supabase: SupabaseClient,
	actor: User,
	context: OrganisationAppContext,
	input: CreateOrganisationUserInput
): Promise<OrganisationUser> {
	if (!canManageOrganisation(context.membership.role)) {
		throw new Error('Only organisation administrators can create users.');
	}

	const admin = getSupabaseAdmin();
	const { data: authData, error: authError } = await admin.auth.admin.createUser({
		email: input.email,
		password: input.temporary_password,
		email_confirm: true,
		user_metadata: {
			display_name: input.display_name,
			must_change_password: true,
			account_type: 'organisation'
		}
	});

	if (authError || !authData.user) {
		throw new Error(authError?.message ?? 'Unable to create auth user');
	}

	const userUuid = authData.user.id;
	const { data: membership, error: membershipError } = await supabase
		.from('organisation_user')
		.insert({
			org_uuid: context.organisation.organisation_uuid,
			user_uuid: userUuid,
			email: input.email,
			display_name: input.display_name,
			role: input.role,
			is_active: true,
			created_by: actor.id,
			changed_by: actor.id
		})
		.select(
			'organisation_user_uuid, org_uuid, user_uuid, email, display_name, role, is_active, created_at, changed_at'
		)
		.single();

	if (membershipError || !membership) {
		await admin.auth.admin.deleteUser(userUuid);
		throw new Error(membershipError?.message ?? 'Unable to create organisation membership');
	}

	const { error: auditError } = await supabase.from('organisation_audit_event').insert({
		org_uuid: context.organisation.organisation_uuid,
		actor_organisation_user_uuid: context.membership.organisation_user_uuid,
		action: 'organisation_user.created',
		entity_type: 'organisation_user',
		entity_uuid: membership.organisation_user_uuid,
		after_data: {
			email: input.email,
			display_name: input.display_name,
			role: input.role,
			is_active: true
		},
		created_by: actor.id,
		changed_by: actor.id
	});

	if (auditError) {
		await admin
			.from('organisation_user')
			.delete()
			.eq('organisation_user_uuid', membership.organisation_user_uuid);
		await admin.auth.admin.deleteUser(userUuid);
		throw new Error(`Audit write failed: ${auditError.message}`);
	}

	return membership as OrganisationUser;
}
