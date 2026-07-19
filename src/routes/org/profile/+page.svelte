<script lang="ts">
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import ModulePlaceholder from '$lib/components/organisation/module-placeholder.svelte';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ModulePlaceholder
	icon={Building2Icon}
	titleKey="orgApp.profile.title"
	descriptionKey="orgApp.profile.description"
	locale={data.locale as Locale}
/>
