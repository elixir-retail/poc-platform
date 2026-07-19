<script lang="ts">
	import BanknoteIcon from '@lucide/svelte/icons/banknote';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Textarea } from '$lib/components/ui/textarea';
	import { CASHBOOK_PAYMENT_METHODS, EXPENSE_CATEGORIES } from '$lib/schemas/expenses';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const locale = $derived(data.locale as Locale);

	let expenseOpen = $state(false);
	let cashOpen = $state(false);
	let expenseCategory = $state<(typeof EXPENSE_CATEGORIES)[number]>('supplies');
	let expenseMethod = $state<(typeof CASHBOOK_PAYMENT_METHODS)[number]>('cash');

	$effect(() => {
		if (form?.success) {
			expenseOpen = false;
			cashOpen = false;
		}
	});

	function money(cents: number) {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: data.currencyCode
		}).format(cents / 100);
	}

	function categoryLabel(category: string | null) {
		if (!category) return '—';
		return t(locale, `storeApp.expenses.category.${category}` as MessageKey);
	}

	function entryLabel(entryType: string) {
		return t(locale, `storeApp.expenses.entry.${entryType}` as MessageKey);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<WalletIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight">
					{t(locale, 'storeApp.expenses.title')}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground">{t(locale, 'storeApp.expenses.description')}</p>
		</div>
		{#if data.canManage}
			<div class="flex flex-wrap gap-2">
				<Button variant="outline" onclick={() => (cashOpen = true)}>
					<BanknoteIcon class="size-4" />
					{t(locale, 'storeApp.expenses.addCash')}
				</Button>
				<Button onclick={() => (expenseOpen = true)}>
					<PlusIcon class="size-4" />
					{t(locale, 'storeApp.expenses.addExpense')}
				</Button>
			</div>
		{/if}
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
				<Card.Description>{t(locale, 'storeApp.expenses.summary.in')}</Card.Description>
				<Card.Title class="text-2xl text-foreground">
					{money(
						data.entries
							.filter((entry) => entry.direction === 'in')
							.reduce((sum, entry) => sum + entry.gross_amount_cents, 0)
					)}
				</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.expenses.summary.out')}</Card.Description>
				<Card.Title class="text-2xl text-foreground">
					{money(
						data.entries
							.filter((entry) => entry.direction === 'out')
							.reduce((sum, entry) => sum + entry.gross_amount_cents, 0)
					)}
				</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.expenses.summary.count')}</Card.Description>
				<Card.Title class="text-2xl">{data.entries.length}</Card.Title>
			</Card.Header>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'storeApp.expenses.list')}</Card.Title>
			<Card.Description>
				{t(locale, 'storeApp.expenses.listHint')}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'storeApp.expenses.code')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.expenses.type')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.expenses.category')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.expenses.amount')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.expenses.payment')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.expenses.date')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.entries as entry (entry.store_transaction_uuid)}
							<Table.Row>
								<Table.Cell class="ps-6 font-mono text-xs">{entry.transaction_code}</Table.Cell>
								<Table.Cell>
									<Badge variant={entry.direction === 'out' ? 'destructive' : 'secondary'}>
										{entryLabel(entry.entry_type)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{categoryLabel(entry.category)}</Table.Cell>
								<Table.Cell class="font-medium">
									{entry.direction === 'out' ? '−' : '+'}{money(entry.gross_amount_cents)}
								</Table.Cell>
								<Table.Cell class="capitalize">{entry.payment_method.replaceAll('_', ' ')}</Table.Cell>
								<Table.Cell class="whitespace-nowrap text-muted-foreground">
									{new Intl.DateTimeFormat(undefined, {
										dateStyle: 'medium',
										timeStyle: 'short'
									}).format(new Date(entry.occurred_at))}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={6} class="h-32 text-center text-muted-foreground">
									{t(locale, 'storeApp.expenses.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

{#if data.canManage}
	<EditSheet
		bind:open={expenseOpen}
		title={t(locale, 'storeApp.expenses.addExpense')}
		description={t(locale, 'storeApp.expenses.expenseHint')}
	>
		<form id="expense-form" method="POST" action="?/addExpense" class="grid gap-4">
			<div class="flex flex-col gap-2">
				<Label for="expense_amount">{t(locale, 'storeApp.expenses.amount')}</Label>
				<Input id="expense_amount" name="amount" inputmode="decimal" required placeholder="0.00" />
			</div>
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'storeApp.expenses.category')}</Label>
				<input type="hidden" name="category" value={expenseCategory} />
				<Select.Root type="single" bind:value={expenseCategory}>
					<Select.Trigger class="w-full">
						<span class="truncate">{categoryLabel(expenseCategory)}</span>
					</Select.Trigger>
					<Select.Content>
						{#each EXPENSE_CATEGORIES as category (category)}
							<Select.Item value={category} label={categoryLabel(category)} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'storeApp.expenses.payment')}</Label>
				<input type="hidden" name="payment_method" value={expenseMethod} />
				<Select.Root type="single" bind:value={expenseMethod}>
					<Select.Trigger class="w-full capitalize">{expenseMethod.replaceAll('_', ' ')}</Select.Trigger>
					<Select.Content>
						{#each CASHBOOK_PAYMENT_METHODS as method (method)}
							<Select.Item value={method} label={method.replaceAll('_', ' ')} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="expense_notes">{t(locale, 'storeApp.expenses.notes')}</Label>
				<Textarea id="expense_notes" name="notes" rows={3} maxlength={500} />
			</div>
		</form>
		{#snippet footer()}
			<div class="flex w-full justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (expenseOpen = false)}>
					{t(locale, 'common.cancel')}
				</Button>
				<Button type="submit" form="expense-form">{t(locale, 'storeApp.expenses.save')}</Button>
			</div>
		{/snippet}
	</EditSheet>

	<EditSheet
		bind:open={cashOpen}
		title={t(locale, 'storeApp.expenses.addCash')}
		description={t(locale, 'storeApp.expenses.cashHint')}
	>
		<form id="cash-form" method="POST" action="?/addCashIntake" class="grid gap-4">
			<div class="flex flex-col gap-2">
				<Label for="cash_amount">{t(locale, 'storeApp.expenses.amount')}</Label>
				<Input id="cash_amount" name="amount" inputmode="decimal" required placeholder="0.00" />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="cash_customer">{t(locale, 'storeApp.expenses.customerName')}</Label>
				<Input id="cash_customer" name="customer_name" maxlength={120} />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="cash_notes">{t(locale, 'storeApp.expenses.notes')}</Label>
				<Textarea id="cash_notes" name="notes" rows={3} maxlength={500} />
			</div>
		</form>
		{#snippet footer()}
			<div class="flex w-full justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (cashOpen = false)}>
					{t(locale, 'common.cancel')}
				</Button>
				<Button type="submit" form="cash-form">{t(locale, 'storeApp.expenses.save')}</Button>
			</div>
		{/snippet}
	</EditSheet>
{/if}
