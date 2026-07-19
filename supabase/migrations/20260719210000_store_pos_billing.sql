-- Point-of-sale bills, line items, and split payments for store checkout.

create table public.store_bill (
  store_bill_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  store_uuid uuid not null references public.store(store_uuid) on delete cascade,
  store_counter_uuid uuid references public.store_counter(store_counter_uuid) on delete set null,
  bill_number integer not null,
  status text not null default 'open' check (status in ('open', 'held', 'completed', 'void')),
  customer_name text,
  customer_phone text,
  currency_code text not null,
  notes text,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique (store_uuid, bill_number)
);

create table public.store_bill_line (
  store_bill_line_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  store_uuid uuid not null references public.store(store_uuid) on delete cascade,
  store_bill_uuid uuid not null references public.store_bill(store_bill_uuid) on delete cascade,
  store_product_uuid uuid references public.store_product(store_product_uuid) on delete set null,
  sku text not null,
  product_name text not null,
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents bigint not null check (line_total_cents >= 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table public.store_bill_payment (
  store_bill_payment_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  store_uuid uuid not null references public.store(store_uuid) on delete cascade,
  store_bill_uuid uuid not null references public.store_bill(store_bill_uuid) on delete cascade,
  payment_method text not null check (payment_method in ('cash', 'card', 'upi', 'voucher')),
  amount_cents bigint not null check (amount_cents > 0),
  reference text,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create index store_bill_store_status_idx
  on public.store_bill (store_uuid, status, bill_number);

create index store_bill_line_bill_idx
  on public.store_bill_line (store_bill_uuid, created_at);

create index store_bill_payment_bill_idx
  on public.store_bill_payment (store_bill_uuid, created_at);

alter table public.store_bill enable row level security;
alter table public.store_bill_line enable row level security;
alter table public.store_bill_payment enable row level security;

create policy store_bill_store_select
  on public.store_bill for select to authenticated
  using (store_uuid = public.current_store_uuid());

create policy store_bill_store_insert
  on public.store_bill for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_bill_store_update
  on public.store_bill for update to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  )
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_bill_line_store_select
  on public.store_bill_line for select to authenticated
  using (store_uuid = public.current_store_uuid());

create policy store_bill_line_store_insert
  on public.store_bill_line for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_bill_line_store_update
  on public.store_bill_line for update to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  )
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_bill_line_store_delete
  on public.store_bill_line for delete to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_bill_payment_store_select
  on public.store_bill_payment for select to authenticated
  using (store_uuid = public.current_store_uuid());

create policy store_bill_payment_store_insert
  on public.store_bill_payment for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_bill_payment_store_delete
  on public.store_bill_payment for delete to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

grant select, insert, update on public.store_bill to authenticated;
grant select, insert, update, delete on public.store_bill_line to authenticated;
grant select, insert, delete on public.store_bill_payment to authenticated;

create policy store_transaction_store_insert
  on public.store_transaction
  for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

grant insert on public.store_transaction to authenticated;

-- Demo open bills for retail/hybrid stores that already have catalog products.
insert into public.store_bill (
  org_uuid,
  store_uuid,
  bill_number,
  status,
  customer_name,
  customer_phone,
  currency_code
)
select
  store.org_uuid,
  store.store_uuid,
  demo.bill_number,
  'open',
  demo.customer_name,
  demo.customer_phone,
  store.currency_code
from public.store
cross join (
  values
    (1, 'Rahul Sharma', '+91 98765 43210'),
    (2, 'Walk-in customer', null)
) as demo(bill_number, customer_name, customer_phone)
where store.business_mode in ('retail', 'hybrid')
on conflict (store_uuid, bill_number) do nothing;

insert into public.store_bill_line (
  org_uuid,
  store_uuid,
  store_bill_uuid,
  store_product_uuid,
  sku,
  product_name,
  unit_price_cents,
  quantity,
  line_total_cents
)
select
  bill.org_uuid,
  bill.store_uuid,
  bill.store_bill_uuid,
  product.store_product_uuid,
  product.sku,
  product.name,
  product.price_cents,
  demo.quantity,
  product.price_cents * demo.quantity
from public.store_bill bill
join (
  values
    (1, 'DEMO-RICE-5KG', 2),
    (1, 'DEMO-HEADPHONES', 1),
    (2, 'DEMO-PHONE-001', 1)
) as demo(bill_number, sku, quantity)
  on demo.bill_number = bill.bill_number
join public.store_product product
  on product.store_uuid = bill.store_uuid
 and product.sku = demo.sku
where bill.status = 'open'
  and not exists (
    select 1
    from public.store_bill_line existing
    where existing.store_bill_uuid = bill.store_bill_uuid
      and existing.sku = product.sku
  );
