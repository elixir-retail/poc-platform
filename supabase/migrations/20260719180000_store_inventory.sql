-- Store-level stock-on-hand records for retail products.

create table public.store_inventory (
  store_inventory_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  store_uuid uuid not null references public.store(store_uuid) on delete cascade,
  store_product_uuid uuid not null references public.store_product(store_product_uuid) on delete cascade,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  reorder_level integer not null default 5 check (reorder_level >= 0),
  storage_location text,
  last_counted_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique (store_uuid, store_product_uuid)
);

create index store_inventory_store_quantity_idx
  on public.store_inventory (store_uuid, quantity_on_hand);

alter table public.store_inventory enable row level security;

create policy store_inventory_store_select
  on public.store_inventory
  for select to authenticated
  using (store_uuid = public.current_store_uuid());

create policy store_inventory_store_insert
  on public.store_inventory
  for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_inventory_store_update
  on public.store_inventory
  for update to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  )
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_inventory_organisation_select
  on public.store_inventory
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

grant select, insert, update on public.store_inventory to authenticated;

insert into public.store_inventory (
  org_uuid,
  store_uuid,
  store_product_uuid,
  quantity_on_hand,
  reorder_level,
  storage_location,
  last_counted_at
)
select
  product.org_uuid,
  product.store_uuid,
  product.store_product_uuid,
  case product.sku
    when 'DEMO-RICE-5KG' then 42
    when 'DEMO-PHONE-001' then 7
    when 'DEMO-LAPTOP-001' then 3
    when 'DEMO-HEADPHONES' then 18
    else 0
  end,
  case product.sku
    when 'DEMO-RICE-5KG' then 10
    when 'DEMO-PHONE-001' then 3
    when 'DEMO-LAPTOP-001' then 4
    when 'DEMO-HEADPHONES' then 5
    else 5
  end,
  case product.sku
    when 'DEMO-RICE-5KG' then 'Aisle A · Rack 01'
    when 'DEMO-PHONE-001' then 'Secure cabinet · Mobile'
    when 'DEMO-LAPTOP-001' then 'Secure cabinet · Computing'
    when 'DEMO-HEADPHONES' then 'Aisle E · Audio'
    else 'Main stockroom'
  end,
  now() - case product.sku
    when 'DEMO-RICE-5KG' then interval '2 hours'
    when 'DEMO-PHONE-001' then interval '1 day'
    when 'DEMO-LAPTOP-001' then interval '3 hours'
    when 'DEMO-HEADPHONES' then interval '6 hours'
    else interval '0 hours'
  end
from public.store_product product
on conflict (store_uuid, store_product_uuid) do nothing;
