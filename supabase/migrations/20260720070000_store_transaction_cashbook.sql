-- Cashbook fields on store_transaction for bunk-shop expenses & intakes.

alter table public.store_transaction
  add column if not exists direction text not null default 'in',
  add column if not exists entry_type text not null default 'sale',
  add column if not exists notes text,
  add column if not exists category text;

alter table public.store_transaction
  drop constraint if exists store_transaction_direction_check;

alter table public.store_transaction
  add constraint store_transaction_direction_check
  check (direction in ('in', 'out'));

alter table public.store_transaction
  drop constraint if exists store_transaction_entry_type_check;

alter table public.store_transaction
  add constraint store_transaction_entry_type_check
  check (entry_type in ('sale', 'cash_intake', 'expense', 'upi_intake', 'card_intake'));

create index if not exists store_transaction_store_entry_idx
  on public.store_transaction (store_uuid, entry_type, occurred_at desc);

-- Existing POS sale rows stay direction=in, entry_type=sale via defaults.
update public.store_transaction
set
  direction = coalesce(direction, 'in'),
  entry_type = coalesce(entry_type, 'sale')
where true;
