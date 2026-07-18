create extension if not exists pgcrypto with schema extensions;

create table public.profile (
  profile_uuid uuid primary key default gen_random_uuid(),
  user_uuid uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('platform_admin', 'platform_op')),
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table public.organisation (
  organisation_uuid uuid primary key default gen_random_uuid(),
  org_code text not null unique check (org_code ~ '^ORG-[0-9]{4,}$'),
  legal_name text not null,
  trade_name text,
  entity_type text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'hi', 'ta', 'te')),
  primary_currency_code text not null check (primary_currency_code ~ '^[A-Z]{3}$'),
  overall_status text not null default 'draft'
    check (overall_status in ('draft', 'submitted', 'in_review', 'changes_requested', 'partially_approved', 'onboarded', 'rejected', 'suspended')),
  kyc_status text not null default 'not_started'
    check (kyc_status in ('not_started', 'pending', 'approved', 'rejected')),
  kyb_status text not null default 'not_started'
    check (kyb_status in ('not_started', 'pending', 'approved', 'rejected')),
  submitted_at timestamptz,
  assigned_profile_uuid uuid references public.profile(profile_uuid),
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table public.organisation_currency (
  organisation_currency_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  is_primary boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique (org_uuid, currency_code)
);

create unique index organisation_currency_one_primary_idx
  on public.organisation_currency (org_uuid)
  where is_primary;

create table public.organisation_tax_id (
  organisation_tax_id_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  tax_type text not null check (tax_type in ('gstin', 'vat', 'cin', 'tan', 'pan', 'tin', 'other')),
  tax_value text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  is_primary boolean not null default false,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  unique (org_uuid, tax_type, tax_value)
);

create unique index organisation_tax_id_one_primary_idx
  on public.organisation_tax_id (org_uuid)
  where is_primary;

