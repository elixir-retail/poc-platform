-- Organisation contact fields and operator-safe creation policies.

alter table public.organisation
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

update public.organisation
set contact_email = coalesce(contact_email, lower(replace(org_code, '-', '')) || '@example.com')
where contact_email is null;

alter table public.organisation
  alter column contact_email set not null;

alter table public.organisation
  drop constraint if exists organisation_contact_email_check;

alter table public.organisation
  add constraint organisation_contact_email_check
  check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

alter table public.organisation
  drop constraint if exists organisation_contact_phone_check;

alter table public.organisation
  add constraint organisation_contact_phone_check
  check (contact_phone is null or length(trim(contact_phone)) between 7 and 32);

comment on column public.organisation.contact_email is
  'Primary organisation contact email collected during initial onboarding.';

comment on column public.organisation.contact_phone is
  'Primary organisation contact phone collected during initial onboarding.';

-- Allow admins and operators to create organisations (basic draft records).
-- Existing organisation_admin_write remains for admin update/delete.
create policy organisation_platform_insert on public.organisation
  for insert to authenticated
  with check (public.current_platform_role() in ('platform_admin', 'platform_op'));

-- Operators need to seed the primary currency row at create time.
create policy organisation_currency_platform_insert on public.organisation_currency
  for insert to authenticated
  with check (public.current_platform_role() in ('platform_admin', 'platform_op'));
