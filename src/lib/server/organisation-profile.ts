import { type TenantProfileInput, tenantProfileSchema } from '$lib/schemas/organisation-profile';
import { canManageOrganisation } from '$lib/server/organisation-auth';
import { notifyAdmins } from '$lib/server/notifications';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import type {
	OrganisationAddress,
	OrganisationAppContext,
	OrganisationBankAccount,
	OrganisationChangeRequest,
	OrganisationCurrency,
	OrganisationDirector,
	OrganisationDocument,
	OrganisationSummary,
	OrganisationTaxId
} from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export type OrganisationProfileDetail = OrganisationSummary & {
	organisation_currency: OrganisationCurrency[];
	organisation_tax_id: OrganisationTaxId[];
	organisation_address: OrganisationAddress[];
	organisation_director: OrganisationDirector[];
	organisation_bank_account: OrganisationBankAccount[];
	organisation_document: OrganisationDocument[];
	organisation_change_request: OrganisationChangeRequest[];
};

export async function loadOrganisationProfile(
	supabase: SupabaseClient,
	orgUuid: string
): Promise<OrganisationProfileDetail> {
	const { data, error } = await supabase
		.from('organisation')
		.select(
			`
			organisation_uuid,
			org_code,
			legal_name,
			trade_name,
			entity_type,
			contact_email,
			contact_phone,
			country_code,
			preferred_language,
			primary_currency_code,
			overall_status,
			kyc_status,
			kyb_status,
			organisation_currency(currency_code, is_primary),
			organisation_tax_id(
				organisation_tax_id_uuid,
				tax_type,
				tax_value,
				country_code,
				is_primary,
				verification_status
			),
			organisation_address(
				organisation_address_uuid,
				address_type,
				line_1,
				line_2,
				city,
				region,
				postal_code,
				country_code,
				is_primary
			),
			organisation_director(
				organisation_director_uuid,
				full_name,
				designation,
				nationality_code,
				ownership_percent,
				kyc_status
			),
			organisation_bank_account(
				organisation_bank_account_uuid,
				bank_name,
				account_holder_name,
				masked_account_number,
				routing_code,
				currency_code,
				is_primary,
				verification_status
			),
			organisation_document(
				organisation_document_uuid,
				document_type,
				storage_bucket,
				storage_path,
				original_filename,
				mime_type,
				file_size_bytes,
				status,
				created_at,
				review_notes,
				archived_at,
				previous_storage_path
			),
			organisation_change_request(
				organisation_change_request_uuid,
				section,
				proposed_changes,
				status,
				submitted_by,
				reviewed_by,
				reviewed_at,
				review_notes,
				created_at
			)
		`
		)
		.eq('organisation_uuid', orgUuid)
		.single();

	if (error || !data) {
		throw new Error(error?.message ?? 'Unable to load organisation profile');
	}

	return data as OrganisationProfileDetail;
}

export async function submitTenantProfileChange(
	supabase: SupabaseClient,
	user: User,
	context: OrganisationAppContext,
	rawInput: unknown
): Promise<{ success: true; message: string }> {
	if (!canManageOrganisation(context.membership.role)) {
		throw new Error('Only organisation administrators can submit profile changes.');
	}

	const parsed = tenantProfileSchema.safeParse(rawInput);
	if (!parsed.success) {
		throw new Error(parsed.error.issues[0]?.message ?? 'Invalid profile details');
	}

	const input = parsed.data;
	await assertCurrencyConfigured(supabase, context.organisation.organisation_uuid, input);

	const { data: pending, error: pendingError } = await supabase
		.from('organisation_change_request')
		.select('organisation_change_request_uuid')
		.eq('org_uuid', context.organisation.organisation_uuid)
		.eq('section', 'tenant_profile')
		.eq('status', 'pending')
		.limit(1)
		.maybeSingle();

	if (pendingError) throw new Error(pendingError.message);
	if (pending) {
		throw new Error('A profile change is already awaiting platform approval.');
	}

	const payload = {
		operation: 'update' as const,
		record_uuid: null,
		values: {
			legal_name: input.legal_name,
			trade_name: input.trade_name,
			entity_type: input.entity_type,
			contact_email: input.contact_email,
			contact_phone: input.contact_phone,
			country_code: input.country_code,
			preferred_language: input.preferred_language,
			primary_currency_code: input.primary_currency_code
		}
	};

	const { data: changeRequest, error } = await supabase
		.from('organisation_change_request')
		.insert({
			org_uuid: context.organisation.organisation_uuid,
			section: 'tenant_profile',
			proposed_changes: payload,
			submitted_by: user.id,
			created_by: user.id,
			changed_by: user.id
		})
		.select('organisation_change_request_uuid')
		.single();

	if (error || !changeRequest) {
		throw new Error(error?.message ?? 'Unable to submit profile change request');
	}

	const { error: auditError } = await supabase.from('organisation_audit_event').insert({
		org_uuid: context.organisation.organisation_uuid,
		actor_organisation_user_uuid: context.membership.organisation_user_uuid,
		action: 'tenant_profile.submitted',
		entity_type: 'organisation_change_request',
		entity_uuid: changeRequest.organisation_change_request_uuid,
		before_data: null,
		after_data: payload,
		created_by: user.id,
		changed_by: user.id
	});
	if (auditError) throw new Error(auditError.message);

	const admin = getSupabaseAdmin();
	await notifyAdmins(
		admin,
		context.organisation.organisation_uuid,
		'Organisation profile awaiting approval',
		`${context.membership.display_name} submitted profile changes for ${context.organisation.org_code}.`,
		`/onboarding/${context.organisation.org_code}?step=review`,
		user.id
	);

	return {
		success: true,
		message: 'Profile changes submitted for platform admin approval.'
	};
}

async function assertCurrencyConfigured(
	supabase: SupabaseClient,
	orgUuid: string,
	input: TenantProfileInput
) {
	const { data, error } = await supabase
		.from('organisation_currency')
		.select('currency_code')
		.eq('org_uuid', orgUuid)
		.eq('currency_code', input.primary_currency_code)
		.maybeSingle();

	if (error) throw new Error(error.message);
	if (!data) {
		throw new Error('Choose a currency already configured for this organisation.');
	}
}
