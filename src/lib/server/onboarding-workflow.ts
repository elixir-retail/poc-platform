import { writeAudit } from '$lib/server/audit';
import { notifyAdmins, notifyUser } from '$lib/server/notifications';
import type {
	ChangeRequestSection,
	MutationOperation,
	MutationPayload,
	OrganisationSummary,
	PlatformProfile
} from '$lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export type WorkflowActor = {
	user: User;
	profile: PlatformProfile;
};

export type WorkflowResult = {
	success: true;
	message: string;
};

function nowIso() {
	return new Date().toISOString();
}

function asPayload(input: unknown): MutationPayload {
	if (
		input &&
		typeof input === 'object' &&
		'operation' in input &&
		'values' in input &&
		typeof (input as MutationPayload).operation === 'string' &&
		typeof (input as MutationPayload).values === 'object' &&
		(input as MutationPayload).values !== null
	) {
		return input as MutationPayload;
	}

	return {
		operation: 'update',
		record_uuid: null,
		values: (input as Record<string, unknown>) ?? {}
	};
}

function reviewLink(orgCode: string, step = 'review') {
	return `/onboarding/${orgCode}?step=${step}`;
}

async function clearPrimaryAddress(
	supabase: SupabaseClient,
	orgUuid: string,
	actorUserUuid: string
) {
	const { error } = await supabase
		.from('organisation_address')
		.update({ is_primary: false, changed_by: actorUserUuid, changed_at: nowIso() })
		.eq('org_uuid', orgUuid)
		.eq('is_primary', true);
	if (error) throw new Error(error.message);
}

async function clearPrimaryBank(supabase: SupabaseClient, orgUuid: string, actorUserUuid: string) {
	const { error } = await supabase
		.from('organisation_bank_account')
		.update({ is_primary: false, changed_by: actorUserUuid, changed_at: nowIso() })
		.eq('org_uuid', orgUuid)
		.eq('is_primary', true);
	if (error) throw new Error(error.message);
}

export async function submitOrApplyMutation(
	supabase: SupabaseClient,
	actor: WorkflowActor,
	organisation: OrganisationSummary,
	section: ChangeRequestSection,
	payload: MutationPayload,
	options?: { successMessage?: string; notifyStep?: string }
): Promise<WorkflowResult> {
	if (actor.profile.role === 'platform_op') {
		const { data: changeRequest, error } = await supabase
			.from('organisation_change_request')
			.insert({
				org_uuid: organisation.organisation_uuid,
				section,
				proposed_changes: payload,
				submitted_by: actor.user.id,
				created_by: actor.user.id,
				changed_by: actor.user.id
			})
			.select('organisation_change_request_uuid')
			.single();

		if (error || !changeRequest) {
			throw new Error(error?.message ?? 'Unable to create change request');
		}

		await notifyAdmins(
			supabase,
			organisation.organisation_uuid,
			'Organisation change awaiting approval',
			`${actor.profile.display_name} submitted ${section} changes for ${organisation.org_code}.`,
			reviewLink(organisation.org_code, options?.notifyStep ?? 'review'),
			actor.user.id
		);

		await writeAudit(supabase, {
			orgUuid: organisation.organisation_uuid,
			actorProfileUuid: actor.profile.profile_uuid,
			actorUserUuid: actor.user.id,
			action: 'change_request.submitted',
			entityType: 'organisation_change_request',
			entityUuid: changeRequest.organisation_change_request_uuid,
			afterData: { section, ...payload }
		});

		return {
			success: true,
			message: options?.successMessage ?? 'Changes sent for admin approval.'
		};
	}

	const before = await loadSectionSnapshot(
		supabase,
		organisation.organisation_uuid,
		section,
		payload
	);
	await applyMutation(supabase, actor, organisation, section, payload);
	await writeAudit(supabase, {
		orgUuid: organisation.organisation_uuid,
		actorProfileUuid: actor.profile.profile_uuid,
		actorUserUuid: actor.user.id,
		action: `${section}.${payload.operation}`,
		entityType: sectionEntityType(section),
		entityUuid: payload.record_uuid ?? organisation.organisation_uuid,
		beforeData: before,
		afterData: payload
	});

	return {
		success: true,
		message: options?.successMessage ?? 'Changes applied.'
	};
}

