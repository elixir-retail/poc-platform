<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
	import CustomerFormSheet from '$lib/components/store/customer-form-sheet.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { billTotals } from '$lib/pos';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const locale = $derived(data.locale as Locale);
	const customer = $derived(data.customer);
	let editOpen = $state(false);
	let deleteConfirmOpen = $state(false);

	$effect(() => {
		if (form?.success) editOpen = false;
	});

	function money(cents: number, currencyCode: string) {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: currencyCode
		}).format(cents / 100);
	}

	const lifetimeCents = $derived(
		data.purchases.reduce((sum, bill) => sum + billTotals(bill).totalCents, 0)
	);

	function confirmDeleteCustomer() {
		(document.getElementById('delete-customer-form') as HTMLFormElement | null)?.requestSubmit();
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<a
				href={resolve('/store/customers')}
				class="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			>
				<ArrowLeftIcon class="size-4" />
				{t(locale, 'storeApp.customers.back')}
			</a>
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-2xl font-semibold tracking-tight">{customer.full_name}</h1>
				<Badge variant={customer.status === 'active' ? 'secondary' : 'outline'}>
					{t(locale, `storeApp.customers.status.${customer.status}` as MessageKey)}
				</Badge>
			</div>
			<p class="font-mono text-sm text-muted-foreground">{customer.phone}</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button variant="outline" onclick={() => (editOpen = true)}>
				<PencilIcon class="size-4" />
				{t(locale, 'storeApp.customers.edit')}
			</Button>
			{#if data.canManage}
				<form id="delete-customer-form" method="POST" action="?/deleteCustomer">
					<Button type="button" variant="destructive" onclick={() => (deleteConfirmOpen = true)}>
						{t(locale, 'storeApp.customers.delete')}
					</Button>
				</form>
			{/if}
		</div>
	</div>

	{#if form?.message}
		<div
			class="rounded-lg border border-border bg-card px-4 py-3 text-sm"
			class:text-destructive={form.success === false}
			role="status"
		>
			{form.message}
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.customers.purchases')}</Card.Description>
				<Card.Title class="text-2xl">{data.purchases.length}</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.customers.lifetimeSpend')}</Card.Description>
				<Card.Title class="text-2xl">
					{money(lifetimeCents, data.storeContext.store.currency_code)}
				</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.customers.email')}</Card.Description>
				<Card.Title class="truncate text-base font-medium">
					{customer.email || '—'}
				</Card.Title>
			</Card.Header>
		</Card.Root>
	</div>

	<div class="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'storeApp.customers.details')}</Card.Title>
			</Card.Header>
			<Card.Content class="grid gap-3 text-sm">
				<div>
					<p class="text-muted-foreground">{t(locale, 'storeApp.customers.address')}</p>
					<p class="mt-1">
						{[customer.address_line1, customer.address_line2].filter(Boolean).join(', ') || '—'}
					</p>
					<p>
						{[customer.city, customer.state, customer.postal_code].filter(Boolean).join(', ') || ''}
					</p>
					{#if customer.country}
						<p>{customer.country}</p>
					{/if}
				</div>
				{#if customer.notes}
					<div>
						<p class="text-muted-foreground">{t(locale, 'storeApp.customers.notes')}</p>
						<p class="mt-1 whitespace-pre-wrap">{customer.notes}</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'storeApp.customers.purchaseHistory')}</Card.Title>
				<Card.Description>
					{t(locale, 'storeApp.customers.purchaseCount', { count: data.purchases.length })}
				</Card.Description>
			</Card.Header>
			<Card.Content class="px-0">
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="ps-6">{t(locale, 'storeApp.reports.billNumber')}</Table.Head>
								<Table.Head>{t(locale, 'storeApp.reports.amount')}</Table.Head>
								<Table.Head>{t(locale, 'storeApp.reports.payments')}</Table.Head>
								<Table.Head>{t(locale, 'storeApp.reports.completedAt')}</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.purchases as bill (bill.store_bill_uuid)}
								{@const totals = billTotals(bill)}
								<Table.Row>
									<Table.Cell class="ps-6 font-mono text-xs">{bill.bill_number}</Table.Cell>
									<Table.Cell class="font-medium">
										{money(totals.totalCents, bill.currency_code)}
									</Table.Cell>
									<Table.Cell class="max-w-xs text-sm text-muted-foreground">
										{bill.payments
											.map(
												(payment) =>
													`${t(locale, `storeApp.pos.method.${payment.payment_method}` as MessageKey)} ${money(payment.amount_cents, bill.currency_code)}`
											)
											.join(' · ') || '—'}
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
									<Table.Cell colspan={4} class="h-28 text-center text-muted-foreground">
										{t(locale, 'storeApp.customers.noPurchases')}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<CustomerFormSheet
	bind:open={editOpen}
	{locale}
	customer={customer}
	formId="edit-customer-form"
/>

{#if data.canManage}
	<ConfirmDialog
		bind:open={deleteConfirmOpen}
		title={t(locale, 'storeApp.customers.deleteTitle')}
		description={t(locale, 'storeApp.customers.deleteConfirm')}
		confirmLabel={t(locale, 'common.delete')}
		cancelLabel={t(locale, 'common.cancel')}
		onConfirm={confirmDeleteCustomer}
	/>
{/if}
