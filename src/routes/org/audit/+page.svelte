<script lang="ts">
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);

	function actorName(organisationUserUuid: string) {
		return (
			data.organisationUsers.find((user) => user.organisation_user_uuid === organisationUserUuid)
				?.display_name ?? '—'
		);
	}

	function humanize(value: string) {
		return value.replaceAll('.', ' ').replaceAll('_', ' ');
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<ClipboardListIcon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{t(locale, 'orgApp.audit.title')}
			</h1>
		</div>
		<p class="text-sm text-muted-foreground">{t(locale, 'orgApp.audit.description')}</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'orgApp.audit.title')}</Card.Title>
			<Card.Description>
				{t(locale, 'orgApp.audit.records', { count: data.events.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'orgApp.audit.column.activity')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.audit.column.actor')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.audit.column.entity')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.audit.column.date')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.events as event (event.organisation_audit_event_uuid)}
							<Table.Row>
								<Table.Cell class="ps-6 font-medium capitalize">
									{humanize(event.action)}
								</Table.Cell>
								<Table.Cell>{actorName(event.actor_organisation_user_uuid)}</Table.Cell>
								<Table.Cell>
									<Badge variant="outline" class="capitalize">
										{humanize(event.entity_type)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-sm whitespace-nowrap text-muted-foreground">
									{new Intl.DateTimeFormat(undefined, {
										dateStyle: 'medium',
										timeStyle: 'short'
									}).format(new Date(event.created_at))}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={4} class="h-32 text-center text-muted-foreground">
									{t(locale, 'orgApp.audit.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
