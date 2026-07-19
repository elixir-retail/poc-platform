import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { PlatformProfile } from '$lib/types/platform';

export async function getPlatformProfile(
	supabase: SupabaseClient,
	user: User | null
): Promise<PlatformProfile | null> {
	if (!user) return null;

	const { data, error } = await supabase
		.from('profile')
		.select('profile_uuid, user_uuid, email, display_name, role, is_active, avatar_url')
		.eq('user_uuid', user.id)
		.eq('is_active', true)
		.maybeSingle();

	if (error || !data) return null;
	if (data.role !== 'platform_admin' && data.role !== 'platform_op') return null;

	return data as PlatformProfile;
}
