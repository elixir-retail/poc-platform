-- Store classification and tenant audit support.

alter table public.store
  add column business_mode text not null default 'retail'
    check (business_mode in ('retail', 'service', 'hybrid')),
  add column retail_category text default 'general_merchandise'
    check (
      retail_category is null
      or retail_category in (
        'grocery_supermarket',
        'convenience',
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
    ),
  add column service_category text
    check (
      service_category is null
      or service_category in (
        'salon_beauty',
        'spa_wellness',
        'massage',
        'tailoring_alterations',
        'electronics_repair',
        'automotive_service',
        'healthcare',
        'home_maintenance',
        'professional',
        'education',
        'hospitality',
        'service_other'
      )
    ),
  add column goods_characteristics text[] not null default '{}',
  add column service_models text[] not null default '{}',
  add column description text,
  add column phone text,
  add column email text,
  add constraint store_business_configuration_check check (
    (business_mode = 'retail' and retail_category is not null and service_category is null)
    or (business_mode = 'service' and retail_category is null and service_category is not null)
    or (business_mode = 'hybrid' and retail_category is not null and service_category is not null)
  ),
  add constraint store_goods_characteristics_check check (
    goods_characteristics <@ array[
      'perishable',
      'shelf_stable',
      'frozen',
      'regulated',
      'high_value',
      'serialized',
      'made_to_order',
      'digital'
    ]::text[]
  ),
  add constraint store_service_models_check check (
    service_models <@ array[
      'walk_in',
      'appointment',
      'hourly',
      'fixed_job',
      'recurring',
      'field_service',
      'emergency'
    ]::text[]
  );

comment on column public.store.business_mode is
  'Whether the store sells products, provides services, or does both.';

comment on column public.store.goods_characteristics is
  'Inventory handling traits inspired by GS1 product classification qualifiers.';

comment on column public.store.service_models is
  'How services are accepted and priced, such as walk-in, appointment, hourly, or fixed job.';

create table public.organisation_audit_event (
  organisation_audit_event_uuid uuid primary key default gen_random_uuid(),
  org_uuid uuid not null references public.organisation(organisation_uuid) on delete cascade,
  actor_organisation_user_uuid uuid not null
    references public.organisation_user(organisation_user_uuid),
  action text not null,
  entity_type text not null,
  entity_uuid uuid,
  before_data jsonb,
  after_data jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  changed_by uuid,
  changed_at timestamptz not null default now()
);

alter table public.organisation_audit_event enable row level security;

create policy organisation_audit_event_tenant_select
  on public.organisation_audit_event
  for select to authenticated
  using (org_uuid = public.current_organisation_uuid());

create policy organisation_audit_event_tenant_insert
  on public.organisation_audit_event
  for insert to authenticated
  with check (
    org_uuid = public.current_organisation_uuid()
    and actor_organisation_user_uuid in (
      select organisation_user_uuid
      from public.organisation_user
      where user_uuid = auth.uid()
        and org_uuid = public.current_organisation_uuid()
        and is_active = true
    )
  );

grant select, insert on public.organisation_audit_event to authenticated;
