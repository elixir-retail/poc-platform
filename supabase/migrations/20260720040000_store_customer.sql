-- Store customers for retail CRM and POS checkout linking.

create table public.store_customer (
  store_customer_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  store_uuid uuid not null references public.store(store_uuid) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique (store_uuid, phone),
  check (char_length(trim(full_name)) >= 2),
  check (char_length(trim(phone)) >= 6),
  check (email is null or email ~* '^[^@]+@[^@]+\.[^@]+$')
);

create index store_customer_store_name_idx
  on public.store_customer (store_uuid, full_name);

create index store_customer_store_phone_idx
  on public.store_customer (store_uuid, phone);

alter table public.store_bill
  add column if not exists store_customer_uuid uuid
    references public.store_customer(store_customer_uuid) on delete set null;

create index store_bill_customer_idx
  on public.store_bill (store_customer_uuid)
  where store_customer_uuid is not null;

alter table public.store_customer enable row level security;

create policy store_customer_store_select
  on public.store_customer for select to authenticated
  using (store_uuid = public.current_store_uuid());

create policy store_customer_store_insert
  on public.store_customer for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_customer_store_update
  on public.store_customer for update to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  )
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_customer_organisation_select
  on public.store_customer for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

grant select, insert, update on public.store_customer to authenticated;

-- Demo customers for retail / hybrid stores, then backfill bills that already have phones.
insert into public.store_customer (
  org_uuid,
  store_uuid,
  full_name,
  phone,
  email,
  city,
  state,
  country,
  notes,
  status,
  created_by,
  changed_by
)
select
  s.org_uuid,
  s.store_uuid,
  demo.full_name,
  demo.phone,
  demo.email,
  demo.city,
  demo.state,
  demo.country,
  demo.notes,
  'active',
  null::uuid,
  null::uuid
from public.store s
cross join (
  values
    (
      'Rahul Sharma',
      '+91 98765 43210',
      'rahul.sharma@example.com',
      'Guwahati',
      'Assam',
      'IN',
      'Regular electronics buyer'
    ),
    (
      'Priya Das',
      '+91 91234 56789',
      'priya.das@example.com',
      'Shillong',
      'Meghalaya',
      'IN',
      'Prefers UPI'
    ),
    (
      'Amit Baruah',
      '+91 99887 76655',
      null,
      'Jorhat',
      'Assam',
      'IN',
      null
    )
) as demo(full_name, phone, email, city, state, country, notes)
where s.business_mode in ('retail', 'hybrid')
on conflict (store_uuid, phone) do nothing;

update public.store_bill b
set store_customer_uuid = c.store_customer_uuid
from public.store_customer c
where b.store_uuid = c.store_uuid
  and b.customer_phone is not null
  and b.customer_phone = c.phone
  and b.store_customer_uuid is null;

insert into public.store_customer (
  org_uuid,
  store_uuid,
  full_name,
  phone,
  status,
  created_by,
  changed_by
)
select distinct
  b.org_uuid,
  b.store_uuid,
  coalesce(nullif(trim(b.customer_name), ''), 'Walk-in customer'),
  b.customer_phone,
  'active',
  null::uuid,
  null::uuid
from public.store_bill b
where b.customer_phone is not null
  and nullif(trim(b.customer_phone), '') is not null
  and not exists (
    select 1
    from public.store_customer c
    where c.store_uuid = b.store_uuid
      and c.phone = b.customer_phone
  )
on conflict (store_uuid, phone) do nothing;

update public.store_bill b
set store_customer_uuid = c.store_customer_uuid
from public.store_customer c
where b.store_uuid = c.store_uuid
  and b.customer_phone is not null
  and b.customer_phone = c.phone
  and b.store_customer_uuid is null;