function sectionEntityType(section: ChangeRequestSection): string {
	switch (section) {
		case 'address':
			return 'organisation_address';
		case 'director':
			return 'organisation_director';
		case 'bank':
			return 'organisation_bank_account';
		case 'document':
			return 'organisation_document';
		case 'currencies':
			return 'organisation_currency';
		case 'tax_ids':
			return 'organisation_tax_id';
		default:
			return 'organisation';
	}
}

async function loadSectionSnapshot(
	supabase: SupabaseClient,
	orgUuid: string,
	section: ChangeRequestSection,
	payload: MutationPayload
): Promise<Record<string, unknown> | null> {
	if (!payload.record_uuid) {
		const { data } = await supabase
			.from('organisation')
			.select(
				'legal_name, trade_name, entity_type, country_code, preferred_language, primary_currency_code, overall_status, kyc_status, kyb_status'
			)
			.eq('organisation_uuid', orgUuid)
			.maybeSingle();
		return (data as Record<string, unknown>) ?? null;
	}

	const table = sectionEntityType(section);
	if (table === 'organisation') {
		return null;
	}

	const { data } = await supabase
		.from(table)
		.select('*')
		.eq(`${table}_uuid`, payload.record_uuid)
		.eq('org_uuid', orgUuid)
		.maybeSingle();
	return (data as Record<string, unknown>) ?? null;
}

export async function applyMutation(
	supabase: SupabaseClient,
	actor: WorkflowActor,
	organisation: OrganisationSummary,
	section: ChangeRequestSection,
	rawPayload: MutationPayload | Record<string, unknown>
): Promise<void> {
	const payload = asPayload(rawPayload);
	const values = payload.values;
	const changedBy = actor.user.id;
	const changedAt = nowIso();
	const orgUuid = organisation.organisation_uuid;

	switch (section) {
		case 'overview':
		case 'verification': {
			const allowed = [
				'overall_status',
				'kyc_status',
				'kyb_status',
				'preferred_language',
				'country_code',
				'primary_currency_code',
				'contact_email',
				'contact_phone'
			] as const;
			const patch = Object.fromEntries(
				Object.entries(values).filter(([key]) => (allowed as readonly string[]).includes(key))
			);
			if (Object.keys(patch).length === 0) throw new Error('No overview fields to update');

			const { error } = await supabase
				.from('organisation')
				.update({ ...patch, changed_by: changedBy, changed_at: changedAt })
				.eq('organisation_uuid', orgUuid);
			if (error) throw new Error(error.message);

			if (
				typeof patch.primary_currency_code === 'string' &&
				patch.primary_currency_code.length === 3
			) {
				await syncPrimaryCurrency(supabase, orgUuid, patch.primary_currency_code, changedBy);
			}
			return;
		}
		case 'legal': {
			const allowed = ['legal_name', 'trade_name', 'entity_type'] as const;
			const legacyKeys = ['country_code', 'preferred_language', 'primary_currency_code'] as const;
			const patch = Object.fromEntries(
				Object.entries(values).filter(([key]) =>
					[...allowed, ...legacyKeys].includes(key as (typeof allowed)[number])
				)
			);
			if (values.trade_name === '') patch.trade_name = null;

			const { error } = await supabase
				.from('organisation')
				.update({ ...patch, changed_by: changedBy, changed_at: changedAt })
				.eq('organisation_uuid', orgUuid);
			if (error) throw new Error(error.message);

			if (Array.isArray(values.tax_ids)) {
				await replaceTaxIds(
					supabase,
					orgUuid,
					values.tax_ids as Array<Record<string, unknown>>,
					changedBy
				);
			}
			if (Array.isArray(values.currencies)) {
				await replaceCurrencies(
					supabase,
					orgUuid,
					values.currencies as Array<{ currency_code: string; is_primary: boolean }>,
					typeof values.primary_currency_code === 'string'
						? values.primary_currency_code
						: organisation.primary_currency_code,
					changedBy
				);
			}
			return;
		}
		case 'currencies': {
			const currencies =
				(values.currencies as Array<{
					currency_code: string;
					is_primary: boolean;
				}>) ?? [];
			const primary =
				(values.primary_currency_code as string) ??
				currencies.find((row) => row.is_primary)?.currency_code;
			if (!primary) throw new Error('Primary currency is required');
			await replaceCurrencies(supabase, orgUuid, currencies, primary, changedBy);
			return;
		}
		case 'tax_ids': {
			const taxIds = (values.tax_ids as Array<Record<string, unknown>>) ?? [];
			await replaceTaxIds(supabase, orgUuid, taxIds, changedBy);
			return;
		}
		case 'address':
			await mutateAddress(supabase, orgUuid, payload, changedBy, changedAt);
			return;
		case 'director':
			await mutateDirector(supabase, orgUuid, payload, changedBy, changedAt);
			return;
		case 'bank':
			await mutateBank(supabase, orgUuid, payload, changedBy, changedAt);
			return;
		case 'document':
			await mutateDocument(supabase, orgUuid, payload, changedBy, changedAt);
			return;
		default:
			throw new Error(`Unsupported section: ${section}`);
	}
}

