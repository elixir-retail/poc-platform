<script lang="ts">
	import { navigating, page } from '$app/state';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import { t, type Locale } from '$lib/i18n';

	const locale = $derived(page.data.locale as Locale | undefined);
	// `$app/state` navigating is always an object; use `.to` to detect an in-flight navigation.
	const isLoading = $derived(navigating.to !== null);
	const label = $derived(locale ? t(locale, 'app.loading') : 'Loading…');
</script>

{#if isLoading}
	<div
		class="pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 overflow-hidden bg-transparent"
		aria-hidden="true"
	>
		<div class="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] bg-primary"></div>
	</div>

	<div
		class="fixed inset-0 z-99 flex items-center justify-center bg-background/40 backdrop-blur-[1px]"
		role="status"
		aria-live="polite"
		aria-busy="true"
	>
		<div
			class="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm"
		>
			<Loader2Icon class="size-4 animate-spin text-muted-foreground" />
			<span>{label}</span>
		</div>
	</div>
{/if}

<style>
	@keyframes loading-bar {
		0% {
			transform: translateX(-120%);
		}
		100% {
			transform: translateX(320%);
		}
	}
</style>
