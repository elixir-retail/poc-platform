import type {
	CreateStoreRootUserInput,
	CreateStoreStaffUserInput,
	UpdateStoreUserRoleInput
} from '$lib/schemas/store-users';
import { canManageOrganisation } from '$lib/server/organisation-auth';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import type { OrganisationAppContext, StoreAppContext, StoreUser } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';


const STORE_USER_COLUMNS =
	'store_user_uuid, org_uuid, store_uuid, user_uuid, email, display_name, role, is_active, created_at, changed_at';

function assertStoreRoot(context: StoreAppContext) {
	if (context.membership.role !== 'root') {
		throw new Error('Only the store admin can manage store users.');
	}
}

export async function listStoreUsers(
	supabase: SupabaseClient,
	context: StoreAppContext
): Promise<StoreUser[]> {
	const { data, error } = await supabase
		.from('store_user')
		.select(STORE_USER_COLUMNS)
		.eq('store_uuid', context.store.store_uuid)
		.order('created_at');
	if (error) throw new Error(error.message);
	return (data ?? []) as StoreUser[];
}

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
		.select(STORE_USER_COLUMNS)
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

export async function createStoreStaffUser(
	supabase: SupabaseClient,
	actor: User,
	context: StoreAppContext,
	input: CreateStoreStaffUserInput
): Promise<StoreUser> {
	assertStoreRoot(context);

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
			org_uuid: context.store.org_uuid,
			store_uuid: context.store.store_uuid,
			user_uuid: userUuid,
			email: input.email,
			display_name: input.display_name,
			role: input.role,
			is_active: true,
			created_by: actor.id,
			changed_by: actor.id
		})
		.select(STORE_USER_COLUMNS)
		.single();

	if (membershipError || !membership) {
		await admin.auth.admin.deleteUser(userUuid);
		if (membershipError?.code === '23505') {
			throw new Error('A store user with this email already exists.');
		}
		throw new Error(membershipError?.message ?? 'Unable to create store user');
	}

	return membership as StoreUser;
}

export async function updateStoreUserRole(
	supabase: SupabaseClient,
	actor: User,
	context: StoreAppContext,
	input: UpdateStoreUserRoleInput
): Promise<StoreUser> {
	assertStoreRoot(context);
	if (input.store_user_uuid === context.membership.store_user_uuid) {
		throw new Error('You cannot change your own role.');
	}

	const { data, error } = await supabase
		.from('store_user')
		.update({
			role: input.role,
			changed_by: actor.id,
			changed_at: new Date().toISOString()
		})
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_user_uuid', input.store_user_uuid)
		.neq('role', 'root')
		.select(STORE_USER_COLUMNS)
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) throw new Error('Store user not found or role cannot be changed.');
	return data as StoreUser;
}

export async function deactivateStoreUser(
	supabase: SupabaseClient,
	actor: User,
	context: StoreAppContext,
	storeUserUuid: string
): Promise<void> {
	assertStoreRoot(context);
	if (storeUserUuid === context.membership.store_user_uuid) {
		throw new Error('You cannot deactivate your own account.');
	}

	const { data, error } = await supabase
		.from('store_user')
		.update({
			is_active: false,
			changed_by: actor.id,
			changed_at: new Date().toISOString()
		})
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_user_uuid', storeUserUuid)
		.neq('role', 'root')
		.select('store_user_uuid')
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) throw new Error('Store user not found or cannot be deactivated.');
}

export async function deleteStoreUser(
	supabase: SupabaseClient,
	actor: User,
	context: StoreAppContext,
	storeUserUuid: string
): Promise<void> {
	assertStoreRoot(context);
	if (storeUserUuid === context.membership.store_user_uuid) {
		throw new Error('You cannot delete your own account.');
	}

	const { data: existing, error: loadError } = await supabase
		.from('store_user')
		.select('store_user_uuid, user_uuid, role')
		.eq('store_uuid', context.store.store_uuid)
		.eq('store_user_uuid', storeUserUuid)
		.maybeSingle();
	if (loadError) throw new Error(loadError.message);
	if (!existing) throw new Error('Store user not found.');
	if (existing.role === 'root') throw new Error('The store admin account cannot be deleted.');

	const admin = getSupabaseAdmin();
	const { data: deleted, error } = await admin
		.from('store_user')
		.delete()
		.eq('store_user_uuid', storeUserUuid)
		.eq('store_uuid', context.store.store_uuid)
		.neq('role', 'root')
		.select('store_user_uuid')
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!deleted) throw new Error('Unable to delete store user.');

	const { error: authError } = await admin.auth.admin.deleteUser(existing.user_uuid);
	if (authError) throw new Error(authError.message);
	void actor;
}
