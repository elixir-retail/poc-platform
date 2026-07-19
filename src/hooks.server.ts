import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { LOCALE_COOKIE, resolveLocale } from '$lib/i18n';
import type { Handle } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.locale = resolveLocale(event.cookies.get(LOCALE_COOKIE));

	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	event.locals.safeGetSession = async () => {
		const clearStaleAuthCookies = async () => {
			// Local sign-out clears cookie storage without calling Auth with a dead refresh token.
			await event.locals.supabase.auth.signOut({ scope: 'local' });
			for (const cookie of event.cookies.getAll()) {
				if (cookie.name.includes('-auth-token')) {
					event.cookies.delete(cookie.name, { path: '/' });
				}
			}
		};

		// Validate JWT with the Auth server first — do not trust session.user from cookies.
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error || !user) {
			const hasAuthCookie = event.cookies
				.getAll()
				.some((cookie) => cookie.name.includes('-auth-token'));
			if (hasAuthCookie) {
				await clearStaleAuthCookies();
			}
			return { session: null, user: null };
		}

		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			await clearStaleAuthCookies();
			return { session: null, user: null };
		}

		// Drop cookie-derived user so SvelteKit serialization cannot read it.
		// Always use the separate `user` from getUser() for identity.
		delete (session as { user?: User }).user;

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
		transformPageChunk: ({ html }) =>
			html.replace('<html lang="en">', `<html lang="${event.locals.locale}">`)
	});
};
