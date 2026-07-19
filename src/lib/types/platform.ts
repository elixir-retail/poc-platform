export type PlatformRole = 'platform_admin' | 'platform_op';
export type OrganisationUserRole = 'root' | 'admin' | 'viewer';
export type StoreBusinessMode = 'retail' | 'service' | 'hybrid';
export type RetailCategory =
	| 'grocery_supermarket'
	| 'convenience'
	| 'bunk_shop'
	| 'pharmacy_health'
	| 'electronics_mobile'
	| 'clothing_fashion'
	| 'home_furniture'
	| 'automotive_parts'
	| 'fuel'
	| 'hardware_building'
	| 'beauty_personal_care'
	| 'general_merchandise'
	| 'specialty_other';
export type ServiceCategory =
	| 'salon_beauty'
	| 'spa_wellness'
	| 'massage'
	| 'tailoring_alterations'
	| 'electronics_repair'
	| 'automotive_service'
	| 'healthcare'
	| 'home_maintenance'
	| 'professional'
	| 'education'
	| 'hospitality'
	| 'service_other';
export type GoodsCharacteristic =
	| 'perishable'
	| 'shelf_stable'
	| 'frozen'
	| 'regulated'
	| 'high_value'
	| 'serialized'
	| 'made_to_order'
	| 'digital';
export type ServiceModel =
	'walk_in' | 'appointment' | 'hourly' | 'fixed_job' | 'recurring' | 'field_service' | 'emergency';

export type OrganisationUser = {
	organisation_user_uuid: string;
	org_uuid: string;
	user_uuid: string;
	email: string;
	display_name: string;
	role: OrganisationUserRole;
	is_active: boolean;
	created_at: string;
	changed_at: string;
};

export type OrganisationAppContext = {
	membership: OrganisationUser;
	organisation: {
		organisation_uuid: string;
		org_code: string;
		legal_name: string;
		trade_name: string | null;
		contact_email: string;
		contact_phone: string | null;
		country_code: string;
		primary_currency_code: string;
		overall_status: OnboardingStatus;
	};
};

export type Store = {
	store_uuid: string;
	org_uuid: string;
	store_code: string;
	name: string;
	status: 'active' | 'inactive';
	business_mode: StoreBusinessMode;
	retail_category: RetailCategory | null;
	service_category: ServiceCategory | null;
	goods_characteristics: GoodsCharacteristic[];
	service_models: ServiceModel[];
	description: string | null;
	phone: string | null;
	email: string | null;
	currency_code: string;
	source_change_request_uuid: string | null;
	address_line_1: string | null;
	address_line_2: string | null;
	city: string | null;
	region: string | null;
	postal_code: string | null;
	country_code: string | null;
	created_at: string;
	changed_at: string;
};

export type StoreChangeRequest = {
	store_change_request_uuid: string;
	org_uuid: string;
	submitted_by_organisation_user_uuid: string;
	request_type: 'create' | 'update';
	target_store_uuid: string | null;
	proposed_data: Record<string, unknown>;
	status: 'pending' | 'approved' | 'rejected';
	reviewed_by_organisation_user_uuid: string | null;
	reviewed_at: string | null;
	review_notes: string | null;
	created_at: string;
	changed_at: string;
	submitter?: Pick<OrganisationUser, 'display_name' | 'email'> | null;
};

export type StoreUser = {
	store_user_uuid: string;
	org_uuid: string;
	store_uuid: string;
	user_uuid: string;
	email: string;
	display_name: string;
	role: 'root';
	is_active: boolean;
	created_at: string;
	changed_at: string;
};

export type StoreCounter = {
	store_counter_uuid: string;
	org_uuid: string;
	store_uuid: string;
	counter_code: string;
	name: string;
	status: 'online' | 'offline';
	active_store_user_uuid: string | null;
	last_seen_at: string | null;
	created_at: string;
	changed_at: string;
};

export type ProductType = 'standard' | 'perishable' | 'electronics' | 'mobile_phone' | 'laptop';

