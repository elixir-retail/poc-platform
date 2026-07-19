<script lang="ts">
	import StoreIcon from '@lucide/svelte/icons/store';
	import ModulePlaceholder from '$lib/components/organisation/module-placeholder.svelte';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ModulePlaceholder
	icon={StoreIcon}
	titleKey="orgApp.stores.title"
	descriptionKey="orgApp.stores.description"
	locale={data.locale as Locale}
/>
