-- Each store operates in one currency configured by its organisation.

alter table public.store
  add column currency_code text;

update public.store as store_row
set currency_code = organisation.primary_currency_code
from public.organisation
where organisation.organisation_uuid = store_row.org_uuid;

alter table public.store
  alter column currency_code set not null,
  add constraint store_currency_code_check
    check (currency_code ~ '^[A-Z]{3}$'),
  add constraint store_organisation_currency_fk
    foreign key (org_uuid, currency_code)
    references public.organisation_currency (org_uuid, currency_code);

comment on column public.store.currency_code is
  'Store operating currency selected from currencies configured for its organisation.';
