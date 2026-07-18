import { error, fail } from '@sveltejs/kit';
import {
	addressSchema,
	bankSchema,
	currenciesSchema,
	documentMetaSchema,
	documentReviewSchema,
	directorSchema,
	legalDetailsSchema,
	overviewSchema,
	reviewSchema,
	taxIdsSchema
} from '$lib/schemas/onboarding';
import { getPlatformProfile } from '$lib/server/platform-auth';
import {
	replaceOrganisationDocument,
	reviewChangeRequest,
	reviewDocument,
	submitOrApplyMutation,
	uploadOrganisationDocument,
	type WorkflowActor
} from '$lib/server/onboarding-workflow';
import type {
	OrganisationDetail,
	OrganisationDocument,
	OrganisationSummary
} from '$lib/types/platform';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Actions, PageServerLoad } from './$types';

const organisationSelect = `
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
	changed_at,
	organisation_currency(organisation_currency_uuid, currency_code, is_primary),
	organisation_tax_id(
		organisation_tax_id_uuid,
		tax_type,
		tax_value,
		country_code,
		is_primary,
		verification_status
	),
	organisation_address(*),
	organisation_director(*),
	organisation_bank_account(*),
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
`;

async function requireActor(
	supabase: SupabaseClient,
	safeGetSession: App.Locals['safeGetSession']
): Promise<WorkflowActor> {
	const { user } = await safeGetSession();
	if (!user) error(401, 'Authentication required');
	const profile = await getPlatformProfile(supabase, user);
	if (!profile) error(403, 'Platform access required');
	return { user, profile };
}

async function getOrganisationSummary(
	supabase: SupabaseClient,
	orgCode: string
): Promise<OrganisationSummary> {
	const { data, error: queryError } = await supabase
		.from('organisation')
		.select(
			'organisation_uuid, org_code, legal_name, trade_name, entity_type, country_code, preferred_language, primary_currency_code, overall_status, kyc_status, kyb_status'
		)
		.eq('org_code', orgCode)
		.single();

	if (queryError || !data) error(404, 'Organisation not found');
	return data as OrganisationSummary;
}

function actionFail(action: string, message: string, status = 400) {
	return fail(status, { action, message, success: false as const });
}

function actionOk(action: string, message: string) {
	return { success: true as const, action, message };
}

async function runAction(
	action: string,
	fn: () => Promise<{ message: string }>
): Promise<ReturnType<typeof actionOk> | ReturnType<typeof actionFail>> {
	try {
		const result = await fn();
		return actionOk(action, result.message);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unexpected error';
		const status = message.includes('required') || message.includes('not found') ? 400 : 500;
		return actionFail(action, message, status);
	}
}

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data, error: queryError } = await supabase
		.from('organisation')
		.select(organisationSelect)
		.eq('org_code', params.orgCode)
		.single();

	if (queryError || !data) {
		error(404, 'Organisation not found');
	}

	const organisation = data as unknown as OrganisationDetail;
	organisation.organisation_document = (organisation.organisation_document ?? []).filter(
		(document) => !document.archived_at
	);

	const documentUrls: Record<string, string> = {};
	await Promise.all(
		organisation.organisation_document.map(async (document: OrganisationDocument) => {
			const { data: signed } = await supabase.storage
				.from(document.storage_bucket)
				.createSignedUrl(document.storage_path, 60 * 10);
			if (signed?.signedUrl) {
				documentUrls[document.organisation_document_uuid] = signed.signedUrl;
			}
		})
	);

	return { organisation, documentUrls };
};

