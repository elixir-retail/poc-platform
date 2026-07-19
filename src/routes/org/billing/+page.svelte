<script lang="ts">
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import ModulePlaceholder from '$lib/components/organisation/module-placeholder.svelte';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ModulePlaceholder
	icon={CreditCardIcon}
	titleKey="orgApp.billing.title"
	descriptionKey="orgApp.billing.description"
	locale={data.locale as Locale}
/>
