-- Store-scoped retail product catalog with batch and serialized-device traceability.

create table public.store_product (
  store_product_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  store_uuid uuid not null references public.store(store_uuid) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  brand text,
  product_type text not null check (
    product_type in ('standard', 'perishable', 'electronics', 'mobile_phone', 'laptop')
  ),
  product_category text not null,
  price_cents bigint not null check (price_cents >= 0),
  currency_code text not null,
  package_number text,
  gtin text,
  batch_lot_number text,
  manufacturing_date date,
  expiry_date date,
  warranty_months integer check (warranty_months is null or warranty_months between 0 and 240),
  manufacturer_serial_number text,
  imei text,
  tracking_number text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique (store_uuid, sku),
  unique (store_uuid, gtin),
  unique (store_uuid, imei),
  unique (store_uuid, manufacturer_serial_number),
  check (gtin is null or gtin ~ '^[0-9]{8,14}$'),
  check (imei is null or imei ~ '^[0-9]{15}$'),
  check (
    manufacturing_date is null
    or expiry_date is null
    or expiry_date >= manufacturing_date
  ),
  check (product_type <> 'mobile_phone' or imei is not null),
  check (
    product_type <> 'laptop'
    or manufacturer_serial_number is not null
    or tracking_number is not null
  )
);

create index store_product_store_status_idx
  on public.store_product (store_uuid, status, name);

create index store_product_store_category_idx
  on public.store_product (store_uuid, product_category);

alter table public.store_product enable row level security;

create policy store_product_store_select
  on public.store_product
  for select to authenticated
  using (store_uuid = public.current_store_uuid());

create policy store_product_store_insert
  on public.store_product
  for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_product_store_update
  on public.store_product
  for update to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  )
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_product_organisation_select
  on public.store_product
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

grant select, insert, update on public.store_product to authenticated;

-- Demo catalog rows are added to every existing retail or hybrid store.
insert into public.store_product (
  org_uuid,
  store_uuid,
  sku,
  name,
  description,
  brand,
  product_type,
  product_category,
  price_cents,
  currency_code,
  package_number,
  gtin,
  batch_lot_number,
  manufacturing_date,
  expiry_date,
  warranty_months,
  manufacturer_serial_number,
  imei,
  tracking_number,
  status
)
select
  store.org_uuid,
  store.store_uuid,
  demo.sku,
  demo.name,
  demo.description,
  demo.brand,
  demo.product_type,
  demo.product_category,
  demo.price_cents,
  store.currency_code,
  demo.package_number,
  demo.gtin,
  demo.batch_lot_number,
  demo.manufacturing_date,
  demo.expiry_date,
  demo.warranty_months,
  demo.manufacturer_serial_number,
  demo.imei,
  demo.tracking_number,
  'active'
from public.store
cross join (
  values
    (
      'DEMO-RICE-5KG',
      'Premium Basmati Rice 5 kg',
      'Long-grain aged basmati rice.',
      'Harvest Select',
      'perishable',
      'Grocery',
      79900::bigint,
      'PKG-RICE-2026-07',
      '8901234567890',
      'LOT-RICE-0726',
      current_date - 30,
      current_date + 335,
      null::integer,
      null::text,
      null::text,
      null::text
    ),
    (
      'DEMO-PHONE-001',
      'Nova X1 5G Smartphone',
      '128 GB dual-SIM demonstration handset.',
      'Nova',
      'mobile_phone',
      'Mobile Phones',
      2499900::bigint,
      'PKG-NOVA-X1-001',
      '8901234567891',
      'LOT-NOVA-X1',
      current_date - 60,
      null::date,
      12,
      'NVX1SN000001',
      '356938035643809',
      'ASSET-PHONE-0001'
    ),
    (
      'DEMO-LAPTOP-001',
      'ApexBook Pro 14',
      '14-inch business laptop with 16 GB RAM and 512 GB SSD.',
      'Apex',
      'laptop',
      'Computers & Laptops',
      7499900::bigint,
      'PKG-APEX-14-001',
      '8901234567892',
      'LOT-APEX-14',
      current_date - 90,
      null::date,
      24,
      'APX14SN000001',
      null::text,
      'ASSET-LAPTOP-0001'
    ),
    (
      'DEMO-HEADPHONES',
      'Pulse Wireless Headphones',
      'Over-ear Bluetooth headphones.',
      'Pulse Audio',
      'electronics',
      'Audio',
      499900::bigint,
      'PKG-PULSE-HP-01',
      '8901234567893',
      'LOT-PULSE-0626',
      current_date - 45,
      null::date,
      12,
      'PLSHP000001',
      null::text,
      null::text
    )
) as demo(
  sku,
  name,
  description,
  brand,
  product_type,
  product_category,
  price_cents,
  package_number,
  gtin,
  batch_lot_number,
  manufacturing_date,
  expiry_date,
  warranty_months,
  manufacturer_serial_number,
  imei,
  tracking_number
)
where store.business_mode in ('retail', 'hybrid')
on conflict (store_uuid, sku) do nothing;
