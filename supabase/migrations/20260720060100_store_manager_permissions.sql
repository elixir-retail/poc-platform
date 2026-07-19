-- Managers can manage catalog, inventory, customers, and billing.
-- Store admin (root) remains required for user management and customer delete.

create or replace function public.current_store_can_manage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_store_role() in ('root', 'manager');
$$;

revoke all on function public.current_store_can_manage() from public;
grant execute on function public.current_store_can_manage() to authenticated;

-- Products
drop policy if exists store_product_store_insert on public.store_product;
drop policy if exists store_product_store_update on public.store_product;
create policy store_product_store_insert
  on public.store_product for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );
create policy store_product_store_update
  on public.store_product for update to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  )
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );

-- Inventory
drop policy if exists store_inventory_store_insert on public.store_inventory;
drop policy if exists store_inventory_store_update on public.store_inventory;
create policy store_inventory_store_insert
  on public.store_inventory for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );
create policy store_inventory_store_update
  on public.store_inventory for update to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  )
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );

-- Customers (create/update; delete stays root-only)
drop policy if exists store_customer_store_insert on public.store_customer;
drop policy if exists store_customer_store_update on public.store_customer;
create policy store_customer_store_insert
  on public.store_customer for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );
create policy store_customer_store_update
  on public.store_customer for update to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  )
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );

-- Billing
drop policy if exists store_bill_store_insert on public.store_bill;
drop policy if exists store_bill_store_update on public.store_bill;
create policy store_bill_store_insert
  on public.store_bill for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );
create policy store_bill_store_update
  on public.store_bill for update to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  )
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );

drop policy if exists store_bill_line_store_insert on public.store_bill_line;
drop policy if exists store_bill_line_store_update on public.store_bill_line;
drop policy if exists store_bill_line_store_delete on public.store_bill_line;
create policy store_bill_line_store_insert
  on public.store_bill_line for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );
create policy store_bill_line_store_update
  on public.store_bill_line for update to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  )
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );
create policy store_bill_line_store_delete
  on public.store_bill_line for delete to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );

drop policy if exists store_bill_payment_store_insert on public.store_bill_payment;
drop policy if exists store_bill_payment_store_delete on public.store_bill_payment;
create policy store_bill_payment_store_insert
  on public.store_bill_payment for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );
create policy store_bill_payment_store_delete
  on public.store_bill_payment for delete to authenticated
  using (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );

drop policy if exists store_transaction_store_insert on public.store_transaction;
create policy store_transaction_store_insert
  on public.store_transaction for insert to authenticated
  with check (
    store_uuid = public.current_store_uuid()
    and public.current_store_can_manage()
  );
