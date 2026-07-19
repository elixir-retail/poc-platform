-- Organisation administrators can remove unused store counters.

create policy store_counter_organisation_delete
  on public.store_counter
  for delete to authenticated
  using (
    org_uuid = public.current_organisation_uuid()
    and public.current_organisation_role(org_uuid) in ('root', 'admin')
  );

grant delete on public.store_counter to authenticated;
