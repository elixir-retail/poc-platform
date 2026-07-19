import { z } from 'zod';

export const PRODUCT_TYPES = [
	'standard',
	'perishable',
	'electronics',
	'mobile_phone',
	'laptop'
] as const;

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.default('')
		.transform((value) => value || null);

const optionalDate = z
	.string()
	.trim()
	.optional()
	.default('')
	.transform((value) => value || null)
	.refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
		message: 'Enter a valid date'
	});

export const createProductSchema = z
	.object({
		sku: z
			.string()
			.trim()
			.min(2)
			.max(50)
			.transform((value) => value.toUpperCase()),
		name: z.string().trim().min(2).max(120),
		description: optionalText(500),
		brand: optionalText(80),
		product_type: z.enum(PRODUCT_TYPES),
		product_category: z.string().trim().min(2).max(80),
		price: z
			.string()
			.trim()
			.min(1, 'Selling price is required')
			.transform(Number)
			.pipe(z.number().finite().min(0).max(999_999_999).multipleOf(0.01)),
		quantity_on_hand: z
			.union([z.literal(''), z.coerce.number().int().min(0).max(999_999_999)])
			.optional()
			.default('')
			.transform((value) => (value === '' ? 0 : value)),
		package_number: optionalText(80),
		gtin: z
			.string()
			.trim()
			.optional()
			.default('')
			.transform((value) => value || null)
			.refine((value) => value === null || /^\d{8,14}$/.test(value), {
				message: 'GTIN must contain 8 to 14 digits'
			}),
		batch_lot_number: optionalText(20),
		manufacturing_date: optionalDate,
		expiry_date: optionalDate,
		warranty_months: z
			.union([z.literal(''), z.coerce.number().int().min(0).max(240)])
			.optional()
			.default('')
			.transform((value) => (value === '' ? null : value)),
		manufacturer_serial_number: optionalText(80),
		imei: z
			.string()
			.trim()
			.optional()
			.default('')
			.transform((value) => value || null)
			.refine((value) => value === null || /^\d{15}$/.test(value), {
				message: 'IMEI must contain exactly 15 digits'
			}),
		tracking_number: optionalText(80)
	})
	.superRefine((data, ctx) => {
		if (data.manufacturing_date && data.expiry_date && data.expiry_date < data.manufacturing_date) {
			ctx.addIssue({
				code: 'custom',
				path: ['expiry_date'],
				message: 'Expiry date cannot be before the manufacturing date'
			});
		}

		if (data.product_type === 'mobile_phone' && !data.imei) {
			ctx.addIssue({
				code: 'custom',
				path: ['imei'],
				message: 'IMEI is required for a mobile phone'
			});
		}

		if (
			data.product_type === 'laptop' &&
			!data.manufacturer_serial_number &&
			!data.tracking_number
		) {
			ctx.addIssue({
				code: 'custom',
				path: ['manufacturer_serial_number'],
				message: 'Enter a serial number or tracking number for a laptop'
			});
		}
	});

export type CreateProductInput = z.infer<typeof createProductSchema>;