async function syncPrimaryCurrency(
	supabase: SupabaseClient,
	orgUuid: string,
	primaryCurrencyCode: string,
	changedBy: string
) {
	const { data: existing, error } = await supabase
		.from('organisation_currency')
		.select('organisation_currency_uuid, currency_code, is_primary')
		.eq('org_uuid', orgUuid);
	if (error) throw new Error(error.message);

	const rows = existing ?? [];
	if (!rows.some((row) => row.currency_code === primaryCurrencyCode)) {
		const { error: insertError } = await supabase.from('organisation_currency').insert({
			org_uuid: orgUuid,
			currency_code: primaryCurrencyCode,
			is_primary: true,
			created_by: changedBy,
			changed_by: changedBy
		});
		if (insertError) throw new Error(insertError.message);
	}

	const { error: clearError } = await supabase
		.from('organisation_currency')
		.update({ is_primary: false, changed_by: changedBy, changed_at: nowIso() })
		.eq('org_uuid', orgUuid);
	if (clearError) throw new Error(clearError.message);

	const { error: setError } = await supabase
		.from('organisation_currency')
		.update({ is_primary: true, changed_by: changedBy, changed_at: nowIso() })
		.eq('org_uuid', orgUuid)
		.eq('currency_code', primaryCurrencyCode);
	if (setError) throw new Error(setError.message);

	const { error: orgError } = await supabase
		.from('organisation')
		.update({
			primary_currency_code: primaryCurrencyCode,
			changed_by: changedBy,
			changed_at: nowIso()
		})
		.eq('organisation_uuid', orgUuid);
	if (orgError) throw new Error(orgError.message);
}

