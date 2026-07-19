import type { CreateStoreRootUserInput } from '$lib/schemas/store-users';
import { canManageOrganisation } from '$lib/server/organisation-auth';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import type { OrganisationAppContext, StoreUser } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function createStoreRootUser(
	supabase: SupabaseClient,
	actor: User,
	context: OrganisationAppContext,
	storeUuid: string,
	input: CreateStoreRootUserInput
): Promise<StoreUser> {
	if (!canManageOrganisation(context.membership.role)) {
		throw new Error('Only organisation administrators can create store root users.');
	}

	const { data: store, error: storeError } = await supabase
		.from('store')
		.select('store_uuid, name')
		.eq('store_uuid', storeUuid)
		.eq('org_uuid', context.organisation.organisation_uuid)
		.maybeSingle();
	if (storeError) throw new Error(storeError.message);
	if (!store) throw new Error('Store not found');

	const admin = getSupabaseAdmin();
	const { data: authData, error: authError } = await admin.auth.admin.createUser({
		email: input.email,
		password: input.temporary_password,
		email_confirm: true,
		user_metadata: {
			display_name: input.display_name,
			must_change_password: true,
			account_type: 'store'
		}
	});
	if (authError || !authData.user) {
		throw new Error(authError?.message ?? 'Unable to create store auth user');
	}

	const userUuid = authData.user.id;
	const { data: membership, error: membershipError } = await admin
		.from('store_user')
		.insert({
			org_uuid: context.organisation.organisation_uuid,
			store_uuid: storeUuid,
			user_uuid: userUuid,
			email: input.email,
			display_name: input.display_name,
			role: 'root',
			is_active: true,
			created_by: actor.id,
			changed_by: actor.id
		})
		.select(
			'store_user_uuid, org_uuid, store_uuid, user_uuid, email, display_name, role, is_active, created_at, changed_at'
		)
		.single();

	if (membershipError || !membership) {
		await admin.auth.admin.deleteUser(userUuid);
		throw new Error(membershipError?.message ?? 'Unable to create store membership');
	}

	const { error: auditError } = await supabase.from('organisation_audit_event').insert({
		org_uuid: context.organisation.organisation_uuid,
		actor_organisation_user_uuid: context.membership.organisation_user_uuid,
		action: 'store_user.created',
		entity_type: 'store_user',
		entity_uuid: membership.store_user_uuid,
		after_data: {
			store_uuid: storeUuid,
			store_name: store.name,
			email: input.email,
			display_name: input.display_name,
			role: 'root'
		},
		created_by: actor.id,
		changed_by: actor.id
	});

	if (auditError) {
		await admin.from('store_user').delete().eq('store_user_uuid', membership.store_user_uuid);
		await admin.auth.admin.deleteUser(userUuid);
		throw new Error(`Audit write failed: ${auditError.message}`);
	}

	return membership as StoreUser;
}
