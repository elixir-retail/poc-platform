<script lang="ts">
	import { page } from '$app/state';
	import { Badge } from '$lib/components/ui/badge';
	import { t, type Locale, type MessageKey } from '$lib/i18n';

	let { status }: { status: string } = $props();

	const locale = $derived(page.data.locale as Locale);
	const statusKey = $derived(`status.${status}` as MessageKey);
	const label = $derived(t(locale, statusKey));

	const variant = $derived(
		status === 'approved' || status === 'onboarded'
			? 'default'
			: status === 'rejected' || status === 'suspended'
				? 'destructive'
				: status === 'pending' || status === 'in_review' || status === 'submitted'
					? 'secondary'
					: 'outline'
	);
</script>

<Badge {variant}>{label}</Badge>
