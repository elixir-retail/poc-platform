-- Platform billing plans and per-organisation billing assignment.

create table public.billing_plan (
  billing_plan_uuid uuid primary key default gen_random_uuid(),
  plan_code text not null unique,
  name text not null,
  description text,
  plan_type text not null check (plan_type in ('free', 'paid')),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency_code char(3) not null default 'INR',
  billing_interval text not null
    check (billing_interval in ('none', 'monthly', 'yearly')),
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  check (
    (plan_type = 'free' and amount_cents = 0 and billing_interval = 'none')
    or (plan_type = 'paid' and amount_cents > 0 and billing_interval in ('monthly', 'yearly'))
  )
);

comment on table public.billing_plan is
  'Platform-level commercial plans, including a free plan for complimentary access.';

create table public.organisation_billing (
  organisation_billing_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null unique references public.organisation(organisation_uuid) on delete cascade,
  billing_plan_uuid uuid not null references public.billing_plan(billing_plan_uuid),
  status text not null
    check (status in ('free', 'trial', 'active', 'past_due', 'cancelled', 'suspended')),
  started_at timestamptz not null default now(),
  next_billing_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

comment on table public.organisation_billing is
  'Current billing assignment and status for each organisation.';

create index organisation_billing_plan_idx
  on public.organisation_billing (billing_plan_uuid);

create index organisation_billing_status_idx
  on public.organisation_billing (status);

alter table public.billing_plan enable row level security;
alter table public.organisation_billing enable row level security;

create policy billing_plan_platform_select on public.billing_plan
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy billing_plan_admin_write on public.billing_plan
  for all to authenticated
  using (public.current_platform_role() = 'platform_admin')
  with check (public.current_platform_role() = 'platform_admin');

create policy organisation_billing_platform_select on public.organisation_billing
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy organisation_billing_admin_write on public.organisation_billing
  for all to authenticated
  using (public.current_platform_role() = 'platform_admin')
  with check (public.current_platform_role() = 'platform_admin');

grant select on public.billing_plan, public.organisation_billing to authenticated;
grant insert, update, delete on public.billing_plan, public.organisation_billing to authenticated;

-- Seed a default free plan for complimentary access.
insert into public.billing_plan (
  plan_code,
  name,
  description,
  plan_type,
  amount_cents,
  currency_code,
  billing_interval,
  is_active
)
values (
  'FREE',
  'Free',
  'Complimentary access with no recurring charge.',
  'free',
  0,
  'INR',
  'none',
  true
)
on conflict (plan_code) do nothing;