async function replaceCurrencies(
	supabase: SupabaseClient,
	orgUuid: string,
	currencies: Array<{ currency_code: string; is_primary: boolean }>,
	primaryCurrencyCode: string,
	changedBy: string
) {
	const uniqueCodes = [...new Set(currencies.map((row) => row.currency_code.toUpperCase()))];
	if (!uniqueCodes.includes(primaryCurrencyCode)) {
		uniqueCodes.unshift(primaryCurrencyCode);
	}

	const { error: deleteError } = await supabase
		.from('organisation_currency')
		.delete()
		.eq('org_uuid', orgUuid);
	if (deleteError) throw new Error(deleteError.message);

	const { error: insertError } = await supabase.from('organisation_currency').insert(
		uniqueCodes.map((currency_code) => ({
			org_uuid: orgUuid,
			currency_code,
			is_primary: currency_code === primaryCurrencyCode,
			created_by: changedBy,
			changed_by: changedBy
		}))
	);
	if (insertError) throw new Error(insertError.message);

	const { error: orgError } = await supabase
		.from('organisation')
		.update({
			primary_currency_code: primaryCurrencyCode,
			changed_by: changedBy,
			changed_at: nowIso()
		})
		.eq('organisation_uuid', orgUuid);
	if (orgError) throw new Error(orgError.message);
}

async function replaceTaxIds(
	supabase: SupabaseClient,
	orgUuid: string,
	taxIds: Array<Record<string, unknown>>,
	changedBy: string
) {
	const { error: deleteError } = await supabase
		.from('organisation_tax_id')
		.delete()
		.eq('org_uuid', orgUuid);
	if (deleteError) throw new Error(deleteError.message);

	if (!taxIds.length) return;

	const { error: insertError } = await supabase.from('organisation_tax_id').insert(
		taxIds.map((taxId, index) => ({
			org_uuid: orgUuid,
			tax_type: taxId.tax_type,
			tax_value: taxId.tax_value,
			country_code: taxId.country_code,
			is_primary: Boolean(taxId.is_primary) || index === 0,
			verification_status: taxId.verification_status ?? 'pending',
			created_by: changedBy,
			changed_by: changedBy
		}))
	);
	if (insertError) throw new Error(insertError.message);
}

async function mutateAddress(
	supabase: SupabaseClient,
	orgUuid: string,
	payload: MutationPayload,
	changedBy: string,
	changedAt: string
) {
	const values = payload.values;
	const operation = payload.operation as MutationOperation;

	if (operation === 'delete') {
		if (!payload.record_uuid) throw new Error('Address id required');
		const { error } = await supabase
			.from('organisation_address')
			.delete()
			.eq('organisation_address_uuid', payload.record_uuid)
			.eq('org_uuid', orgUuid);
		if (error) throw new Error(error.message);
		return;
	}

	const row = {
		address_type: values.address_type,
		line_1: values.line_1,
		line_2: values.line_2 || null,
		city: values.city,
		region: values.region || null,
		postal_code: values.postal_code || null,
		country_code: values.country_code,
		is_primary: Boolean(values.is_primary),
		changed_by: changedBy,
		changed_at: changedAt
	};

	if (row.is_primary) await clearPrimaryAddress(supabase, orgUuid, changedBy);

	if (operation === 'create') {
		const { error } = await supabase.from('organisation_address').insert({
			...row,
			org_uuid: orgUuid,
			created_by: changedBy
		});
		if (error) throw new Error(error.message);
		return;
	}

	if (!payload.record_uuid) throw new Error('Address id required');
	const { error } = await supabase
		.from('organisation_address')
		.update(row)
		.eq('organisation_address_uuid', payload.record_uuid)
		.eq('org_uuid', orgUuid);
	if (error) throw new Error(error.message);
}

async function mutateDirector(
	supabase: SupabaseClient,
	orgUuid: string,
	payload: MutationPayload,
	changedBy: string,
	changedAt: string
) {
	const values = payload.values;
	const operation = payload.operation as MutationOperation;

	if (operation === 'delete') {
		if (!payload.record_uuid) throw new Error('Director id required');
		const { error } = await supabase
			.from('organisation_director')
			.delete()
			.eq('organisation_director_uuid', payload.record_uuid)
			.eq('org_uuid', orgUuid);
		if (error) throw new Error(error.message);
		return;
	}

	const row = {
		full_name: values.full_name,
		designation: values.designation || null,
		nationality_code: values.nationality_code || null,
		ownership_percent: values.ownership_percent ?? 0,
		kyc_status: values.kyc_status,
		changed_by: changedBy,
		changed_at: changedAt
	};

	if (operation === 'create') {
		const { error } = await supabase.from('organisation_director').insert({
			...row,
			org_uuid: orgUuid,
			created_by: changedBy
		});
		if (error) throw new Error(error.message);
		return;
	}

	if (!payload.record_uuid) throw new Error('Director id required');
	const { error } = await supabase
		.from('organisation_director')
		.update(row)
		.eq('organisation_director_uuid', payload.record_uuid)
		.eq('org_uuid', orgUuid);
	if (error) throw new Error(error.message);
}

