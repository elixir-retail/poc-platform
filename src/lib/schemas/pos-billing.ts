import { z } from 'zod';

export const PAYMENT_METHODS = ['cash', 'card', 'upi', 'voucher'] as const;

export const createBillSchema = z.object({
	customer_name: z
		.string()
		.trim()
		.max(120)
		.optional()
		.default('')
		.transform((value) => value || null),
	customer_phone: z
		.string()
		.trim()
		.max(40)
		.optional()
		.default('')
		.transform((value) => value || null)
});

export const addBillLineSchema = z.object({
	store_bill_uuid: z.uuid(),
	store_product_uuid: z.uuid(),
	quantity: z.coerce.number().int().min(1).max(9999).optional().default(1)
});

export const updateBillLineSchema = z.object({
	store_bill_line_uuid: z.uuid(),
	quantity: z.coerce.number().int().min(1).max(9999)
});

export const removeBillLineSchema = z.object({
	store_bill_line_uuid: z.uuid()
});

export const addBillPaymentSchema = z.object({
	store_bill_uuid: z.uuid(),
	payment_method: z.enum(PAYMENT_METHODS),
	amount: z
		.string()
		.trim()
		.min(1)
		.transform(Number)
		.pipe(z.number().finite().gt(0).max(999_999_999).multipleOf(0.01)),
	reference: z
		.string()
		.trim()
		.max(80)
		.optional()
		.default('')
		.transform((value) => value || null)
});

export const billActionSchema = z.object({
	store_bill_uuid: z.uuid()
});

export const updateBillCustomerSchema = z.object({
	store_bill_uuid: z.uuid(),
	customer_name: z
		.string()
		.trim()
		.max(120)
		.optional()
		.default('')
		.transform((value) => value || null),
	customer_phone: z
		.string()
		.trim()
		.max(40)
		.optional()
		.default('')
		.transform((value) => value || null),
	store_customer_uuid: z
		.string()
		.trim()
		.optional()
		.default('')
		.transform((value) => value || null)
		.refine((value) => value === null || z.string().uuid().safeParse(value).success, {
			message: 'Invalid customer'
		})
});
