<script lang="ts">
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import { page } from '$app/state';
	import { LOCALE_LABELS, LOCALES, t, type Locale } from '$lib/i18n';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	let { locale }: { locale: Locale } = $props();

	const label = $derived(t(locale, 'app.language'));
	const redirectTo = $derived(page.url.pathname + page.url.search);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button variant="ghost" size="icon" aria-label={label} {...props}>
				<LanguagesIcon />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="min-w-40">
		<DropdownMenu.Label>{label}</DropdownMenu.Label>
		{#each LOCALES as option (option)}
			<form method="POST" action="/locale">
				<input type="hidden" name="locale" value={option} />
				<input type="hidden" name="redirectTo" value={redirectTo} />
				<DropdownMenu.Item>
					{#snippet child({ props })}
						<button type="submit" class="w-full text-start" {...props}>
							<span class="flex w-full items-center justify-between gap-4">
								<span>{LOCALE_LABELS[option]}</span>
								{#if option === locale}
									<span class="text-xs text-muted-foreground" aria-hidden="true">✓</span>
								{/if}
							</span>
						</button>
					{/snippet}
				</DropdownMenu.Item>
			</form>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
