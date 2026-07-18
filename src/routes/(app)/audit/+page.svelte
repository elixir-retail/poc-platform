<script lang="ts">
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const locale = $derived(data.locale as Locale);
</script>

<div class="flex flex-col gap-6">
	<div>
		<div class="flex items-center gap-2">
			<ClipboardListIcon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{t(locale, 'audit.title')}
			</h1>
		</div>
		<p class="mt-1 text-sm text-muted-foreground">{t(locale, 'audit.description')}</p>
	</div>

	<Card.Root>
		<Card.Content class="px-0 pt-6">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="ps-6">When</Table.Head>
						<Table.Head>Actor</Table.Head>
						<Table.Head>Organisation</Table.Head>
						<Table.Head>Action</Table.Head>
						<Table.Head>Entity</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.events as event (event.audit_event_uuid)}
						<Table.Row>
							<Table.Cell class="ps-6 text-sm whitespace-nowrap text-muted-foreground">
								{new Intl.DateTimeFormat(undefined, {
									dateStyle: 'medium',
									timeStyle: 'short'
								}).format(new Date(event.created_at))}
							</Table.Cell>
							<Table.Cell>
								{event.profile?.display_name ?? event.profile?.email ?? 'System'}
							</Table.Cell>
							<Table.Cell>
								{event.organisation?.org_code ?? '—'}
								{#if event.organisation?.legal_name}
									<span class="block max-w-56 truncate text-xs text-muted-foreground">
										{event.organisation.legal_name}
									</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="font-medium">{event.action.replaceAll('.', ' · ')}</Table.Cell>
							<Table.Cell class="text-muted-foreground">{event.entity_type}</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={5} class="h-28 text-center text-muted-foreground">
								No audit events found.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
