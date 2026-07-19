<script lang="ts">
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import ModulePlaceholder from '$lib/components/organisation/module-placeholder.svelte';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ModulePlaceholder
	icon={ClipboardListIcon}
	titleKey="storeApp.reports.title"
	descriptionKey="storeApp.reports.description"
	locale={data.locale as Locale}
	skeletonKey="storeApp.skeleton"
/>