create table public.organisation_address (
  organisation_address_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  address_type text not null check (address_type in ('registered', 'business', 'billing')),
  line_1 text not null,
  line_2 text,
  city text not null,
  region text,
  postal_code text,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  is_primary boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table public.organisation_director (
  organisation_director_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  full_name text not null,
  designation text,
  nationality_code text check (nationality_code is null or nationality_code ~ '^[A-Z]{2}$'),
  ownership_percent numeric(5,2) check (ownership_percent between 0 and 100),
  kyc_status text not null default 'not_started'
    check (kyc_status in ('not_started', 'pending', 'approved', 'rejected')),
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table public.organisation_bank_account (
  organisation_bank_account_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  bank_name text not null,
  account_holder_name text not null,
  masked_account_number text not null,
  routing_code text,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  is_primary boolean not null default false,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table public.organisation_document (
  organisation_document_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  document_type text not null,
  storage_bucket text not null default 'organisation-documents',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  uploaded_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table public.organisation_change_request (
  organisation_change_request_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  section text not null,
  proposed_changes jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_by uuid not null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table public.notification (
  notification_uuid uuid primary key default gen_random_uuid(),
  recipient_profile_uuid uuid references public.profile(profile_uuid) on delete cascade,
  org_uuid uuid references public.organisation(organisation_uuid) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  link_path text,
  read_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  check (recipient_profile_uuid is not null or org_uuid is not null)
);

create table public.audit_event (
  audit_event_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid references public.organisation(organisation_uuid) on delete cascade,
  actor_profile_uuid uuid references public.profile(profile_uuid),
  action text not null,
  entity_type text not null,
  entity_uuid uuid,
  before_data jsonb,
  after_data jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create or replace function public.current_platform_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profile
  where user_uuid = auth.uid()
    and is_active = true
  limit 1;
$$;

revoke all on function public.current_platform_role() from public;
grant execute on function public.current_platform_role() to authenticated;

alter table public.profile enable row level security;
alter table public.organisation enable row level security;
alter table public.organisation_currency enable row level security;
alter table public.organisation_tax_id enable row level security;
alter table public.organisation_address enable row level security;
alter table public.organisation_director enable row level security;
alter table public.organisation_bank_account enable row level security;
alter table public.organisation_document enable row level security;
alter table public.organisation_change_request enable row level security;
alter table public.notification enable row level security;
alter table public.audit_event enable row level security;

create policy profile_platform_select on public.profile
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy profile_admin_write on public.profile
  for all to authenticated
  using (public.current_platform_role() = 'platform_admin')
  with check (public.current_platform_role() = 'platform_admin');

create policy organisation_platform_select on public.organisation
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy organisation_admin_write on public.organisation
  for all to authenticated
  using (public.current_platform_role() = 'platform_admin')
  with check (public.current_platform_role() = 'platform_admin');

create policy organisation_currency_platform_select on public.organisation_currency
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy organisation_currency_admin_write on public.organisation_currency
  for all to authenticated
  using (public.current_platform_role() = 'platform_admin')
  with check (public.current_platform_role() = 'platform_admin');

create policy organisation_tax_id_platform_select on public.organisation_tax_id
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy organisation_tax_id_admin_write on public.organisation_tax_id
  for all to authenticated
  using (public.current_platform_role() = 'platform_admin')
  with check (public.current_platform_role() = 'platform_admin');

create policy organisation_address_platform_select on public.organisation_address
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy organisation_address_admin_write on public.organisation_address
  for all to authenticated
  using (public.current_platform_role() = 'platform_admin')
  with check (public.current_platform_role() = 'platform_admin');

create policy organisation_director_platform_select on public.organisation_director
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy organisation_director_admin_write on public.organisation_director
  for all to authenticated
  using (public.current_platform_role() = 'platform_admin')
  with check (public.current_platform_role() = 'platform_admin');

create policy organisation_bank_account_platform_select on public.organisation_bank_account
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy organisation_bank_account_admin_write on public.organisation_bank_account
  for all to authenticated
  using (public.current_platform_role() = 'platform_admin')
  with check (public.current_platform_role() = 'platform_admin');

create policy organisation_document_platform_select on public.organisation_document
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy organisation_document_platform_insert on public.organisation_document
  for insert to authenticated
  with check (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy organisation_document_admin_update on public.organisation_document
  for update to authenticated
  using (public.current_platform_role() = 'platform_admin')
  with check (public.current_platform_role() = 'platform_admin');

create policy organisation_document_admin_delete on public.organisation_document
  for delete to authenticated
  using (public.current_platform_role() = 'platform_admin');

create policy change_request_platform_select on public.organisation_change_request
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy change_request_platform_insert on public.organisation_change_request
  for insert to authenticated
  with check (
    public.current_platform_role() in ('platform_admin', 'platform_op')
    and submitted_by = auth.uid()
  );

create policy change_request_admin_update on public.organisation_change_request
  for update to authenticated
  using (public.current_platform_role() = 'platform_admin')
  with check (public.current_platform_role() = 'platform_admin');

create policy notification_recipient_select on public.notification
  for select to authenticated
  using (
    recipient_profile_uuid = (
      select profile_uuid from public.profile where user_uuid = auth.uid() and is_active = true limit 1
    )
  );

create policy notification_platform_insert on public.notification
  for insert to authenticated
  with check (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy notification_recipient_update on public.notification
  for update to authenticated
  using (
    recipient_profile_uuid = (
      select profile_uuid from public.profile where user_uuid = auth.uid() and is_active = true limit 1
    )
  )
  with check (
    recipient_profile_uuid = (
      select profile_uuid from public.profile where user_uuid = auth.uid() and is_active = true limit 1
    )
  );

create policy audit_event_platform_select on public.audit_event
  for select to authenticated
  using (public.current_platform_role() in ('platform_admin', 'platform_op'));

create policy audit_event_platform_insert on public.audit_event
  for insert to authenticated
  with check (
    public.current_platform_role() in ('platform_admin', 'platform_op')
    and actor_profile_uuid = (
      select profile_uuid from public.profile where user_uuid = auth.uid() and is_active = true limit 1
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organisation-documents',
  'organisation-documents',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy organisation_document_object_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'organisation-documents'
    and public.current_platform_role() in ('platform_admin', 'platform_op')
  );

create policy organisation_document_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'organisation-documents'
    and public.current_platform_role() in ('platform_admin', 'platform_op')
  );

create policy organisation_document_object_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'organisation-documents'
    and public.current_platform_role() = 'platform_admin'
  )
  with check (
    bucket_id = 'organisation-documents'
    and public.current_platform_role() = 'platform_admin'
  );

create policy organisation_document_object_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'organisation-documents'
    and public.current_platform_role() = 'platform_admin'
  );

comment on table public.organisation_document is
  'Document metadata. Add organisation-user membership policies when the organisation app is introduced.';

grant usage on schema public to authenticated;
grant select on public.profile, public.organisation, public.organisation_currency,
  public.organisation_tax_id, public.organisation_address, public.organisation_director,
  public.organisation_bank_account, public.organisation_document,
  public.organisation_change_request, public.notification, public.audit_event
  to authenticated;
grant insert, update, delete on public.profile, public.organisation,
  public.organisation_currency, public.organisation_tax_id, public.organisation_address,
  public.organisation_director, public.organisation_bank_account,
  public.organisation_document, public.organisation_change_request,
  public.notification, public.audit_event
  to authenticated;
