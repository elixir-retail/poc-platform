import type { PageServerLoad } from './$types';

type AuditEventRow = {
	audit_event_uuid: string;
	action: string;
	entity_type: string;
	before_data: Record<string, unknown> | null;
	after_data: Record<string, unknown> | null;
	created_at: string;
	profile: { display_name: string; email: string } | null;
	organisation: { org_code: string; legal_name: string } | null;
};

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data } = await supabase
		.from('audit_event')
		.select(
			`
			audit_event_uuid,
			action,
			entity_type,
			before_data,
			after_data,
			created_at,
			profile:actor_profile_uuid(display_name, email),
			organisation:org_uuid(org_code, legal_name)
		`
		)
		.order('created_at', { ascending: false })
		.limit(100);

	return { events: (data ?? []) as unknown as AuditEventRow[] };
};
