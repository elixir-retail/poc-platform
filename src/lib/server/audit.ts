import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditWrite = {
	orgUuid?: string | null;
	actorProfileUuid: string;
	actorUserUuid: string;
	action: string;
	entityType: string;
	entityUuid: string;
	beforeData?: Record<string, unknown> | null;
	afterData?: Record<string, unknown> | null;
};

export async function writeAudit(supabase: SupabaseClient, input: AuditWrite): Promise<void> {
	const { error } = await supabase.from('audit_event').insert({
		org_uuid: input.orgUuid ?? null,
		actor_profile_uuid: input.actorProfileUuid,
		action: input.action,
		entity_type: input.entityType,
		entity_uuid: input.entityUuid,
		before_data: input.beforeData ?? null,
		after_data: input.afterData ?? null,
		created_by: input.actorUserUuid,
		changed_by: input.actorUserUuid
	});

	if (error) {
		throw new Error(`Audit write failed: ${error.message}`);
	}
}
