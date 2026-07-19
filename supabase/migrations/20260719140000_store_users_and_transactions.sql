-- Store-level authentication and transaction visibility.

create table public.store_user (
  store_user_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  store_uuid uuid not null references public.store(store_uuid) on delete cascade,
  user_uuid uuid not null unique,
  email text not null,
  display_name text not null,
  role text not null default 'root' check (role in ('root')),
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique (store_uuid),
  unique (org_uuid, email)
);

create table public.store_transaction (
  store_transaction_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  store_uuid uuid not null references public.store(store_uuid) on delete cascade,
  transaction_code text not null unique,
  channel text not null check (channel in ('online', 'offline')),
  status text not null check (status in ('pending', 'completed', 'failed', 'refunded')),
  occurred_at timestamptz not null,
  currency_code text not null,
  gross_amount_cents bigint not null check (gross_amount_cents >= 0),
  payment_method text not null,
  external_reference text,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create index store_user_store_idx
  on public.store_user (store_uuid, is_active);

create index store_transaction_org_time_idx
  on public.store_transaction (org_uuid, occurred_at desc);

create index store_transaction_store_time_idx
  on public.store_transaction (store_uuid, occurred_at desc);

create or replace function public.current_store_uuid()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select store_uuid
  from public.store_user
  where user_uuid = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.current_store_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.store_user
  where user_uuid = auth.uid()
    and is_active = true
  limit 1;
$$;

revoke all on function public.current_store_uuid() from public;
revoke all on function public.current_store_role() from public;
grant execute on function public.current_store_uuid() to authenticated;
grant execute on function public.current_store_role() to authenticated;

alter table public.store_user enable row level security;
alter table public.store_transaction enable row level security;

create policy store_user_self_select
  on public.store_user
  for select to authenticated
  using (user_uuid = auth.uid() and is_active);

create policy store_user_organisation_select
  on public.store_user
  for select to authenticated
  using (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
  );

create policy store_transaction_organisation_select
  on public.store_transaction
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy store_transaction_store_select
  on public.store_transaction
  for select to authenticated
  using (store_uuid = public.current_store_uuid());

create policy store_store_user_select
  on public.store
  for select to authenticated
  using (store_uuid = public.current_store_uuid());

create policy organisation_store_user_select
  on public.organisation
  for select to authenticated
  using (
    organisation_uuid in (
      select org_uuid
      from public.store_user
      where user_uuid = auth.uid()
        and is_active = true
    )
  );

grant select on public.store_user, public.store_transaction to authenticated;

-- Demo transactions for stores provisioned by the POC migration set.
insert into public.store_transaction (
  org_uuid,
  store_uuid,
  transaction_code,
  channel,
  status,
  occurred_at,
  currency_code,
  gross_amount_cents,
  payment_method,
  external_reference
)
select
  store.org_uuid,
  store.store_uuid,
  demo.transaction_code,
  demo.channel,
  demo.status,
  now() - demo.age,
  store.currency_code,
  demo.gross_amount_cents,
  demo.payment_method,
  demo.external_reference
from public.store
cross join (
  values
    ('DEMO-TXN-1001', 'online', 'completed', interval '2 hours', 129900, 'card', 'WEB-84021'),
    ('DEMO-TXN-1002', 'offline', 'completed', interval '5 hours', 45900, 'cash', null),
    ('DEMO-TXN-1003', 'online', 'pending', interval '1 day', 79900, 'upi', 'WEB-83977'),
    ('DEMO-TXN-1004', 'offline', 'refunded', interval '2 days', 24900, 'card', 'POS-11482')
) as demo(
  transaction_code,
  channel,
  status,
  age,
  gross_amount_cents,
  payment_method,
  external_reference
)
where store.store_code = 'DEMO-MARKET'
on conflict (transaction_code) do nothing;

insert into public.store_transaction (
  org_uuid,
  store_uuid,
  transaction_code,
  channel,
  status,
  occurred_at,
  currency_code,
  gross_amount_cents,
  payment_method,
  external_reference
)
select
  store.org_uuid,
  store.store_uuid,
  demo.transaction_code,
  demo.channel,
  demo.status,
  now() - demo.age,
  store.currency_code,
  demo.gross_amount_cents,
  demo.payment_method,
  demo.external_reference
from public.store
cross join (
  values
    ('DEMO-TXN-2001', 'offline', 'completed', interval '3 hours', 34900, 'cash', null),
    ('DEMO-TXN-2002', 'online', 'failed', interval '8 hours', 99900, 'card', 'WEB-84002')
) as demo(
  transaction_code,
  channel,
  status,
  age,
  gross_amount_cents,
  payment_method,
  external_reference
)
where store.store_code = 'DEMO-MOBILE'
on conflict (transaction_code) do nothing;