export const actions: Actions = {
	saveOverview: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('saveOverview', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const parsed = overviewSchema.safeParse(Object.fromEntries(await request.formData()));
			if (!parsed.success) throw new Error('Check the overview details.');

			return submitOrApplyMutation(supabase, actor, organisation, 'overview', {
				operation: 'update',
				values: parsed.data
			});
		}),

	saveLegal: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('saveLegal', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const parsed = legalDetailsSchema.safeParse(Object.fromEntries(await request.formData()));
			if (!parsed.success) throw new Error('Check the legal details.');

			return submitOrApplyMutation(supabase, actor, organisation, 'legal', {
				operation: 'update',
				values: {
					legal_name: parsed.data.legal_name,
					trade_name: parsed.data.trade_name || null,
					entity_type: parsed.data.entity_type
				}
			});
		}),

	saveCurrencies: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('saveCurrencies', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const formData = await request.formData();
			const parsed = currenciesSchema.safeParse({
				currency_codes: formData.getAll('currency_code'),
				primary_currency_code: formData.get('primary_currency_code')
			});
			if (!parsed.success) throw new Error('Check the currency details.');

			return submitOrApplyMutation(supabase, actor, organisation, 'currencies', {
				operation: 'update',
				values: {
					primary_currency_code: parsed.data.primary_currency_code,
					currencies: parsed.data.currency_codes.map((currency_code) => ({
						currency_code,
						is_primary: currency_code === parsed.data.primary_currency_code
					}))
				}
			});
		}),

	saveTaxIds: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('saveTaxIds', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const formData = await request.formData();
			const parsed = taxIdsSchema.safeParse({
				tax_uuids: formData.getAll('tax_uuid'),
				tax_types: formData.getAll('tax_type'),
				tax_values: formData.getAll('tax_value'),
				tax_countries: formData.getAll('tax_country'),
				tax_verifications: formData.getAll('tax_verification'),
				primary_tax_index: formData.get('primary_tax_index') ?? 0
			});
			if (!parsed.success) throw new Error('Check the tax ID details.');

			const taxIds = parsed.data.tax_types.map((tax_type, index) => ({
				tax_type,
				tax_value: parsed.data.tax_values[index],
				country_code: parsed.data.tax_countries[index],
				verification_status: parsed.data.tax_verifications[index],
				is_primary: index === parsed.data.primary_tax_index
			}));

			return submitOrApplyMutation(supabase, actor, organisation, 'tax_ids', {
				operation: 'update',
				values: { tax_ids: taxIds }
			});
		}),

	saveAddress: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('saveAddress', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const parsed = addressSchema.safeParse(Object.fromEntries(await request.formData()));
			if (!parsed.success) throw new Error('Check the address details.');

			const { operation, record_uuid, ...values } = parsed.data;
			return submitOrApplyMutation(supabase, actor, organisation, 'address', {
				operation,
				record_uuid: record_uuid || null,
				values
			});
		}),

	saveDirector: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('saveDirector', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const parsed = directorSchema.safeParse(Object.fromEntries(await request.formData()));
			if (!parsed.success) throw new Error('Check the director details.');

			const { operation, record_uuid, ...values } = parsed.data;
			return submitOrApplyMutation(supabase, actor, organisation, 'director', {
				operation,
				record_uuid: record_uuid || null,
				values: {
					...values,
					nationality_code: values.nationality_code || null
				}
			});
		}),

	saveBank: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('saveBank', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const parsed = bankSchema.safeParse(Object.fromEntries(await request.formData()));
			if (!parsed.success) throw new Error('Check the bank account details.');

			const { operation, record_uuid, ...values } = parsed.data;
			return submitOrApplyMutation(supabase, actor, organisation, 'bank', {
				operation,
				record_uuid: record_uuid || null,
				values
			});
		}),

	saveDocumentMeta: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('saveDocumentMeta', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const parsed = documentMetaSchema.safeParse(Object.fromEntries(await request.formData()));
			if (!parsed.success) throw new Error('Check the document details.');

			return submitOrApplyMutation(supabase, actor, organisation, 'document', {
				operation: parsed.data.operation,
				record_uuid: parsed.data.record_uuid,
				values: { document_type: parsed.data.document_type }
			});
		}),

	replaceDocument: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('replaceDocument', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const formData = await request.formData();
			const documentUuid = String(formData.get('record_uuid') ?? '');
			const documentType = String(formData.get('document_type') ?? '');
			const file = formData.get('document');
			if (!documentUuid || !(file instanceof File) || file.size === 0) {
				throw new Error('Choose a replacement file.');
			}
			return replaceOrganisationDocument(
				supabase,
				actor,
				organisation,
				documentUuid,
				file,
				documentType || undefined
			);
		}),

	reviewChange: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('reviewChange', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const parsed = reviewSchema.safeParse(Object.fromEntries(await request.formData()));
			if (!parsed.success) throw new Error('Invalid review request.');
			return reviewChangeRequest(
				supabase,
				actor,
				organisation,
				parsed.data.request_uuid,
				parsed.data.decision,
				parsed.data.review_notes
			);
		}),

	uploadDocument: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('uploadDocument', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const formData = await request.formData();
			const file = formData.get('document');
			const documentType = String(formData.get('document_type') ?? '').trim();
			if (!(file instanceof File) || file.size === 0 || !documentType) {
				throw new Error('Choose a document and type.');
			}
			return uploadOrganisationDocument(supabase, actor, organisation, file, documentType);
		}),

	reviewDocument: async ({ request, params, locals: { supabase, safeGetSession } }) =>
		runAction('reviewDocument', async () => {
			const actor = await requireActor(supabase, safeGetSession);
			const organisation = await getOrganisationSummary(supabase, params.orgCode);
			const parsed = documentReviewSchema.safeParse(Object.fromEntries(await request.formData()));
			if (!parsed.success) throw new Error('Invalid document review.');
			return reviewDocument(
				supabase,
				actor,
				organisation,
				parsed.data.document_uuid,
				parsed.data.decision,
				parsed.data.review_notes
			);
		})
};
