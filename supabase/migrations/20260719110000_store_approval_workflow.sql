-- Viewer-proposed stores require approval by an organisation root/admin.

create table public.store_change_request (
  store_change_request_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  submitted_by_organisation_user_uuid uuid not null
    references public.organisation_user(organisation_user_uuid),
  request_type text not null default 'create' check (request_type in ('create')),
  proposed_data jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by_organisation_user_uuid uuid
    references public.organisation_user(organisation_user_uuid),
  reviewed_at timestamptz,
  review_notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

alter table public.store
  add column source_change_request_uuid uuid unique
    references public.store_change_request(store_change_request_uuid);

alter table public.store_change_request enable row level security;

create policy store_change_request_tenant_select
  on public.store_change_request
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy store_change_request_viewer_insert
  on public.store_change_request
  for insert to authenticated
  with check (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) = 'viewer'
    and submitted_by_organisation_user_uuid in (
      select organisation_user_uuid
      from public.organisation_user
      where user_uuid = auth.uid()
        and org_uuid = public.current_organisation_uuid()
        and is_active = true
    )
  );

create policy store_change_request_admin_update
  on public.store_change_request
  for update to authenticated
  using (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
  )
  with check (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
  );

create policy store_change_request_viewer_delete
  on public.store_change_request
  for delete to authenticated
  using (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) = 'viewer'
    and status = 'pending'
    and submitted_by_organisation_user_uuid in (
      select organisation_user_uuid
      from public.organisation_user
      where user_uuid = auth.uid()
        and org_uuid = public.current_organisation_uuid()
        and is_active = true
    )
  );

grant select, insert, update, delete on public.store_change_request to authenticated;

create index store_change_request_status_idx
  on public.store_change_request (org_uuid, status, created_at desc);
