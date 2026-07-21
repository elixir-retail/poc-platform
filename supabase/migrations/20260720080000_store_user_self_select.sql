-- Store staff must always be able to read their own membership row (login, context bootstrap).

drop policy if exists store_user_self_select on public.store_user;

create policy store_user_self_select
  on public.store_user
  for select
  to authenticated
  using (user_uuid = auth.uid() and is_active = true);
