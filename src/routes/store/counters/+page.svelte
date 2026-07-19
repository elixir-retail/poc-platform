<script lang="ts">
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<MonitorIcon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{t(locale, 'storeApp.counters.title')}
			</h1>
		</div>
		<p class="text-sm text-muted-foreground">{t(locale, 'storeApp.counters.description')}</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each data.counters as counter (counter.store_counter_uuid)}
			<Card.Root>
				<Card.Header>
					<div class="flex items-start justify-between gap-3">
						<div>
							<Card.Title>{counter.name}</Card.Title>
							<Card.Description class="font-mono">{counter.counter_code}</Card.Description>
						</div>
						<Badge variant={counter.status === 'online' ? 'default' : 'secondary'}>
							{t(locale, `storeApp.counter.${counter.status}` as MessageKey)}
						</Badge>
					</div>
				</Card.Header>
				<Card.Content class="text-sm text-muted-foreground">
					{#if counter.active_store_user_uuid === data.storeContext.membership.store_user_uuid}
						{t(locale, 'storeApp.counters.current')}
					{:else if counter.last_seen_at}
						{t(locale, 'storeApp.counters.lastSeen', {
							date: new Intl.DateTimeFormat(undefined, {
								dateStyle: 'medium',
								timeStyle: 'short'
							}).format(new Date(counter.last_seen_at))
						})}
					{:else}
						{t(locale, 'storeApp.counters.neverUsed')}
					{/if}
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
