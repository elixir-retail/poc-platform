-- Allow multiple store staff users, and customer delete by store root.

alter table public.store_user
  drop constraint if exists store_user_store_uuid_key;

alter table public.store_user
  drop constraint if exists store_user_role_check;

alter table public.store_user
  add constraint store_user_role_check
  check (role in ('root', 'cashier'));

create unique index if not exists store_user_one_active_root_per_store_idx
  on public.store_user (store_uuid)
  where role = 'root' and is_active = true;

drop policy if exists store_user_self_select on public.store_user;

create policy store_user_store_select
  on public.store_user for select to authenticated
  using (store_uuid = public.current_store_uuid());

create policy store_user_store_insert
  on public.store_user for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_user_store_update
  on public.store_user for update to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  )
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

create policy store_user_store_delete
  on public.store_user for delete to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
    and role <> 'root'
  );

grant select, insert, update, delete on public.store_user to authenticated;

create policy store_customer_store_delete
  on public.store_customer for delete to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_role() = 'root'
  );

grant delete on public.store_customer to authenticated;