async function mutateBank(
	supabase: SupabaseClient,
	orgUuid: string,
	payload: MutationPayload,
	changedBy: string,
	changedAt: string
) {
	const values = payload.values;
	const operation = payload.operation as MutationOperation;

	if (operation === 'delete') {
		if (!payload.record_uuid) throw new Error('Bank account id required');
		const { error } = await supabase
			.from('organisation_bank_account')
			.delete()
			.eq('organisation_bank_account_uuid', payload.record_uuid)
			.eq('org_uuid', orgUuid);
		if (error) throw new Error(error.message);
		return;
	}

	const row = {
		bank_name: values.bank_name,
		account_holder_name: values.account_holder_name,
		masked_account_number: values.masked_account_number,
		routing_code: values.routing_code || null,
		currency_code: values.currency_code,
		is_primary: Boolean(values.is_primary),
		verification_status: values.verification_status ?? 'pending',
		changed_by: changedBy,
		changed_at: changedAt
	};

	if (row.is_primary) await clearPrimaryBank(supabase, orgUuid, changedBy);

	if (operation === 'create') {
		const { error } = await supabase.from('organisation_bank_account').insert({
			...row,
			org_uuid: orgUuid,
			created_by: changedBy
		});
		if (error) throw new Error(error.message);
		return;
	}

	if (!payload.record_uuid) throw new Error('Bank account id required');
	const { error } = await supabase
		.from('organisation_bank_account')
		.update(row)
		.eq('organisation_bank_account_uuid', payload.record_uuid)
		.eq('org_uuid', orgUuid);
	if (error) throw new Error(error.message);
}

async function mutateDocument(
	supabase: SupabaseClient,
	orgUuid: string,
	payload: MutationPayload,
	changedBy: string,
	changedAt: string
) {
	if (!payload.record_uuid) throw new Error('Document id required');
	const values = payload.values;

	if (payload.operation === 'archive') {
		const { error } = await supabase
			.from('organisation_document')
			.update({
				archived_at: changedAt,
				archived_by: changedBy,
				changed_by: changedBy,
				changed_at: changedAt
			})
			.eq('organisation_document_uuid', payload.record_uuid)
			.eq('org_uuid', orgUuid);
		if (error) throw new Error(error.message);
		return;
	}

	const patch: Record<string, unknown> = {
		changed_by: changedBy,
		changed_at: changedAt
	};
	if (typeof values.document_type === 'string' && values.document_type) {
		patch.document_type = values.document_type;
	}
	if (typeof values.storage_path === 'string' && values.storage_path) {
		patch.previous_storage_path = values.previous_storage_path ?? null;
		patch.storage_path = values.storage_path;
		patch.original_filename = values.original_filename;
		patch.mime_type = values.mime_type;
		patch.file_size_bytes = values.file_size_bytes;
		patch.status = 'pending';
		patch.reviewed_by = null;
		patch.reviewed_at = null;
		patch.review_notes = null;
	}

	const { error } = await supabase
		.from('organisation_document')
		.update(patch)
		.eq('organisation_document_uuid', payload.record_uuid)
		.eq('org_uuid', orgUuid);
	if (error) throw new Error(error.message);
}

