-- Local POC accounts. Do not use these credentials in production.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'platform_admin@test.com',
    extensions.crypt('test123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Platform Admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'platform_op@test.com',
    extensions.crypt('test123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Platform Operator"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'platform_admin@test.com',
    '{"sub":"10000000-0000-0000-0000-000000000001","email":"platform_admin@test.com","email_verified":true}',
    'email',
    now(),
    now(),
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'platform_op@test.com',
    '{"sub":"10000000-0000-0000-0000-000000000002","email":"platform_op@test.com","email_verified":true}',
    'email',
    now(),
    now(),
    now()
  )
on conflict (provider_id, provider) do update set
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.profile (
  profile_uuid,
  user_uuid,
  email,
  display_name,
  role,
  is_active,
  created_by,
  changed_by
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'platform_admin@test.com',
    'Platform Admin',
    'platform_admin',
    true,
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'platform_op@test.com',
    'Platform Operator',
    'platform_op',
    true,
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  )
on conflict (user_uuid) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  is_active = excluded.is_active,
  changed_at = now();

insert into public.organisation (
  organisation_uuid,
  org_code,
  legal_name,
  trade_name,
  entity_type,
  country_code,
  preferred_language,
  primary_currency_code,
  overall_status,
  kyc_status,
  kyb_status,
  submitted_at,
  assigned_profile_uuid,
  created_by,
  changed_by
)
values
  (
    '40000000-0000-0000-0000-000000001014',
    'ORG-1014',
    'Cascade Fintech Private Limited',
    'Cascade Fintech',
    'Private Limited Company',
    'IN',
    'en',
    'INR',
    'in_review',
    'pending',
    'pending',
    now() - interval '2 days',
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002'
  ),
  (
    '40000000-0000-0000-0000-000000001015',
    'ORG-1015',
    'Vitaal Retail',
    'Vitaal',
    'Proprietorship',
    'IN',
    'ta',
    'INR',
    'onboarded',
    'approved',
    'approved',
    now() - interval '20 days',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '40000000-0000-0000-0000-000000001016',
    'ORG-1016',
    'Northstar Commerce Limited',
    'Northstar',
    'Limited Company',
    'GB',
    'en',
    'GBP',
    'changes_requested',
    'approved',
    'rejected',
    now() - interval '5 days',
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002'
  )
on conflict (org_code) do nothing;

insert into public.organisation_currency (
  organisation_currency_uuid,
  org_uuid,
  currency_code,
  is_primary,
  created_by,
  changed_by
)
values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000001014', 'INR', true, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000001014', 'USD', false, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000001014', 'EUR', false, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000001015', 'INR', true, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000001016', 'GBP', true, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000001016', 'EUR', false, '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')
on conflict (org_uuid, currency_code) do nothing;

insert into public.organisation_tax_id (
  organisation_tax_id_uuid,
  org_uuid,
  tax_type,
  tax_value,
  country_code,
  is_primary,
  verification_status,
  created_by,
  changed_by
)
values
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000001014', 'gstin', '29ABCDE44F1Z8', 'IN', true, 'verified', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000001014', 'cin', 'U72900KA2024PTC123456', 'IN', false, 'pending', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000001014', 'tan', 'BLHA4P44', 'IN', false, 'pending', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000001015', 'gstin', '33ACJPK1234A1Z5', 'IN', true, 'verified', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000001016', 'vat', 'GB123456789', 'GB', true, 'verified', '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001')
on conflict (org_uuid, tax_type, tax_value) do nothing;

insert into public.organisation_address (
  organisation_address_uuid,
  org_uuid,
  address_type,
  line_1,
  city,
  region,
  postal_code,
  country_code,
  is_primary,
  created_by,
  changed_by
)
values
  (
    '70000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000001014',
    'registered',
    '42 Residency Road',
    'Bengaluru',
    'Karnataka',
    '560025',
    'IN',
    true,
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000001015',
    'registered',
    '18 Cross Cut Road',
    'Coimbatore',
    'Tamil Nadu',
    '641036',
    'IN',
    true,
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  )
on conflict (organisation_address_uuid) do nothing;

insert into public.organisation_director (
  organisation_director_uuid,
  org_uuid,
  full_name,
  designation,
  nationality_code,
  ownership_percent,
  kyc_status,
  created_by,
  changed_by
)
values
  (
    '80000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000001014',
    'Aarav Kapoor',
    'Director',
    'IN',
    60,
    'pending',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000001014',
    'Meera Shah',
    'Director',
    'IN',
    40,
    'approved',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  )
on conflict (organisation_director_uuid) do nothing;

insert into public.organisation_bank_account (
  organisation_bank_account_uuid,
  org_uuid,
  bank_name,
  account_holder_name,
  masked_account_number,
  routing_code,
  currency_code,
  is_primary,
  verification_status,
  created_by,
  changed_by
)
values (
  '90000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000001014',
  'HDFC Bank',
  'Cascade Fintech Private Limited',
  '•••• 4821',
  'HDFC0001234',
  'INR',
  true,
  'pending',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001'
)
on conflict (organisation_bank_account_uuid) do nothing;

insert into public.organisation_document (
  organisation_document_uuid,
  org_uuid,
  document_type,
  storage_path,
  original_filename,
  mime_type,
  status,
  uploaded_by,
  created_by,
  changed_by
)
values (
  'a0000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000001014',
  'gst_registration_certificate',
  'ORG-1014/gst-registration-certificate.png',
  'GST Registration Certificate.png',
  'image/png',
  'pending',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002'
)
on conflict (storage_path) do nothing;

insert into public.organisation_change_request (
  organisation_change_request_uuid,
  org_uuid,
  section,
  proposed_changes,
  status,
  submitted_by,
  created_by,
  changed_by
)
values (
  'b0000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000001014',
  'legal',
  '{"trade_name":"Cascade Pay","preferred_language":"hi"}',
  'pending',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002'
)
on conflict (organisation_change_request_uuid) do nothing;

insert into public.notification (
  notification_uuid,
  recipient_profile_uuid,
  org_uuid,
  notification_type,
  title,
  body,
  link_path,
  created_by,
  changed_by
)
values
  (
    'c0000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000001014',
    'change_request_submitted',
    'Organisation change awaiting approval',
    'Platform Operator submitted Legal changes for ORG-1014.',
    '/onboarding/ORG-1014?step=review',
    '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000001014',
    'document_status',
    'Document under review',
    'The GST registration certificate for ORG-1014 is pending review.',
    '/onboarding/ORG-1014?step=documents',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001'
  )
on conflict (notification_uuid) do nothing;

insert into public.audit_event (
  audit_event_uuid,
  org_uuid,
  actor_profile_uuid,
  action,
  entity_type,
  entity_uuid,
  after_data,
  created_by,
  changed_by
)
values (
  'd0000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000001014',
  '30000000-0000-0000-0000-000000000002',
  'change_request.submitted',
  'organisation_change_request',
  'b0000000-0000-0000-0000-000000000001',
  '{"section":"legal","status":"pending"}',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002'
)
on conflict (audit_event_uuid) do nothing;
