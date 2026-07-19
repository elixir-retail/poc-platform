<script lang="ts">
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { t, type Locale } from '$lib/i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const locale = $derived(data.locale as Locale);
	const availableCounters = $derived(
		data.counters.filter(
			(counter) =>
				counter.status === 'offline' ||
				counter.active_store_user_uuid === data.storeContext.membership.store_user_uuid
		)
	);
	let counterUuid = $state('');
</script>

<div class="flex min-h-svh items-center justify-center bg-background p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header>
			<div class="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
				<MonitorIcon class="size-5 text-muted-foreground" />
			</div>
			<Card.Title>{t(locale, 'storeApp.counter.selectTitle')}</Card.Title>
			<Card.Description>
				{t(locale, 'storeApp.counter.selectDescription', { store: data.storeContext.store.name })}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" id="select-counter-form" class="grid gap-4">
				{#if form?.message}
					<div class="rounded-lg border border-border p-3 text-sm text-destructive" role="alert">
						{form.message}
					</div>
				{/if}
				<div class="grid gap-2">
					<Label>{t(locale, 'storeApp.counter.counter')}</Label>
					<input type="hidden" name="store_counter_uuid" value={counterUuid} />
					<Select.Root type="single" bind:value={counterUuid}>
						<Select.Trigger class="w-full">
							{availableCounters.find((counter) => counter.store_counter_uuid === counterUuid)
								?.name ?? t(locale, 'storeApp.counter.choose')}
						</Select.Trigger>
						<Select.Content>
							{#each availableCounters as counter (counter.store_counter_uuid)}
								<Select.Item value={counter.store_counter_uuid} label={counter.name}>
									{counter.name} · {counter.counter_code}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</form>
		</Card.Content>
		<Card.Footer>
			<Button type="submit" form="select-counter-form" class="w-full" disabled={!counterUuid}>
				{t(locale, 'storeApp.counter.continue')}
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
