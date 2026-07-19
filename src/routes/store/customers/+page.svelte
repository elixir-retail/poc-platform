<script lang="ts">
	import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
	import ModulePlaceholder from '$lib/components/organisation/module-placeholder.svelte';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ModulePlaceholder
	icon={ShoppingBagIcon}
	titleKey="storeApp.customers.title"
	descriptionKey="storeApp.customers.description"
	locale={data.locale as Locale}
	skeletonKey="storeApp.skeleton"
/>