export async function reviewChangeRequest(
	supabase: SupabaseClient,
	actor: WorkflowActor,
	organisation: OrganisationSummary,
	requestUuid: string,
	decision: 'approved' | 'rejected',
	reviewNotes: string
): Promise<WorkflowResult> {
	if (actor.profile.role !== 'platform_admin') {
		throw new Error('Admin access required');
	}

	const { data: changeRequest, error: requestError } = await supabase
		.from('organisation_change_request')
		.select('*')
		.eq('organisation_change_request_uuid', requestUuid)
		.eq('org_uuid', organisation.organisation_uuid)
		.eq('status', 'pending')
		.single();

	if (requestError || !changeRequest) {
		throw new Error('Pending change request not found');
	}

	if (decision === 'approved') {
		await applyMutation(
			supabase,
			actor,
			organisation,
			changeRequest.section as ChangeRequestSection,
			changeRequest.proposed_changes as MutationPayload
		);
	}

	const reviewedAt = nowIso();
	const { error: updateError } = await supabase
		.from('organisation_change_request')
		.update({
			status: decision,
			reviewed_by: actor.user.id,
			reviewed_at: reviewedAt,
			review_notes: reviewNotes || null,
			changed_by: actor.user.id,
			changed_at: reviewedAt
		})
		.eq('organisation_change_request_uuid', changeRequest.organisation_change_request_uuid);

	if (updateError) throw new Error(updateError.message);

	await notifyUser(
		supabase,
		changeRequest.submitted_by,
		organisation.organisation_uuid,
		`Organisation change ${decision}`,
		`Your ${changeRequest.section} changes for ${organisation.org_code} were ${decision}.`,
		reviewLink(organisation.org_code),
		actor.user.id
	);

	await writeAudit(supabase, {
		orgUuid: organisation.organisation_uuid,
		actorProfileUuid: actor.profile.profile_uuid,
		actorUserUuid: actor.user.id,
		action: `change_request.${decision}`,
		entityType: 'organisation_change_request',
		entityUuid: changeRequest.organisation_change_request_uuid,
		beforeData: changeRequest,
		afterData: { status: decision, review_notes: reviewNotes }
	});

	return { success: true, message: `Change ${decision}.` };
}

export async function reviewDocument(
	supabase: SupabaseClient,
	actor: WorkflowActor,
	organisation: OrganisationSummary,
	documentUuid: string,
	decision: 'approved' | 'rejected',
	reviewNotes: string
): Promise<WorkflowResult> {
	if (actor.profile.role !== 'platform_admin') {
		throw new Error('Admin access required');
	}

	const { data: document, error: documentError } = await supabase
		.from('organisation_document')
		.select('*')
		.eq('organisation_document_uuid', documentUuid)
		.eq('org_uuid', organisation.organisation_uuid)
		.is('archived_at', null)
		.single();

	if (documentError || !document) {
		throw new Error('Document not found');
	}

	const reviewedAt = nowIso();
	const { error: updateError } = await supabase
		.from('organisation_document')
		.update({
			status: decision,
			reviewed_by: actor.user.id,
			reviewed_at: reviewedAt,
			review_notes: reviewNotes || null,
			changed_by: actor.user.id,
			changed_at: reviewedAt
		})
		.eq('organisation_document_uuid', document.organisation_document_uuid);

	if (updateError) throw new Error(updateError.message);

	if (document.uploaded_by) {
		await notifyUser(
			supabase,
			document.uploaded_by,
			organisation.organisation_uuid,
			`Document ${decision}`,
			`${document.original_filename} for ${organisation.org_code} was ${decision}.`,
			reviewLink(organisation.org_code, 'documents'),
			actor.user.id
		);
	}

	await writeAudit(supabase, {
		orgUuid: organisation.organisation_uuid,
		actorProfileUuid: actor.profile.profile_uuid,
		actorUserUuid: actor.user.id,
		action: `document.${decision}`,
		entityType: 'organisation_document',
		entityUuid: document.organisation_document_uuid,
		beforeData: document,
		afterData: { status: decision, review_notes: reviewNotes }
	});

	return { success: true, message: `Document ${decision}.` };
}

