import { z } from 'zod';

export const STORE_BUSINESS_MODES = ['retail', 'service', 'hybrid'] as const;

export const RETAIL_CATEGORIES = [
	'grocery_supermarket',
	'convenience',
	'bunk_shop',
	'pharmacy_health',
	'electronics_mobile',
	'clothing_fashion',
	'home_furniture',
	'automotive_parts',
	'fuel',
	'hardware_building',
	'beauty_personal_care',
	'general_merchandise',
	'specialty_other'
] as const;

export const SERVICE_CATEGORIES = [
	'salon_beauty',
	'spa_wellness',
	'massage',
	'tailoring_alterations',
	'electronics_repair',
	'automotive_service',
	'healthcare',
	'home_maintenance',
	'professional',
	'education',
	'hospitality',
	'service_other'
] as const;

export const GOODS_CHARACTERISTICS = [
	'perishable',
	'shelf_stable',
	'frozen',
	'regulated',
	'high_value',
	'serialized',
	'made_to_order',
	'digital'
] as const;

export const SERVICE_MODELS = [
	'walk_in',
	'appointment',
	'hourly',
	'fixed_job',
	'recurring',
	'field_service',
	'emergency'
] as const;

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.default('')
		.transform((value) => value || null);

export const createStoreSchema = z
	.object({
		name: z.string().trim().min(2).max(160),
		description: optionalText(500),
		business_mode: z.enum(STORE_BUSINESS_MODES),
		retail_category: z.enum(RETAIL_CATEGORIES).nullable(),
		service_category: z.enum(SERVICE_CATEGORIES).nullable(),
		goods_characteristics: z.array(z.enum(GOODS_CHARACTERISTICS)).default([]),
		service_models: z.array(z.enum(SERVICE_MODELS)).default([]),
		currency_code: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/),
		email: z
			.union([z.literal(''), z.string().trim().email().max(160)])
			.optional()
			.default('')
			.transform((value) => value || null),
		phone: optionalText(32),
		address_line_1: z.string().trim().min(2).max(160),
		address_line_2: optionalText(160),
		city: z.string().trim().min(1).max(80),
		region: optionalText(80),
		postal_code: optionalText(32),
		country_code: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{2}$/)
	})
	.superRefine((data, context) => {
		if (data.business_mode !== 'service' && !data.retail_category) {
			context.addIssue({
				code: 'custom',
				path: ['retail_category'],
				message: 'Choose a retail category'
			});
		}
		if (data.business_mode !== 'retail' && !data.service_category) {
			context.addIssue({
				code: 'custom',
				path: ['service_category'],
				message: 'Choose a service category'
			});
		}
		if (data.business_mode !== 'service' && data.goods_characteristics.length === 0) {
			context.addIssue({
				code: 'custom',
				path: ['goods_characteristics'],
				message: 'Choose at least one goods characteristic'
			});
		}
		if (data.business_mode !== 'retail' && data.service_models.length === 0) {
			context.addIssue({
				code: 'custom',
				path: ['service_models'],
				message: 'Choose at least one service model'
			});
		}
	});

export const reviewStoreChangeRequestSchema = z.object({
	store_change_request_uuid: z.uuid(),
	decision: z.enum(['approved', 'rejected']),
	review_notes: z
		.string()
		.trim()
		.max(500)
		.optional()
		.default('')
		.transform((value) => value || null)
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

export const updateStoreSchema = createStoreSchema.and(
	z.object({
		status: z.enum(['active', 'inactive'])
	})
);

export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
