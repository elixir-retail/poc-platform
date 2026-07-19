-- Allow store staff roles: manager and cashier (in addition to root).

alter table public.store_user
  drop constraint if exists store_user_role_check;

alter table public.store_user
  add constraint store_user_role_check
  check (role in ('root', 'manager', 'cashier'));
