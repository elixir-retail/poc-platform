<script lang="ts">
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import ModulePlaceholder from '$lib/components/organisation/module-placeholder.svelte';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ModulePlaceholder
	icon={MonitorIcon}
	titleKey="storeApp.devices.title"
	descriptionKey="storeApp.devices.description"
	locale={data.locale as Locale}
	skeletonKey="storeApp.skeleton"
/>
