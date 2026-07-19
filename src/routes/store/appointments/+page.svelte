<script lang="ts">
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import ModulePlaceholder from '$lib/components/organisation/module-placeholder.svelte';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ModulePlaceholder
	icon={CalendarClockIcon}
	titleKey="storeApp.appointments.title"
	descriptionKey="storeApp.appointments.description"
	locale={data.locale as Locale}
	skeletonKey="storeApp.skeleton"
/>
