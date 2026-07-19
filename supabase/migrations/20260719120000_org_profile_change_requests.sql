-- Allow organisation tenants to view profile-related data and submit
-- organisation profile changes for platform admin approval.

alter table public.organisation_change_request
  drop constraint if exists organisation_change_request_section_check;

alter table public.organisation_change_request
  add constraint organisation_change_request_section_check
  check (
    section in (
      'overview',
      'legal',
      'currencies',
      'tax_ids',
      'address',
      'director',
      'bank',
      'document',
      'verification',
      'tenant_profile'
    )
  );

create policy organisation_tax_id_tenant_select
  on public.organisation_tax_id
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy organisation_address_tenant_select
  on public.organisation_address
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy organisation_director_tenant_select
  on public.organisation_director
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy organisation_bank_account_tenant_select
  on public.organisation_bank_account
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy organisation_document_tenant_select
  on public.organisation_document
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy organisation_change_request_tenant_select
  on public.organisation_change_request
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy organisation_change_request_tenant_insert
  on public.organisation_change_request
  for insert to authenticated
  with check (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
    and submitted_by = auth.uid()
    and section = 'tenant_profile'
  );
