<script lang="ts">
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { mode, toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button';
</script>

<Button variant="ghost" size="icon" onclick={toggleMode} aria-label="Toggle dark mode">
	{#if mode.current === 'dark'}
		<MoonIcon />
	{:else}
		<SunIcon />
	{/if}
</Button>
