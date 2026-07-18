-- Harden mutation sections, primary-row uniqueness, and document archival.

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
      'verification'
    )
  );

-- One primary address / bank account per organisation.
create unique index if not exists organisation_address_one_primary_idx
  on public.organisation_address (org_uuid)
  where is_primary;

create unique index if not exists organisation_bank_account_one_primary_idx
  on public.organisation_bank_account (org_uuid)
  where is_primary;

alter table public.organisation_document
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid,
  add column if not exists previous_storage_path text;

create index if not exists organisation_document_active_idx
  on public.organisation_document (org_uuid)
  where archived_at is null;

comment on column public.organisation_document.archived_at is
  'Soft-delete timestamp. Archived documents remain for audit/compliance.';

comment on column public.organisation_document.previous_storage_path is
  'Prior storage object path retained when a document file is replaced.';
