import type { SupabaseClient } from '@supabase/supabase-js';

export async function notifyAdmins(
	supabase: SupabaseClient,
	orgUuid: string,
	title: string,
	body: string,
	linkPath: string,
	createdBy: string
): Promise<void> {
	const { data: admins, error: adminError } = await supabase
		.from('profile')
		.select('profile_uuid')
		.eq('role', 'platform_admin')
		.eq('is_active', true);

	if (adminError) {
		throw new Error(`Failed to load admin recipients: ${adminError.message}`);
	}
	if (!admins?.length) return;

	const { error } = await supabase.from('notification').insert(
		admins.map((admin) => ({
			recipient_profile_uuid: admin.profile_uuid,
			org_uuid: orgUuid,
			notification_type: 'approval_required',
			title,
			body,
			link_path: linkPath,
			created_by: createdBy,
			changed_by: createdBy
		}))
	);

	if (error) {
		throw new Error(`Failed to notify admins: ${error.message}`);
	}
}

export async function notifyUser(
	supabase: SupabaseClient,
	userUuid: string,
	orgUuid: string,
	title: string,
	body: string,
	linkPath: string,
	createdBy: string
): Promise<void> {
	const { data: recipient, error: recipientError } = await supabase
		.from('profile')
		.select('profile_uuid')
		.eq('user_uuid', userUuid)
		.eq('is_active', true)
		.maybeSingle();

	if (recipientError) {
		throw new Error(`Failed to load notification recipient: ${recipientError.message}`);
	}
	if (!recipient) return;

	const { error } = await supabase.from('notification').insert({
		recipient_profile_uuid: recipient.profile_uuid,
		org_uuid: orgUuid,
		notification_type: 'approval_decision',
		title,
		body,
		link_path: linkPath,
		created_by: createdBy,
		changed_by: createdBy
	});

	if (error) {
		throw new Error(`Failed to notify user: ${error.message}`);
	}
}
