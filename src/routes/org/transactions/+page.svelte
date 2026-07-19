<script lang="ts">
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const locale = $derived(data.locale as Locale);
	let storeFilter = $state('all');
	let channelFilter = $state('all');

	const filteredTransactions = $derived(
		data.transactions.filter(
			(transaction) =>
				(storeFilter === 'all' || transaction.store_uuid === storeFilter) &&
				(channelFilter === 'all' || transaction.channel === channelFilter)
		)
	);
	const onlineCount = $derived(
		data.transactions.filter((transaction) => transaction.channel === 'online').length
	);
	const offlineCount = $derived(
		data.transactions.filter((transaction) => transaction.channel === 'offline').length
	);

	function formatAmount(amountCents: number, currencyCode: string) {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: currencyCode
		}).format(amountCents / 100);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<ReceiptIcon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{t(locale, 'orgApp.transactions.title')}
			</h1>
		</div>
		<p class="text-sm text-muted-foreground">{t(locale, 'orgApp.transactions.description')}</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'orgApp.transactions.total')}</Card.Description>
				<Card.Title>{data.transactions.length}</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'orgApp.transactions.online')}</Card.Description>
				<Card.Title>{onlineCount}</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'orgApp.transactions.offline')}</Card.Description>
				<Card.Title>{offlineCount}</Card.Title>
			</Card.Header>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header class="gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<Card.Title>{t(locale, 'orgApp.transactions.list')}</Card.Title>
				<Card.Description>
					{t(locale, 'orgApp.transactions.records', { count: filteredTransactions.length })}
				</Card.Description>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<Select.Root type="single" bind:value={storeFilter}>
					<Select.Trigger class="w-full sm:w-48">
						{storeFilter === 'all'
							? t(locale, 'orgApp.transactions.allStores')
							: data.stores.find((store) => store.store_uuid === storeFilter)?.name}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label={t(locale, 'orgApp.transactions.allStores')} />
						{#each data.stores as store (store.store_uuid)}
							<Select.Item value={store.store_uuid} label={store.name} />
						{/each}
					</Select.Content>
				</Select.Root>
				<Select.Root type="single" bind:value={channelFilter}>
					<Select.Trigger class="w-full sm:w-44">
						{channelFilter === 'all'
							? t(locale, 'orgApp.transactions.allChannels')
							: t(locale, `orgApp.transactions.${channelFilter}` as MessageKey)}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label={t(locale, 'orgApp.transactions.allChannels')} />
						<Select.Item value="online" label={t(locale, 'orgApp.transactions.online')} />
						<Select.Item value="offline" label={t(locale, 'orgApp.transactions.offline')} />
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'orgApp.transactions.code')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.transactions.store')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.transactions.channel')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.transactions.amount')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.transactions.payment')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.transactions.status')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.transactions.date')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredTransactions as transaction (transaction.store_transaction_uuid)}
							<Table.Row>
								<Table.Cell class="ps-6 font-mono text-xs font-medium">
									{transaction.transaction_code}
								</Table.Cell>
								<Table.Cell>
									<div class="flex min-w-40 flex-col">
										<span class="font-medium">{transaction.store?.name ?? '—'}</span>
										<span class="font-mono text-xs text-muted-foreground">
											{transaction.store?.store_code ?? '—'}
										</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={transaction.channel === 'online' ? 'default' : 'secondary'}>
										{t(locale, `orgApp.transactions.${transaction.channel}` as MessageKey)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="font-medium">
									{formatAmount(transaction.gross_amount_cents, transaction.currency_code)}
								</Table.Cell>
								<Table.Cell class="capitalize">{transaction.payment_method}</Table.Cell>
								<Table.Cell>
									<Badge
										variant={transaction.status === 'failed'
											? 'destructive'
											: transaction.status === 'completed'
												? 'secondary'
												: 'outline'}
									>
										{t(locale, `orgApp.transactions.status.${transaction.status}` as MessageKey)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="whitespace-nowrap text-muted-foreground">
									{new Intl.DateTimeFormat(undefined, {
										dateStyle: 'medium',
										timeStyle: 'short'
									}).format(new Date(transaction.occurred_at))}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={7} class="h-32 text-center text-muted-foreground">
									{t(locale, 'orgApp.transactions.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
