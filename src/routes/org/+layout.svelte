<script lang="ts">
	import LocaleSwitcher from '$lib/components/locale-switcher.svelte';
	import ModeToggle from '$lib/components/mode-toggle.svelte';
	import OrganisationAppSidebar from '$lib/components/organisation-app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { t, type Locale } from '$lib/i18n';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const locale = $derived(data.locale as Locale);
	const toggleLabel = $derived(t(locale, 'app.toggleSidebar'));
	const sidebarTitle = $derived(t(locale, 'app.sidebar'));
	const sidebarDescription = $derived(t(locale, 'app.sidebarDescription'));
	const organisationName = $derived(
		data.organisationContext.organisation.trade_name ??
			data.organisationContext.organisation.legal_name
	);
</script>

{#if data.user?.user_metadata?.must_change_password}
	{@render children()}
{:else}
	<Sidebar.Provider>
		<OrganisationAppSidebar
			context={data.organisationContext}
			{locale}
			{toggleLabel}
			{sidebarTitle}
			{sidebarDescription}
		/>
		<Sidebar.Inset>
			<header class="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
				<Sidebar.Trigger class="-ms-1" label={toggleLabel} />
				<span class="truncate text-sm font-medium text-foreground">{organisationName}</span>
				<div class="ms-auto flex items-center gap-1">
					<ModeToggle {locale} />
					<LocaleSwitcher {locale} />
				</div>
			</header>
			<main class="flex flex-1 flex-col gap-4 p-4 md:p-6">
				{@render children()}
			</main>
		</Sidebar.Inset>
	</Sidebar.Provider>
{/if}