export type StoreProduct = {
	store_product_uuid: string;
	org_uuid: string;
	store_uuid: string;
	sku: string;
	name: string;
	description: string | null;
	brand: string | null;
	product_type: ProductType;
	product_category: string;
	price_cents: number;
	currency_code: string;
	package_number: string | null;
	gtin: string | null;
	batch_lot_number: string | null;
	manufacturing_date: string | null;
	expiry_date: string | null;
	warranty_months: number | null;
	manufacturer_serial_number: string | null;
	imei: string | null;
	tracking_number: string | null;
	status: 'active' | 'inactive';
	created_at: string;
	changed_at: string;
};

export type StoreInventory = {
	store_inventory_uuid: string;
	org_uuid: string;
	store_uuid: string;
	store_product_uuid: string;
	quantity_on_hand: number;
	storage_location: string | null;
	last_counted_at: string | null;
	created_at: string;
	changed_at: string;
	product: Pick<
		StoreProduct,
		'store_product_uuid' | 'sku' | 'name' | 'brand' | 'product_category' | 'product_type' | 'status'
	>;
};

export type StoreAppContext = {
	membership: StoreUser;
	store: Store;
	organisation: {
		organisation_uuid: string;
		org_code: string;
		legal_name: string;
		trade_name: string | null;
	};
};

export type StoreTransaction = {
	store_transaction_uuid: string;
	org_uuid: string;
	store_uuid: string;
	transaction_code: string;
	channel: 'online' | 'offline';
	status: 'pending' | 'completed' | 'failed' | 'refunded';
	occurred_at: string;
	currency_code: string;
	gross_amount_cents: number;
	payment_method: string;
	external_reference: string | null;
	created_at: string;
	store?: Pick<Store, 'store_code' | 'name'> | null;
};

export type OrganisationAuditEvent = {
	organisation_audit_event_uuid: string;
	org_uuid: string;
	actor_organisation_user_uuid: string;
	action: string;
	entity_type: string;
	entity_uuid: string | null;
	before_data: Record<string, unknown> | null;
	after_data: Record<string, unknown> | null;
	created_at: string;
};

export type PlatformProfile = {
	profile_uuid: string;
	user_uuid: string;
	email: string;
	display_name: string;
	role: PlatformRole;
	is_active: boolean;
	avatar_url: string | null;
};

export type OnboardingStatus =
	| 'draft'
	| 'submitted'
	| 'in_review'
	| 'changes_requested'
	| 'partially_approved'
	| 'onboarded'
	| 'rejected'
	| 'suspended';

export type VerificationStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

export type ChangeRequestSection =
	| 'overview'
	| 'legal'
	| 'currencies'
	| 'tax_ids'
	| 'address'
	| 'director'
	| 'bank'
	| 'document'
	| 'verification'
	| 'tenant_profile';

export type MutationOperation = 'create' | 'update' | 'delete' | 'replace' | 'archive';

export type MutationPayload = {
	operation: MutationOperation;
	record_uuid?: string | null;
	values: Record<string, unknown>;
};

export type OrganisationListItem = {
	organisation_uuid: string;
	org_code: string;
	legal_name: string;
	trade_name: string | null;
	contact_email: string;
	contact_phone: string | null;
	country_code: string;
	preferred_language: string;
	primary_currency_code: string;
	overall_status: OnboardingStatus;
	kyc_status: VerificationStatus;
	kyb_status: VerificationStatus;
	changed_at: string;
	organisation_currency: OrganisationCurrency[];
	organisation_tax_id: OrganisationTaxId[];
};

export type OrganisationDetail = OrganisationListItem & {
	entity_type: string;
	submitted_at: string | null;
	organisation_address: OrganisationAddress[];
	organisation_director: OrganisationDirector[];
	organisation_bank_account: OrganisationBankAccount[];
	organisation_document: OrganisationDocument[];
	organisation_change_request: OrganisationChangeRequest[];
};

export type OrganisationCurrency = {
	organisation_currency_uuid?: string;
	currency_code: string;
	is_primary: boolean;
};

