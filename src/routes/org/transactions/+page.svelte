<script lang="ts">
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import ModulePlaceholder from '$lib/components/organisation/module-placeholder.svelte';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ModulePlaceholder
	icon={ReceiptIcon}
	titleKey="orgApp.transactions.title"
	descriptionKey="orgApp.transactions.description"
	locale={data.locale as Locale}
/>
