-- Remove unused reorder threshold from store inventory.

alter table public.store_inventory
  drop column reorder_level;
