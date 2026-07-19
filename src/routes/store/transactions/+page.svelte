<script lang="ts">
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);

	function formatAmount(amountCents: number, currencyCode: string, direction: 'in' | 'out') {
		const formatted = new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: currencyCode
		}).format(amountCents / 100);
		return direction === 'out' ? `−${formatted}` : formatted;
	}

	function entryLabel(entryType: string) {
		return t(locale, `storeApp.expenses.entry.${entryType}` as MessageKey);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<ReceiptIcon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{t(locale, 'storeApp.transactions')}
			</h1>
		</div>
		<p class="text-sm text-muted-foreground">{t(locale, 'storeApp.transactions.description')}</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'orgApp.transactions.list')}</Card.Title>
			<Card.Description>
				{t(locale, 'orgApp.transactions.records', { count: data.transactions.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'orgApp.transactions.code')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.transactions.type')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.transactions.channel')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.transactions.amount')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.transactions.payment')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.transactions.status')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.transactions.date')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.transactions as transaction (transaction.store_transaction_uuid)}
							<Table.Row>
								<Table.Cell class="ps-6 font-mono text-xs font-medium">
									{transaction.transaction_code}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={transaction.direction === 'out' ? 'destructive' : 'secondary'}>
										{entryLabel(transaction.entry_type)}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={transaction.channel === 'online' ? 'default' : 'secondary'}>
										{t(locale, `orgApp.transactions.${transaction.channel}` as MessageKey)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="font-medium">
									{formatAmount(
										transaction.gross_amount_cents,
										transaction.currency_code,
										transaction.direction
									)}
								</Table.Cell>
								<Table.Cell class="capitalize"
									>{transaction.payment_method.replaceAll('_', ' ')}</Table.Cell
								>
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
