<script lang="ts">
	import LocaleSwitcher from '$lib/components/locale-switcher.svelte';
	import ModeToggle from '$lib/components/mode-toggle.svelte';
	import StoreAppSidebar from '$lib/components/store-app-sidebar.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { t, type Locale } from '$lib/i18n';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const locale = $derived(data.locale as Locale);
	const toggleLabel = $derived(t(locale, 'app.toggleSidebar'));
	const sidebarTitle = $derived(t(locale, 'app.sidebar'));
	const sidebarDescription = $derived(t(locale, 'app.sidebarDescription'));
</script>

{#if data.user?.user_metadata?.must_change_password || !data.activeCounter}
	{@render children()}
{:else}
	<Sidebar.Provider>
		<StoreAppSidebar
			context={data.storeContext}
			{locale}
			{toggleLabel}
			{sidebarTitle}
			{sidebarDescription}
		/>
		<Sidebar.Inset>
			<header class="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
				<Sidebar.Trigger class="-ms-1" label={toggleLabel} />
				<span class="truncate text-sm font-medium text-foreground"
					>{data.storeContext.store.name}</span
				>
				{#if data.activeCounter}
					<Badge variant="secondary" class="hidden sm:inline-flex">
						{data.activeCounter.name} · {t(locale, 'storeApp.counter.online')}
					</Badge>
				{/if}
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
