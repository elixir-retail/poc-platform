<script lang="ts">
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ModulePlaceholder from '$lib/components/organisation/module-placeholder.svelte';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ModulePlaceholder
	icon={SettingsIcon}
	titleKey="storeApp.settings.title"
	descriptionKey="storeApp.settings.description"
	locale={data.locale as Locale}
	skeletonKey="storeApp.skeleton"
/>
