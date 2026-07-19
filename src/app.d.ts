import type { Locale } from '$lib/i18n';
import type { OrganisationAppContext, PlatformProfile } from '$lib/types/platform';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			locale: Locale;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
			locale: Locale;
			profile: PlatformProfile | null;
			organisationContext?: OrganisationAppContext;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
