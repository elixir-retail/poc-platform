-- Profile avatars: storage bucket plus avatar_url on profile.

alter table public.profile
  add column if not exists avatar_url text;

comment on column public.profile.avatar_url is
  'Public URL of the user avatar stored in the avatars bucket.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Platform users manage only their own avatar objects (path prefix = auth.uid()).
create policy avatar_object_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars');

create policy avatar_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and public.current_platform_role() in ('platform_admin', 'platform_op')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatar_object_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatar_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may update their own profile row (avatar/display name), not role or activation.
create policy profile_self_update on public.profile
  for update to authenticated
  using (user_uuid = auth.uid())
  with check (
    user_uuid = auth.uid()
    and role = (select p.role from public.profile p where p.user_uuid = auth.uid())
    and is_active = (select p.is_active from public.profile p where p.user_uuid = auth.uid())
  );
