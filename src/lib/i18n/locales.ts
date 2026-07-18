export const LOCALES = ['en', 'hi', 'ta', 'te'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_COOKIE = 'locale';

export const LOCALE_LABELS: Record<Locale, string> = {
	en: 'English',
	hi: 'हिन्दी',
	ta: 'தமிழ்',
	te: 'తెలుగు'
};

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | undefined | null): Locale {
	return isLocale(value) ? value : DEFAULT_LOCALE;
}
