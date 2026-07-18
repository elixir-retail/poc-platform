export type PlatformRole = 'platform_admin' | 'platform_op';

export type PlatformProfile = {
	profile_uuid: string;
	user_uuid: string;
	email: string;
	display_name: string;
	role: PlatformRole;
	is_active: boolean;
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
	| 'verification';

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
	country_code: string;
	preferred_language: string;
	primary_currency_code: string;
	overall_status: OnboardingStatus;
	kyc_status: VerificationStatus;
	kyb_status: VerificationStatus;
};
