import { z } from 'zod';

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.default('')
		.transform((value) => value || null);

export const createStoreCustomerSchema = z.object({
	full_name: z.string().trim().min(2).max(120),
	phone: z
		.string()
		.trim()
		.min(6, 'Enter a valid phone number')
		.max(40),
	email: z
		.string()
		.trim()
		.max(120)
		.optional()
		.default('')
		.transform((value) => value || null)
		.refine((value) => value === null || z.string().email().safeParse(value).success, {
			message: 'Enter a valid email address'
		}),
	address_line1: optionalText(120),
	address_line2: optionalText(120),
	city: optionalText(80),
	state: optionalText(80),
	postal_code: optionalText(20),
	country: optionalText(80),
	notes: optionalText(500)
});

export const updateStoreCustomerSchema = createStoreCustomerSchema.extend({
	store_customer_uuid: z.uuid(),
	status: z.enum(['active', 'inactive']).optional().default('active')
});

export const customerActionSchema = z.object({
	store_customer_uuid: z.uuid()
});

export type CreateStoreCustomerInput = z.infer<typeof createStoreCustomerSchema>;
export type UpdateStoreCustomerInput = z.infer<typeof updateStoreCustomerSchema>;
