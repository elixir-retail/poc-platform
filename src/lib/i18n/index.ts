import { DEFAULT_LOCALE, type Locale } from './locales';
import { en, type MessageKey } from './messages/en';
import { hi } from './messages/hi';
import { ta } from './messages/ta';
import { te } from './messages/te';

export {
	DEFAULT_LOCALE,
	isLocale,
	LOCALE_COOKIE,
	LOCALE_LABELS,
	LOCALES,
	resolveLocale,
	type Locale
} from './locales';
export type { MessageKey } from './messages/en';

const dictionaries = {
	en,
	hi,
	ta,
	te
} as const;

export type TranslateParams = Record<string, string | number>;

export function t(locale: Locale, key: MessageKey, params?: TranslateParams): string {
	const template = dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;

	if (!params) {
		return template;
	}

	return template.replace(/\{(\w+)\}/g, (_, name: string) => {
		const value = params[name];
		return value === undefined ? `{${name}}` : String(value);
	});
}

export function createTranslator(locale: Locale) {
	return (key: MessageKey, params?: TranslateParams) => t(locale, key, params);
}
