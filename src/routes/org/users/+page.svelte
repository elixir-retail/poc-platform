<script lang="ts">
	import UsersIcon from '@lucide/svelte/icons/users';
	import ModulePlaceholder from '$lib/components/organisation/module-placeholder.svelte';
	import type { Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ModulePlaceholder
	icon={UsersIcon}
	titleKey="orgApp.users.title"
	descriptionKey="orgApp.users.description"
	locale={data.locale as Locale}
/>
