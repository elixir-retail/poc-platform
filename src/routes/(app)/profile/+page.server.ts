import { error, fail } from '@sveltejs/kit';
import { writeAudit } from '$lib/server/audit';
import { getPlatformProfile } from '$lib/server/platform-auth';
import type { PlatformProfile } from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Actions } from './$types';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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

async function setAvatarUrl(
	supabase: SupabaseClient,
	actor: { user: User; profile: PlatformProfile },
	avatarUrl: string | null
): Promise<void> {
	const { error: updateError } = await supabase
		.from('profile')
		.update({
			avatar_url: avatarUrl,
			changed_by: actor.user.id,
			changed_at: new Date().toISOString()
		})
		.eq('profile_uuid', actor.profile.profile_uuid);

	if (updateError) throw new Error(updateError.message);

	await writeAudit(supabase, {
		orgUuid: null,
		actorProfileUuid: actor.profile.profile_uuid,
		actorUserUuid: actor.user.id,
		action: avatarUrl ? 'profile.avatar_updated' : 'profile.avatar_removed',
		entityType: 'profile',
		entityUuid: actor.profile.profile_uuid,
		beforeData: { avatar_url: actor.profile.avatar_url },
		afterData: { avatar_url: avatarUrl }
	});
}

export const actions: Actions = {
	updateAvatar: async ({ request, locals: { supabase, safeGetSession } }) => {
		const actor = await requireActor(supabase, safeGetSession);
		const formData = await request.formData();
		const file = formData.get('avatar');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, {
				action: 'updateAvatar',
				success: false as const,
				message: 'Choose an image to upload.'
			});
		}

		if (!AVATAR_MIME_TYPES.includes(file.type)) {
			return fail(400, {
				action: 'updateAvatar',
				success: false as const,
				message: 'Avatar must be a PNG, JPEG, or WebP image.'
			});
		}

		if (file.size > AVATAR_MAX_BYTES) {
			return fail(400, {
				action: 'updateAvatar',
				success: false as const,
				message: 'Avatar must be 2 MB or smaller.'
			});
		}

		const extension =
			file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
		const storagePath = `${actor.user.id}/${crypto.randomUUID()}.${extension}`;

		const { error: uploadError } = await supabase.storage
			.from('avatars')
			.upload(storagePath, file, { contentType: file.type, upsert: false });

		if (uploadError) {
			return fail(500, {
				action: 'updateAvatar',
				success: false as const,
				message: uploadError.message
			});
		}

		const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(storagePath);

		try {
			await setAvatarUrl(supabase, actor, publicUrlData.publicUrl);
		} catch (err) {
			await supabase.storage.from('avatars').remove([storagePath]);
			return fail(500, {
				action: 'updateAvatar',
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to update avatar'
			});
		}

		// Clean up the previous avatar object if it lived in our bucket.
		const previousUrl = actor.profile.avatar_url;
		if (previousUrl) {
			const marker = '/avatars/';
			const index = previousUrl.indexOf(marker);
			if (index !== -1) {
				const previousPath = decodeURIComponent(previousUrl.slice(index + marker.length));
				await supabase.storage.from('avatars').remove([previousPath]);
			}
		}

		return { action: 'updateAvatar', success: true as const, message: 'Avatar updated.' };
	},

	removeAvatar: async ({ locals: { supabase, safeGetSession } }) => {
		const actor = await requireActor(supabase, safeGetSession);

		if (!actor.profile.avatar_url) {
			return { action: 'removeAvatar', success: true as const, message: 'Avatar removed.' };
		}

		try {
			await setAvatarUrl(supabase, actor, null);
		} catch (err) {
			return fail(500, {
				action: 'removeAvatar',
				success: false as const,
				message: err instanceof Error ? err.message : 'Unable to remove avatar'
			});
		}

		const marker = '/avatars/';
		const index = actor.profile.avatar_url.indexOf(marker);
		if (index !== -1) {
			const previousPath = decodeURIComponent(
				actor.profile.avatar_url.slice(index + marker.length)
			);
			await supabase.storage.from('avatars').remove([previousPath]);
		}

		return { action: 'removeAvatar', success: true as const, message: 'Avatar removed.' };
	}
};
