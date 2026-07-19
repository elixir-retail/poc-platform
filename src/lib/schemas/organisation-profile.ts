import { z } from 'zod';

const countryCode = z
	.string()
	.trim()
	.toUpperCase()
	.regex(/^[A-Z]{2}$/);

const currencyCode = z
	.string()
	.trim()
	.toUpperCase()
	.regex(/^[A-Z]{3}$/);

const contactEmail = z
	.string()
	.trim()
	.email()
	.max(160)
	.transform((value) => value.toLowerCase());

const contactPhone = z
	.string()
	.trim()
	.max(32)
	.optional()
	.default('')
	.transform((value) => value || null)
	.refine((value) => value === null || value.length >= 7, {
		message: 'Phone number must be at least 7 characters'
	});

export const tenantProfileSchema = z.object({
	legal_name: z.string().trim().min(2).max(160),
	trade_name: z
		.string()
		.trim()
		.max(160)
		.optional()
		.default('')
		.transform((value) => value || null),
	entity_type: z.string().trim().min(2).max(80),
	contact_email: contactEmail,
	contact_phone: contactPhone,
	country_code: countryCode,
	preferred_language: z.enum(['en', 'hi', 'ta', 'te']),
	primary_currency_code: currencyCode
});

export type TenantProfileInput = z.infer<typeof tenantProfileSchema>;