export async function uploadOrganisationDocument(
	supabase: SupabaseClient,
	actor: WorkflowActor,
	organisation: OrganisationSummary,
	file: File,
	documentType: string
): Promise<WorkflowResult> {
	if (file.size > 10 * 1024 * 1024) {
		throw new Error('Documents must be 10 MB or smaller.');
	}
	if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
		throw new Error('Upload a PDF, PNG, or JPEG file.');
	}

	const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
	const storagePath = `${organisation.org_code}/${crypto.randomUUID()}-${safeName}`;
	const { error: uploadError } = await supabase.storage
		.from('organisation-documents')
		.upload(storagePath, file, { contentType: file.type, upsert: false });
	if (uploadError) throw new Error(uploadError.message);

	const { data: document, error: metadataError } = await supabase
		.from('organisation_document')
		.insert({
			org_uuid: organisation.organisation_uuid,
			document_type: documentType,
			storage_path: storagePath,
			original_filename: file.name,
			mime_type: file.type,
			file_size_bytes: file.size,
			status: 'pending',
			uploaded_by: actor.user.id,
			created_by: actor.user.id,
			changed_by: actor.user.id
		})
		.select('organisation_document_uuid')
		.single();

	if (metadataError || !document) {
		await supabase.storage.from('organisation-documents').remove([storagePath]);
		throw new Error(metadataError?.message ?? 'Unable to save document metadata');
	}

	await notifyAdmins(
		supabase,
		organisation.organisation_uuid,
		'Document awaiting review',
		`${actor.profile.display_name} uploaded ${file.name} for ${organisation.org_code}.`,
		reviewLink(organisation.org_code, 'documents'),
		actor.user.id
	);

	await writeAudit(supabase, {
		orgUuid: organisation.organisation_uuid,
		actorProfileUuid: actor.profile.profile_uuid,
		actorUserUuid: actor.user.id,
		action: 'document.uploaded',
		entityType: 'organisation_document',
		entityUuid: document.organisation_document_uuid,
		afterData: {
			document_type: documentType,
			original_filename: file.name,
			storage_path: storagePath
		}
	});

	return { success: true, message: 'Document uploaded for review.' };
}

export async function replaceOrganisationDocument(
	supabase: SupabaseClient,
	actor: WorkflowActor,
	organisation: OrganisationSummary,
	documentUuid: string,
	file: File,
	documentType?: string
): Promise<WorkflowResult> {
	const { data: document, error } = await supabase
		.from('organisation_document')
		.select('*')
		.eq('organisation_document_uuid', documentUuid)
		.eq('org_uuid', organisation.organisation_uuid)
		.is('archived_at', null)
		.single();

	if (error || !document) throw new Error('Document not found');

	if (file.size > 10 * 1024 * 1024) {
		throw new Error('Documents must be 10 MB or smaller.');
	}
	if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
		throw new Error('Upload a PDF, PNG, or JPEG file.');
	}

	const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
	const storagePath = `${organisation.org_code}/${crypto.randomUUID()}-${safeName}`;
	const { error: uploadError } = await supabase.storage
		.from('organisation-documents')
		.upload(storagePath, file, { contentType: file.type, upsert: false });
	if (uploadError) throw new Error(uploadError.message);

	const payload: MutationPayload = {
		operation: 'replace',
		record_uuid: documentUuid,
		values: {
			document_type: documentType || document.document_type,
			previous_storage_path: document.storage_path,
			storage_path: storagePath,
			original_filename: file.name,
			mime_type: file.type,
			file_size_bytes: file.size
		}
	};

	return submitOrApplyMutation(supabase, actor, organisation, 'document', payload, {
		successMessage:
			actor.profile.role === 'platform_op'
				? 'Document replacement sent for approval.'
				: 'Document file replaced.',
		notifyStep: 'documents'
	});
}
