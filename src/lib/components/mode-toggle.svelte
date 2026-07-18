<script lang="ts">
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { mode, toggleMode } from 'mode-watcher';
	import { page } from '$app/state';
	import { t, type Locale } from '$lib/i18n';
	import { Button } from '$lib/components/ui/button';

	let { locale }: { locale?: Locale } = $props();

	const activeLocale = $derived(locale ?? (page.data.locale as Locale));
	const label = $derived(
		mode.current === 'dark' ? t(activeLocale, 'theme.toLight') : t(activeLocale, 'theme.toDark')
	);
</script>

<Button variant="ghost" size="icon" onclick={toggleMode} aria-label={label}>
	{#if mode.current === 'dark'}
		<MoonIcon />
	{:else}
		<SunIcon />
	{/if}
</Button>
