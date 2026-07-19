import { z } from 'zod';

export const EXPENSE_CATEGORIES = [
	'rent',
	'utilities',
	'wages',
	'supplies',
	'transport',
	'maintenance',
	'other'
] as const;

export const CASHBOOK_PAYMENT_METHODS = ['cash', 'card', 'upi', 'bank_transfer'] as const;

const amountSchema = z
	.string()
	.trim()
	.regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount')
	.transform((value) => Math.round(Number(value) * 100))
	.refine((cents) => cents > 0, 'Amount must be greater than zero');

const optionalNotes = z
	.string()
	.trim()
	.max(500)
	.optional()
	.default('')
	.transform((value) => value || null);

export const createExpenseSchema = z.object({
	amount: amountSchema,
	category: z.enum(EXPENSE_CATEGORIES),
	payment_method: z.enum(CASHBOOK_PAYMENT_METHODS),
	notes: optionalNotes,
	occurred_at: z
		.string()
		.trim()
		.optional()
		.default('')
		.transform((value) => value || new Date().toISOString())
});

export const createCashIntakeSchema = z.object({
	amount: amountSchema,
	customer_name: z
		.string()
		.trim()
		.max(120)
		.optional()
		.default('')
		.transform((value) => value || null),
	notes: optionalNotes,
	occurred_at: z
		.string()
		.trim()
		.optional()
		.default('')
		.transform((value) => value || new Date().toISOString())
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateCashIntakeInput = z.infer<typeof createCashIntakeSchema>;
