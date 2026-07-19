<script lang="ts">
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { StoreBillPaymentMethod } from '$lib/types/platform';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);

	function money(cents: number) {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: data.currencyCode
		}).format(cents / 100);
	}

	function methodLabel(method: string) {
		return t(locale, `storeApp.pos.method.${method}` as MessageKey);
	}

	function paymentSummary(
		payments: { payment_method: StoreBillPaymentMethod; amount_cents: number }[]
	) {
		if (payments.length === 0) return '—';
		if (payments.length === 1) {
			return `${methodLabel(payments[0].payment_method)} ${money(payments[0].amount_cents)}`;
		}
		return `${t(locale, 'storeApp.reports.split')}: ${payments
			.map((payment) => `${methodLabel(payment.payment_method)} ${money(payment.amount_cents)}`)
			.join(' · ')}`;
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<ClipboardListIcon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{t(locale, 'storeApp.reports.title')}
			</h1>
		</div>
		<p class="text-sm text-muted-foreground">{t(locale, 'storeApp.reports.description')}</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.reports.salesToday')}</Card.Description>
				<Card.Title class="text-2xl">{money(data.summary.salesTodayCents)}</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.reports.billsToday')}</Card.Description>
				<Card.Title class="text-2xl">{data.summary.billsToday}</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.reports.avgTicket')}</Card.Description>
				<Card.Title class="text-2xl">{money(data.summary.avgTicketCents)}</Card.Title>
			</Card.Header>
		</Card.Root>
	</div>

	{#if data.tenderMix.length}
		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'storeApp.reports.tenderMix')}</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-2">
				{#each data.tenderMix as tender (tender.method)}
					<Badge variant="secondary" class="px-3 py-1.5 text-sm font-normal">
						{methodLabel(tender.method)} · {money(tender.amountCents)}
					</Badge>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'storeApp.reports.completedBills')}</Card.Title>
			<Card.Description>
				{t(locale, 'orgApp.transactions.records', { count: data.bills.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'storeApp.reports.billNumber')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.reports.customer')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.reports.amount')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.reports.payments')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.reports.completedAt')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.bills as bill (bill.store_bill_uuid)}
							<Table.Row>
								<Table.Cell class="ps-6 font-mono text-xs font-medium">
									{bill.bill_number}
								</Table.Cell>
								<Table.Cell>
									<p class="font-medium">
										{bill.customer_name || t(locale, 'storeApp.reports.walkIn')}
									</p>
									{#if bill.customer_phone}
										<p class="text-xs text-muted-foreground">{bill.customer_phone}</p>
									{/if}
								</Table.Cell>
								<Table.Cell class="font-medium">{money(bill.total_cents)}</Table.Cell>
								<Table.Cell class="max-w-xs text-sm text-muted-foreground">
									{paymentSummary(bill.payments)}
								</Table.Cell>
								<Table.Cell class="whitespace-nowrap text-muted-foreground">
									{#if bill.completed_at}
										{new Intl.DateTimeFormat(undefined, {
											dateStyle: 'medium',
											timeStyle: 'short'
										}).format(new Date(bill.completed_at))}
									{:else}
										—
									{/if}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={5} class="h-32 text-center text-muted-foreground">
									{t(locale, 'storeApp.reports.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
