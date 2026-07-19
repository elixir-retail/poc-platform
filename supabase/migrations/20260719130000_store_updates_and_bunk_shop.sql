-- Support viewer-proposed store updates and classify bunk shops.

alter table public.store
  drop constraint if exists store_retail_category_check;

alter table public.store
  add constraint store_retail_category_check
  check (
    retail_category is null
    or retail_category in (
      'grocery_supermarket',
      'convenience',
      'bunk_shop',
      'pharmacy_health',
      'electronics_mobile',
      'clothing_fashion',
      'home_furniture',
      'automotive_parts',
      'fuel',
      'hardware_building',
      'beauty_personal_care',
      'general_merchandise',
      'specialty_other'
    )
  );

alter table public.store_change_request
  drop constraint if exists store_change_request_request_type_check;

alter table public.store_change_request
  add constraint store_change_request_request_type_check
  check (request_type in ('create', 'update'));

alter table public.store_change_request
  add column target_store_uuid uuid references public.store(store_uuid) on delete cascade;

alter table public.store_change_request
  add constraint store_change_request_target_check
  check (
    (request_type = 'create' and target_store_uuid is null)
    or (request_type = 'update' and target_store_uuid is not null)
  );

create unique index store_change_request_one_pending_update_idx
  on public.store_change_request (target_store_uuid)
  where request_type = 'update' and status = 'pending';

drop policy if exists store_change_request_viewer_insert
  on public.store_change_request;

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
    and (
      (request_type = 'create' and target_store_uuid is null)
      or (
        request_type = 'update'
        and target_store_uuid in (
          select store_uuid
          from public.store
          where org_uuid = public.current_organisation_uuid()
        )
      )
    )
  );
