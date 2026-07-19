-- Store counters are configured with the store and selected by store users per login.

create table public.store_counter (
  store_counter_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  store_uuid uuid not null references public.store(store_uuid) on delete cascade,
  counter_code text not null,
  name text not null,
  status text not null default 'offline' check (status in ('online', 'offline')),
  active_store_user_uuid uuid references public.store_user(store_user_uuid) on delete set null,
  last_seen_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique (store_uuid, counter_code)
);

create index store_counter_store_status_idx
  on public.store_counter (store_uuid, status);

alter table public.store_counter enable row level security;

create policy store_counter_organisation_select
  on public.store_counter
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy store_counter_organisation_insert
  on public.store_counter
  for insert to authenticated
  with check (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
    and store_uuid in (
      select store_uuid
      from public.store
      where org_uuid = public.current_organisation_uuid()
    )
  );

create policy store_counter_organisation_update
  on public.store_counter
  for update to authenticated
  using (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
  )
  with check (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
  );

create policy store_counter_store_select
  on public.store_counter
  for select to authenticated
  using (store_uuid = public.current_store_uuid());

create policy store_counter_store_update
  on public.store_counter
  for update to authenticated
  using (store_uuid = public.current_store_uuid())
  with check (store_uuid = public.current_store_uuid());

grant select, insert, update on public.store_counter to authenticated;

-- Existing POC stores receive two counters so each demo login can select one.
insert into public.store_counter (
  org_uuid,
  store_uuid,
  counter_code,
  name,
  created_by,
  changed_by
)
select
  store.org_uuid,
  store.store_uuid,
  counter.counter_code,
  counter.name,
  store.created_by,
  store.changed_by
from public.store
cross join (
  values
    ('COUNTER-01', 'Counter 1'),
    ('COUNTER-02', 'Counter 2')
) as counter(counter_code, name)
on conflict (store_uuid, counter_code) do nothing;
