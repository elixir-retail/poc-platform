import { writeAudit } from '$lib/server/audit';
import type { WorkflowActor } from '$lib/server/onboarding-workflow';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import type { PlatformRole } from '$lib/types/platform';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CreatePlatformUserInput = {
	display_name: string;
	email: string;
	temporary_password: string;
	role: PlatformRole;
};

export type UpdatePlatformUserInput = {
	profile_uuid: string;
	role: PlatformRole;
	is_active: boolean;
};

export async function createPlatformUser(
	sessionClient: SupabaseClient,
	actor: WorkflowActor,
	input: CreatePlatformUserInput
): Promise<{ profile_uuid: string }> {
	if (actor.profile.role !== 'platform_admin' && input.role === 'platform_admin') {
		throw new Error('Only platform administrators can assign the admin role.');
	}

	const role: PlatformRole = actor.profile.role === 'platform_admin' ? input.role : 'platform_op';

	const admin = getSupabaseAdmin();
	const { data: authData, error: authError } = await admin.auth.admin.createUser({
		email: input.email,
		password: input.temporary_password,
		email_confirm: true,
		user_metadata: {
			display_name: input.display_name
		}
	});

	if (authError || !authData.user) {
		throw new Error(authError?.message ?? 'Unable to create auth user');
	}

	const userUuid = authData.user.id;
	const { data: profile, error: profileError } = await admin
		.from('profile')
		.insert({
			user_uuid: userUuid,
			email: input.email,
			display_name: input.display_name,
			role,
			is_active: true,
			created_by: actor.user.id,
			changed_by: actor.user.id
		})
		.select('profile_uuid')
		.single();

	if (profileError || !profile) {
		await admin.auth.admin.deleteUser(userUuid);
		throw new Error(profileError?.message ?? 'Unable to create platform profile');
	}

	await writeAudit(sessionClient, {
		actorProfileUuid: actor.profile.profile_uuid,
		actorUserUuid: actor.user.id,
		action: 'profile.created',
		entityType: 'profile',
		entityUuid: profile.profile_uuid,
		afterData: {
			email: input.email,
			display_name: input.display_name,
			role,
			is_active: true
		}
	});

	return { profile_uuid: profile.profile_uuid };
}

export async function updatePlatformUser(
	sessionClient: SupabaseClient,
	actor: WorkflowActor,
	input: UpdatePlatformUserInput
): Promise<void> {
	if (actor.profile.role !== 'platform_admin') {
		throw new Error('Only platform administrators can change roles or activation.');
	}

	const { data: before, error: beforeError } = await sessionClient
		.from('profile')
		.select('profile_uuid, email, display_name, role, is_active')
		.eq('profile_uuid', input.profile_uuid)
		.single();

	if (beforeError || !before) {
		throw new Error('Platform user not found');
	}

	const { error: updateError } = await sessionClient
		.from('profile')
		.update({
			role: input.role,
			is_active: input.is_active,
			changed_by: actor.user.id,
			changed_at: new Date().toISOString()
		})
		.eq('profile_uuid', input.profile_uuid);

	if (updateError) throw new Error(updateError.message);

	await writeAudit(sessionClient, {
		actorProfileUuid: actor.profile.profile_uuid,
		actorUserUuid: actor.user.id,
		action: 'profile.updated',
		entityType: 'profile',
		entityUuid: input.profile_uuid,
		beforeData: before,
		afterData: {
			role: input.role,
			is_active: input.is_active
		}
	});
}
