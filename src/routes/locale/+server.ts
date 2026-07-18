import { error, redirect } from '@sveltejs/kit';
import { isLocale, LOCALE_COOKIE } from '$lib/i18n';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const formData = await request.formData();
	const locale = formData.get('locale');
	const redirectTo = String(formData.get('redirectTo') ?? '/');

	if (!isLocale(locale)) {
		error(400, 'Invalid locale');
	}

	cookies.set(LOCALE_COOKIE, locale, {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		sameSite: 'lax',
		httpOnly: true,
		secure: url.protocol === 'https:'
	});

	const safeRedirect =
		redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';

	redirect(303, safeRedirect);
};
