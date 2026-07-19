import { writeAudit } from '$lib/server/audit';
import type { WorkflowActor } from '$lib/server/onboarding-workflow';
import type {
	BillingPlan,
	OrganisationBilling,
	OrganisationBillingStatus
} from '$lib/types/platform';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CreateBillingPlanInput = {
	plan_code: string;
	name: string;
	description: string | null;
	plan_type: 'free' | 'paid';
	amount_cents: number;
	currency_code: string;
	billing_interval: 'none' | 'monthly' | 'yearly';
	is_active: boolean;
};

export type AssignOrganisationBillingInput = {
	org_uuid: string;
	billing_plan_uuid: string;
	status: OrganisationBillingStatus;
	notes: string | null;
	next_billing_at: string | null;
};

function requireAdmin(actor: WorkflowActor) {
	if (actor.profile.role !== 'platform_admin') {
		throw new Error('Only platform admins can manage billing');
	}
}

function normalizeAssignment(
	plan: Pick<BillingPlan, 'plan_type'>,
	status: OrganisationBillingStatus,
	nextBillingAt: string | null
): { status: OrganisationBillingStatus; next_billing_at: string | null } {
	if (plan.plan_type === 'free') {
		return { status: 'free', next_billing_at: null };
	}
	if (status === 'free') {
		throw new Error('Paid plans cannot use free status');
	}
	return { status, next_billing_at: nextBillingAt };
}

export async function createBillingPlan(
	supabase: SupabaseClient,
	actor: WorkflowActor,
	input: CreateBillingPlanInput
): Promise<BillingPlan> {
	requireAdmin(actor);

	const now = new Date().toISOString();
	const { data, error } = await supabase
		.from('billing_plan')
		.insert({
			plan_code: input.plan_code,
			name: input.name,
			description: input.description,
			plan_type: input.plan_type,
			amount_cents: input.plan_type === 'free' ? 0 : input.amount_cents,
			currency_code: input.currency_code,
			billing_interval: input.plan_type === 'free' ? 'none' : input.billing_interval,
			is_active: input.is_active,
			created_by: actor.user.id,
			changed_by: actor.user.id,
			created_at: now,
			changed_at: now
		})
		.select(
			'billing_plan_uuid, plan_code, name, description, plan_type, amount_cents, currency_code, billing_interval, is_active, created_at, changed_at'
		)
		.single();

	if (error || !data) throw new Error(error?.message ?? 'Unable to create billing plan');

	await writeAudit(supabase, {
		orgUuid: null,
		actorProfileUuid: actor.profile.profile_uuid,
		actorUserUuid: actor.user.id,
		action: 'billing_plan.created',
		entityType: 'billing_plan',
		entityUuid: data.billing_plan_uuid,
		afterData: data
	});

	return data as BillingPlan;
}

export async function assignOrganisationBilling(
	supabase: SupabaseClient,
	actor: WorkflowActor,
	input: AssignOrganisationBillingInput
): Promise<OrganisationBilling> {
	requireAdmin(actor);

	const { data: plan, error: planError } = await supabase
		.from('billing_plan')
		.select('billing_plan_uuid, plan_type, is_active')
		.eq('billing_plan_uuid', input.billing_plan_uuid)
		.maybeSingle();

	if (planError) throw new Error(planError.message);
	if (!plan) throw new Error('Billing plan not found');
	if (!plan.is_active) throw new Error('Cannot assign an inactive billing plan');

	const normalized = normalizeAssignment(plan, input.status, input.next_billing_at);
	const now = new Date().toISOString();
	const nextBillingAt = normalized.next_billing_at
		? new Date(
				/^\d{4}-\d{2}-\d{2}$/.test(normalized.next_billing_at)
					? `${normalized.next_billing_at}T00:00:00.000Z`
					: normalized.next_billing_at
			).toISOString()
		: null;

	const { data: existing } = await supabase
		.from('organisation_billing')
		.select(
			'organisation_billing_uuid, org_uuid, billing_plan_uuid, status, started_at, next_billing_at, notes, created_at, changed_at'
		)
		.eq('org_uuid', input.org_uuid)
		.maybeSingle();

	if (existing) {
		const { data, error } = await supabase
			.from('organisation_billing')
			.update({
				billing_plan_uuid: input.billing_plan_uuid,
				status: normalized.status,
				next_billing_at: nextBillingAt,
				notes: input.notes,
				changed_by: actor.user.id,
				changed_at: now
			})
			.eq('organisation_billing_uuid', existing.organisation_billing_uuid)
			.select(
				'organisation_billing_uuid, org_uuid, billing_plan_uuid, status, started_at, next_billing_at, notes, created_at, changed_at'
			)
			.single();

		if (error || !data) throw new Error(error?.message ?? 'Unable to update organisation billing');

		await writeAudit(supabase, {
			orgUuid: input.org_uuid,
			actorProfileUuid: actor.profile.profile_uuid,
			actorUserUuid: actor.user.id,
			action: 'organisation_billing.updated',
			entityType: 'organisation_billing',
			entityUuid: data.organisation_billing_uuid,
			beforeData: existing,
			afterData: data
		});

		return data as OrganisationBilling;
	}

	const { data, error } = await supabase
		.from('organisation_billing')
		.insert({
			org_uuid: input.org_uuid,
			billing_plan_uuid: input.billing_plan_uuid,
			status: normalized.status,
			started_at: now,
			next_billing_at: nextBillingAt,
			notes: input.notes,
			created_by: actor.user.id,
			changed_by: actor.user.id,
			created_at: now,
			changed_at: now
		})
		.select(
			'organisation_billing_uuid, org_uuid, billing_plan_uuid, status, started_at, next_billing_at, notes, created_at, changed_at'
		)
		.single();

	if (error || !data) throw new Error(error?.message ?? 'Unable to assign organisation billing');

	await writeAudit(supabase, {
		orgUuid: input.org_uuid,
		actorProfileUuid: actor.profile.profile_uuid,
		actorUserUuid: actor.user.id,
		action: 'organisation_billing.assigned',
		entityType: 'organisation_billing',
		entityUuid: data.organisation_billing_uuid,
		afterData: data
	});

	return data as OrganisationBilling;
}
