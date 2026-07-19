import { z } from 'zod';

export const updateInventorySchema = z.object({
	store_inventory_uuid: z.uuid(),
	quantity_on_hand: z.coerce.number().int().min(0).max(999_999_999),
	storage_location: z
		.string()
		.trim()
		.max(120)
		.optional()
		.default('')
		.transform((value) => value || null)
});

export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
