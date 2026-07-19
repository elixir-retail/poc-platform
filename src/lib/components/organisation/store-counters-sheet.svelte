<script lang="ts">
	import { enhance } from '$app/forms';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { StoreCounter } from '$lib/types/platform';

	let {
		open = $bindable(false),
		counters,
		locale,
		message = null
	}: {
		open?: boolean;
		counters: StoreCounter[];
		locale: Locale;
		message?: string | null;
	} = $props();

	let counterName = $state('');
	let pending = $state(false);

	$effect(() => {
		if (open) counterName = '';
	});
</script>

<EditSheet
	bind:open
	title={t(locale, 'orgApp.stores.counters.editTitle')}
	description={t(locale, 'orgApp.stores.counters.editDescription')}
>
	<div class="flex flex-col gap-6">
		{#if message}
			<p class="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
				{message}
			</p>
		{/if}

		<section class="flex flex-col gap-3">
			<h3 class="text-sm font-semibold">{t(locale, 'orgApp.stores.counters.list')}</h3>
			{#each counters as counter (counter.store_counter_uuid)}
				<div
					class="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
				>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">{counter.name}</p>
						<p class="font-mono text-xs text-muted-foreground">{counter.counter_code}</p>
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<Badge variant={counter.status === 'online' ? 'default' : 'secondary'}>
							{t(locale, `storeApp.counter.${counter.status}` as MessageKey)}
						</Badge>
						<form
							method="POST"
							action="?/deleteCounter"
							use:enhance={() => {
								pending = true;
								return async ({ update }) => {
									await update();
									pending = false;
								};
							}}
						>
							<input
								type="hidden"
								name="store_counter_uuid"
								value={counter.store_counter_uuid}
							/>
							<Button
								type="submit"
								variant="ghost"
								size="icon"
								class="size-8 text-destructive"
								disabled={pending || counter.status === 'online' || counters.length <= 1}
								aria-label={t(locale, 'orgApp.stores.counters.delete')}
								title={counter.status === 'online'
									? t(locale, 'orgApp.stores.counters.deleteOnlineHint')
									: counters.length <= 1
										? t(locale, 'orgApp.stores.counters.deleteLastHint')
										: t(locale, 'orgApp.stores.counters.delete')}
							>
								<Trash2Icon class="size-4" />
							</Button>
						</form>
					</div>
				</div>
			{/each}
		</section>

		<section class="flex flex-col gap-3">
			<h3 class="text-sm font-semibold">{t(locale, 'orgApp.stores.counters.add')}</h3>
			<form
				method="POST"
				action="?/addCounter"
				class="flex flex-col gap-3"
				use:enhance={() => {
					pending = true;
					return async ({ result, update }) => {
						await update();
						pending = false;
						if (result.type === 'success') counterName = '';
					};
				}}
			>
				<div class="flex flex-col gap-2">
					<Label for="counter_name">{t(locale, 'orgApp.stores.counters.name')}</Label>
					<Input
						id="counter_name"
						name="name"
						bind:value={counterName}
						placeholder={t(locale, 'orgApp.stores.counters.namePlaceholder')}
						maxlength={80}
						disabled={pending || counters.length >= 20}
					/>
					<p class="text-xs text-muted-foreground">
						{t(locale, 'orgApp.stores.counters.nameHint')}
					</p>
				</div>
				<Button type="submit" disabled={pending || counters.length >= 20} class="w-full sm:w-auto">
					<PlusIcon class="size-4" />
					{t(locale, 'orgApp.stores.counters.add')}
				</Button>
				{#if counters.length >= 20}
					<p class="text-xs text-muted-foreground">{t(locale, 'orgApp.stores.counters.maxHint')}</p>
				{/if}
			</form>
		</section>
	</div>
</EditSheet>
