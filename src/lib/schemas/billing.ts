import { z } from 'zod';

const moneyCents = z.coerce.number().int().min(0).max(1_000_000_000);

export const createBillingPlanSchema = z
	.object({
		plan_code: z
			.string()
			.trim()
			.min(2)
			.max(40)
			.regex(/^[A-Z0-9_]+$/, 'Use uppercase letters, numbers, and underscores')
			.transform((value) => value.toUpperCase()),
		name: z.string().trim().min(2).max(120),
		description: z
			.string()
			.trim()
			.max(500)
			.optional()
			.transform((value) => (value ? value : null)),
		plan_type: z.enum(['free', 'paid']),
		amount_cents: moneyCents.optional().default(0),
		currency_code: z
			.string()
			.trim()
			.length(3)
			.transform((value) => value.toUpperCase())
			.optional()
			.default('INR'),
		billing_interval: z.enum(['none', 'monthly', 'yearly']).optional().default('none'),
		is_active: z
			.union([z.literal('true'), z.literal('false'), z.boolean()])
			.optional()
			.default(true)
			.transform((value) => value === true || value === 'true')
	})
	.superRefine((data, ctx) => {
		if (data.plan_type === 'free') {
			if (data.amount_cents !== 0) {
				ctx.addIssue({
					code: 'custom',
					path: ['amount_cents'],
					message: 'Free plans must have a zero amount'
				});
			}
			if (data.billing_interval !== 'none') {
				ctx.addIssue({
					code: 'custom',
					path: ['billing_interval'],
					message: 'Free plans must use no billing interval'
				});
			}
			return;
		}

		if (data.amount_cents <= 0) {
			ctx.addIssue({
				code: 'custom',
				path: ['amount_cents'],
				message: 'Paid plans need an amount greater than zero'
			});
		}
		if (data.billing_interval === 'none') {
			ctx.addIssue({
				code: 'custom',
				path: ['billing_interval'],
				message: 'Paid plans need a monthly or yearly interval'
			});
		}
	});

export const assignOrganisationBillingSchema = z.object({
	org_uuid: z.uuid(),
	billing_plan_uuid: z.uuid(),
	status: z.enum(['free', 'trial', 'active', 'past_due', 'cancelled', 'suspended']),
	notes: z
		.string()
		.trim()
		.max(1000)
		.optional()
		.transform((value) => (value ? value : null)),
	next_billing_at: z
		.string()
		.trim()
		.optional()
		.transform((value) => (value ? value : null))
});

export const updateOrganisationBillingSchema = assignOrganisationBillingSchema.extend({
	organisation_billing_uuid: z.uuid().optional()
});
