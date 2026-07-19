import { writeAudit } from '$lib/server/audit';
import type { WorkflowActor } from '$lib/server/onboarding-workflow';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CreateOrganisationInput = {
	legal_name: string;
	contact_email: string;
	temporary_password: string;
	contact_phone: string | null;
	entity_type: string;
	country_code: string;
	preferred_language: 'en' | 'hi' | 'ta' | 'te';
	primary_currency_code: string;
};

function nextOrgCode(existingCodes: string[]): string {
	let max = 1000;
	for (const code of existingCodes) {
		const match = /^ORG-(\d+)$/.exec(code);
		if (!match) continue;
		max = Math.max(max, Number(match[1]));
	}
	return `ORG-${String(max + 1).padStart(4, '0')}`;
}

export async function createOrganisation(
	supabase: SupabaseClient,
	actor: WorkflowActor,
	input: CreateOrganisationInput
): Promise<{ org_code: string; organisation_uuid: string }> {
	const { data: existing, error: listError } = await supabase
		.from('organisation')
		.select('org_code');
	if (listError) throw new Error(listError.message);

	const orgCode = nextOrgCode((existing ?? []).map((row) => row.org_code));
	const now = new Date().toISOString();

	const { data: organisation, error: insertError } = await supabase
		.from('organisation')
		.insert({
			org_code: orgCode,
			legal_name: input.legal_name,
			trade_name: null,
			entity_type: input.entity_type,
			contact_email: input.contact_email,
			contact_phone: input.contact_phone,
			country_code: input.country_code,
			preferred_language: input.preferred_language,
			primary_currency_code: input.primary_currency_code,
			overall_status: 'draft',
			kyc_status: 'not_started',
			kyb_status: 'not_started',
			created_by: actor.user.id,
			changed_by: actor.user.id,
			changed_at: now
		})
		.select('organisation_uuid, org_code')
		.single();

	if (insertError || !organisation) {
		throw new Error(insertError?.message ?? 'Unable to create organisation');
	}

	const { error: currencyError } = await supabase.from('organisation_currency').insert({
		org_uuid: organisation.organisation_uuid,
		currency_code: input.primary_currency_code,
		is_primary: true,
		created_by: actor.user.id,
		changed_by: actor.user.id
	});

	if (currencyError) {
		await getSupabaseAdmin()
			.from('organisation')
			.delete()
			.eq('organisation_uuid', organisation.organisation_uuid);
		throw new Error(currencyError.message);
	}

	const admin = getSupabaseAdmin();
	const { data: authData, error: authError } = await admin.auth.admin.createUser({
		email: input.contact_email,
		password: input.temporary_password,
		email_confirm: true,
		user_metadata: {
			display_name: `${input.legal_name} Root`,
			must_change_password: true,
			account_type: 'organisation'
		}
	});

	if (authError || !authData.user) {
		await admin
			.from('organisation')
			.delete()
			.eq('organisation_uuid', organisation.organisation_uuid);
		throw new Error(authError?.message ?? 'Unable to create the root organisation user');
	}

	const rootUserUuid = authData.user.id;
	const { error: membershipError } = await admin.from('organisation_user').insert({
		org_uuid: organisation.organisation_uuid,
		user_uuid: rootUserUuid,
		email: input.contact_email,
		display_name: `${input.legal_name} Root`,
		role: 'root',
		is_active: true,
		created_by: actor.user.id,
		changed_by: actor.user.id
	});

	if (membershipError) {
		await admin.auth.admin.deleteUser(rootUserUuid);
		await admin
			.from('organisation')
			.delete()
			.eq('organisation_uuid', organisation.organisation_uuid);
		throw new Error(membershipError.message);
	}

	await writeAudit(supabase, {
		orgUuid: organisation.organisation_uuid,
		actorProfileUuid: actor.profile.profile_uuid,
		actorUserUuid: actor.user.id,
		action: 'organisation.created',
		entityType: 'organisation',
		entityUuid: organisation.organisation_uuid,
		afterData: {
			org_code: organisation.org_code,
			legal_name: input.legal_name,
			contact_email: input.contact_email,
			contact_phone: input.contact_phone,
			entity_type: input.entity_type,
			country_code: input.country_code,
			preferred_language: input.preferred_language,
			primary_currency_code: input.primary_currency_code,
			root_user_uuid: rootUserUuid
		}
	});

	return organisation;
}
