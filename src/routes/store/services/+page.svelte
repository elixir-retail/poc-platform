<script lang="ts">
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import ModulePlaceholder from '$lib/components/organisation/module-placeholder.svelte';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ModulePlaceholder
	icon={WrenchIcon}
	titleKey="storeApp.services.title"
	descriptionKey="storeApp.services.description"
	locale={data.locale as Locale}
	skeletonKey="storeApp.skeleton"
/>