export type OrganisationTaxId = {
	organisation_tax_id_uuid?: string;
	tax_type: string;
	tax_value: string;
	country_code?: string;
	is_primary: boolean;
	verification_status: string;
};

export type OrganisationAddress = {
	organisation_address_uuid: string;
	address_type: string;
	line_1: string;
	line_2: string | null;
	city: string;
	region: string | null;
	postal_code: string | null;
	country_code: string;
	is_primary: boolean;
};

export type OrganisationDirector = {
	organisation_director_uuid: string;
	full_name: string;
	designation: string | null;
	nationality_code: string | null;
	ownership_percent: number | null;
	kyc_status: VerificationStatus;
};

export type OrganisationBankAccount = {
	organisation_bank_account_uuid: string;
	bank_name: string;
	account_holder_name: string;
	masked_account_number: string;
	routing_code: string | null;
	currency_code: string;
	is_primary: boolean;
	verification_status: string;
};

export type OrganisationDocument = {
	organisation_document_uuid: string;
	document_type: string;
	storage_bucket: string;
	storage_path: string;
	original_filename: string;
	mime_type: string;
	file_size_bytes: number | null;
	status: 'pending' | 'approved' | 'rejected';
	created_at: string;
	review_notes: string | null;
	archived_at?: string | null;
	previous_storage_path?: string | null;
};

export type OrganisationChangeRequest = {
	organisation_change_request_uuid: string;
	section: ChangeRequestSection | string;
	proposed_changes: MutationPayload | Record<string, unknown>;
	status: 'pending' | 'approved' | 'rejected';
	submitted_by: string;
	reviewed_by: string | null;
	reviewed_at: string | null;
	review_notes: string | null;
	created_at: string;
};

export type PlatformNotification = {
	notification_uuid: string;
	notification_type: string;
	title: string;
	body: string;
	link_path: string | null;
	read_at: string | null;
	created_at: string;
};

export type OrganisationSummary = {
	organisation_uuid: string;
	org_code: string;
	legal_name: string;
	trade_name: string | null;
	entity_type: string;
	contact_email: string;
	contact_phone: string | null;
	country_code: string;
	preferred_language: string;
	primary_currency_code: string;
	overall_status: OnboardingStatus;
	kyc_status: VerificationStatus;
	kyb_status: VerificationStatus;
};

export type PlatformUserListItem = {
	profile_uuid: string;
	user_uuid: string;
	email: string;
	display_name: string;
	role: PlatformRole;
	is_active: boolean;
	created_at: string;
	changed_at: string;
};

export type BillingPlanType = 'free' | 'paid';

export type BillingInterval = 'none' | 'monthly' | 'yearly';

export type OrganisationBillingStatus =
	'free' | 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended';

export type BillingPlan = {
	billing_plan_uuid: string;
	plan_code: string;
	name: string;
	description: string | null;
	plan_type: BillingPlanType;
	amount_cents: number;
	currency_code: string;
	billing_interval: BillingInterval;
	is_active: boolean;
	created_at: string;
	changed_at: string;
};

export type OrganisationBilling = {
	organisation_billing_uuid: string;
	org_uuid: string;
	billing_plan_uuid: string;
	status: OrganisationBillingStatus;
	started_at: string;
	next_billing_at: string | null;
	notes: string | null;
	created_at: string;
	changed_at: string;
	billing_plan?: BillingPlan | null;
};

export type OrganisationBillingListItem = {
	organisation_uuid: string;
	org_code: string;
	legal_name: string;
	trade_name: string | null;
	contact_email: string;
	country_code: string;
	overall_status: OnboardingStatus;
	organisation_billing: OrganisationBilling | null;
};

export type OrganisationBillingDetail = OrganisationBillingListItem & {
	entity_type: string;
	contact_phone: string | null;
	preferred_language: string;
	primary_currency_code: string;
	kyc_status: VerificationStatus;
	kyb_status: VerificationStatus;
};
