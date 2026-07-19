-- Organisation application identities, tenant stores, and tenant-safe access.

create table public.organisation_user (
  organisation_user_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  user_uuid uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null check (role in ('root', 'admin', 'viewer')),
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique (org_uuid, email)
);

create unique index organisation_user_one_root_idx
  on public.organisation_user (org_uuid)
  where role = 'root' and is_active = true;

create table public.store (
  store_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  store_code text not null,
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  country_code char(2),
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique (org_uuid, store_code)
);

comment on table public.organisation_user is
  'Organisation application membership. The first provisioned user is the immutable root administrator.';

comment on table public.store is
  'Tenant-owned retail stores managed from the organisation application.';

create or replace function public.current_organisation_uuid()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_uuid
  from public.organisation_user
  where user_uuid = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.current_organisation_role(target_org_uuid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.organisation_user
  where user_uuid = auth.uid()
    and org_uuid = target_org_uuid
    and is_active = true
  limit 1;
$$;

revoke all on function public.current_organisation_uuid() from public;
revoke all on function public.current_organisation_role(uuid) from public;
grant execute on function public.current_organisation_uuid() to authenticated;
grant execute on function public.current_organisation_role(uuid) to authenticated;

alter table public.organisation_user enable row level security;
alter table public.store enable row level security;

create policy organisation_user_tenant_select on public.organisation_user
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy organisation_user_admin_insert on public.organisation_user
  for insert to authenticated
  with check (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
    and role in ('admin', 'viewer')
  );

create policy organisation_user_admin_update on public.organisation_user
  for update to authenticated
  using (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
    and role <> 'root'
  )
  with check (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
    and role in ('admin', 'viewer')
  );

create policy store_tenant_select on public.store
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy store_tenant_insert on public.store
  for insert to authenticated
  with check (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
  );

create policy store_tenant_update on public.store
  for update to authenticated
  using (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
  )
  with check (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
  );

create policy store_tenant_delete on public.store
  for delete to authenticated
  using (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
  );

-- Organisation users can read their own organisation and billing context.
create policy organisation_tenant_select on public.organisation
  for select to authenticated
  using (organisation_uuid = public.current_organisation_uuid());

create policy organisation_currency_tenant_select on public.organisation_currency
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy organisation_billing_tenant_select on public.organisation_billing
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy billing_plan_tenant_select on public.billing_plan
  for select to authenticated
  using (
    billing_plan_uuid in (
      select organisation_billing.billing_plan_uuid
      from public.organisation_billing
      where organisation_billing.org_uuid = public.current_organisation_uuid()
    )
  );

grant select, insert, update on public.organisation_user to authenticated;
grant select, insert, update, delete on public.store to authenticated;
