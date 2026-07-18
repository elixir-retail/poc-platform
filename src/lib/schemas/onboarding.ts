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

const verificationStatus = z.enum(['not_started', 'pending', 'approved', 'rejected']);
const taxType = z.enum(['gstin', 'vat', 'cin', 'tan', 'pan', 'tin', 'other']);
const addressType = z.enum(['registered', 'business', 'billing']);
const bankVerification = z.enum(['pending', 'verified', 'rejected']);
const taxVerification = z.enum(['pending', 'verified', 'rejected']);
const onboardingStatus = z.enum([
	'draft',
	'submitted',
	'in_review',
	'changes_requested',
	'partially_approved',
	'onboarded',
	'rejected',
	'suspended'
]);

export const overviewSchema = z.object({
	overall_status: onboardingStatus,
	kyc_status: verificationStatus,
	kyb_status: verificationStatus,
	preferred_language: z.enum(['en', 'hi', 'ta', 'te']),
	country_code: countryCode,
	primary_currency_code: currencyCode
});

export const legalDetailsSchema = z.object({
	legal_name: z.string().trim().min(2).max(160),
	trade_name: z.string().trim().max(160).optional().default(''),
	entity_type: z.string().trim().min(2).max(80)
});

export const currenciesSchema = z.object({
	currency_codes: z.array(currencyCode).min(1),
	primary_currency_code: currencyCode
});

export const taxIdsSchema = z.object({
	tax_uuids: z.array(z.string().uuid().or(z.literal(''))).default([]),
	tax_types: z.array(taxType).min(1),
	tax_values: z.array(z.string().trim().min(1).max(80)).min(1),
	tax_countries: z.array(countryCode).min(1),
	tax_verifications: z.array(taxVerification).min(1),
	primary_tax_index: z.coerce.number().int().min(0).default(0)
});

export const addressSchema = z.object({
	record_uuid: z.string().uuid().optional().or(z.literal('')),
	operation: z.enum(['create', 'update', 'delete']),
	address_type: addressType,
	line_1: z.string().trim().min(2).max(160),
	line_2: z.string().trim().max(160).optional().default(''),
	city: z.string().trim().min(1).max(80),
	region: z.string().trim().max(80).optional().default(''),
	postal_code: z.string().trim().max(32).optional().default(''),
	country_code: countryCode,
	is_primary: z
		.union([z.literal('true'), z.literal('false'), z.boolean()])
		.transform((value) => value === true || value === 'true')
});

export const directorSchema = z.object({
	record_uuid: z.string().uuid().optional().or(z.literal('')),
	operation: z.enum(['create', 'update', 'delete']),
	full_name: z.string().trim().min(2).max(120),
	designation: z.string().trim().max(80).optional().default(''),
	nationality_code: z
		.string()
		.trim()
		.toUpperCase()
		.regex(/^([A-Z]{2})?$/)
		.optional()
		.default(''),
	ownership_percent: z.preprocess(
		(value) => (value === '' || value === undefined || value === null ? 0 : value),
		z.coerce.number().min(0).max(100)
	),
	kyc_status: verificationStatus
});

export const bankSchema = z.object({
	record_uuid: z.string().uuid().optional().or(z.literal('')),
	operation: z.enum(['create', 'update', 'delete']),
	bank_name: z.string().trim().min(2).max(120),
	account_holder_name: z.string().trim().min(2).max(160),
	masked_account_number: z.string().trim().min(4).max(40),
	routing_code: z.string().trim().max(64).optional().default(''),
	currency_code: currencyCode,
	is_primary: z
		.union([z.literal('true'), z.literal('false'), z.boolean()])
		.transform((value) => value === true || value === 'true'),
	verification_status: bankVerification
});

export const documentMetaSchema = z.object({
	record_uuid: z.uuid(),
	operation: z.enum(['update', 'archive']),
	document_type: z.string().trim().min(2).max(80).optional().default('')
});

export const documentReviewSchema = z.object({
	document_uuid: z.uuid(),
	decision: z.enum(['approved', 'rejected']),
	review_notes: z.string().trim().max(500).optional().default('')
});

export const reviewSchema = z.object({
	request_uuid: z.uuid(),
	decision: z.enum(['approved', 'rejected']),
	review_notes: z.string().trim().max(500).optional().default('')
});

export const verificationSchema = z.object({
	verification_type: z.enum(['kyc', 'kyb']),
	status: verificationStatus
});
