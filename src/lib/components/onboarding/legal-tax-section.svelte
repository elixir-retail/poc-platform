<script lang="ts">
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { t, type Locale } from '$lib/i18n';
	import type { OrganisationDetail } from '$lib/types/platform';
	import { untrack } from 'svelte';

	let {
		organisation,
		isOperator,
		locale
	}: {
		organisation: OrganisationDetail;
		isOperator: boolean;
		locale: Locale;
	} = $props();

	type TaxRow = {
		type: string;
		value: string;
		country: string;
		verification: string;
		primary: boolean;
	};
	type CurrencyRow = {
		code: string;
		primary: boolean;
	};

	let legalOpen = $state(false);
	let currenciesOpen = $state(false);
	let taxOpen = $state(false);

	let currencyRows = $state<CurrencyRow[]>(
		untrack(() =>
			organisation.organisation_currency.length
				? organisation.organisation_currency.map((row) => ({
						code: row.currency_code,
						primary: row.is_primary
					}))
				: [{ code: organisation.primary_currency_code, primary: true }]
		)
	);

	let taxRows = $state<TaxRow[]>(
		untrack(() =>
			organisation.organisation_tax_id.length
				? organisation.organisation_tax_id.map((taxId) => ({
						type: taxId.tax_type,
						value: taxId.tax_value,
						country: taxId.country_code ?? organisation.country_code,
						verification: taxId.verification_status,
						primary: taxId.is_primary
					}))
				: [
						{
							type: 'gstin',
							value: '',
							country: organisation.country_code,
							verification: 'pending',
							primary: true
						}
					]
		)
	);

	function openLegal() {
		legalOpen = true;
	}

	function openCurrencies() {
		currencyRows = organisation.organisation_currency.length
			? organisation.organisation_currency.map((row) => ({
					code: row.currency_code,
					primary: row.is_primary
				}))
			: [{ code: organisation.primary_currency_code, primary: true }];
		currenciesOpen = true;
	}

	function addCurrencyRow() {
		currencyRows.push({ code: '', primary: currencyRows.length === 0 });
	}

	function removeCurrencyRow(index: number) {
		if (currencyRows.length === 1) return;
		const wasPrimary = currencyRows[index]?.primary;
		currencyRows.splice(index, 1);
		if (wasPrimary && currencyRows[0]) currencyRows[0].primary = true;
	}

	function setPrimaryCurrency(index: number) {
		currencyRows.forEach((row, rowIndex) => (row.primary = rowIndex === index));
	}

	function openTax() {
		taxRows = organisation.organisation_tax_id.length
			? organisation.organisation_tax_id.map((taxId) => ({
					type: taxId.tax_type,
					value: taxId.tax_value,
					country: taxId.country_code ?? organisation.country_code,
					verification: taxId.verification_status,
					primary: taxId.is_primary
				}))
			: [
					{
						type: 'gstin',
						value: '',
						country: organisation.country_code,
						verification: 'pending',
						primary: true
					}
				];
		taxOpen = true;
	}

	function addTaxRow() {
		taxRows.push({
			type: 'other',
			value: '',
			country: organisation.country_code,
			verification: 'pending',
			primary: false
		});
	}

	function removeTaxRow(index: number) {
		if (taxRows.length === 1) return;
		const wasPrimary = taxRows[index]?.primary;
		taxRows.splice(index, 1);
		if (wasPrimary && taxRows[0]) taxRows[0].primary = true;
	}

	function setPrimary(index: number) {
		taxRows.forEach((row, rowIndex) => (row.primary = rowIndex === index));
	}

	const primaryCurrency = $derived(
		currencyRows
			.find((row) => row.primary)
			?.code.trim()
			.toUpperCase() ?? ''
	);
</script>

<div class="flex flex-col gap-4">
	<div>
		<h2 class="text-lg font-semibold">{t(locale, 'onboarding.legal.title')}</h2>
		<p class="text-sm text-muted-foreground">{t(locale, 'onboarding.legal.description')}</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<div class="flex items-start justify-between gap-3">
					<div>
						<Card.Title>{t(locale, 'onboarding.legal.identity')}</Card.Title>
						<Card.Description>{organisation.entity_type}</Card.Description>
					</div>
					<Button size="sm" variant="outline" onclick={openLegal}>
						<PencilIcon />
						{t(locale, 'common.edit')}
					</Button>
				</div>
			</Card.Header>
			<Card.Content class="space-y-2 text-sm">
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.legal.legalName')}</p>
					<p class="font-medium">{organisation.legal_name}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.legal.tradeName')}</p>
					<p class="font-medium">{organisation.trade_name || '—'}</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<div class="flex items-start justify-between gap-3">
					<div>
						<Card.Title>{t(locale, 'onboarding.column.currency')}</Card.Title>
						<Card.Description>
							{t(locale, 'onboarding.legal.primaryCurrency')}: {organisation.primary_currency_code}
						</Card.Description>
					</div>
					<Button size="sm" variant="outline" onclick={openCurrencies}>
						<PencilIcon />
						{t(locale, 'common.edit')}
					</Button>
				</div>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-2">
				{#each organisation.organisation_currency as currency (currency.currency_code)}
					<span
						class="rounded-md border border-border px-2 py-1 text-sm {currency.is_primary
							? 'bg-muted font-medium'
							: ''}"
					>
						{currency.currency_code}
						{#if currency.is_primary}
							· {t(locale, 'status.primary')}
						{/if}
					</span>
				{:else}
					<p class="text-sm text-muted-foreground">{organisation.primary_currency_code}</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root class="md:col-span-2">
			<Card.Header>
				<div class="flex items-start justify-between gap-3">
					<div>
						<Card.Title>{t(locale, 'onboarding.tax.title')}</Card.Title>
						<Card.Description>{t(locale, 'onboarding.tax.description')}</Card.Description>
					</div>
					<Button size="sm" variant="outline" onclick={openTax}>
						<PencilIcon />
						{t(locale, 'common.edit')}
					</Button>
				</div>
			</Card.Header>
			<Card.Content class="grid gap-3 md:grid-cols-2">
				{#each organisation.organisation_tax_id as taxId (taxId.organisation_tax_id_uuid ?? `${taxId.tax_type}-${taxId.tax_value}`)}
					<div class="rounded-lg border border-border p-3">
						<div class="mb-2 flex items-center justify-between gap-2">
							<p class="font-medium uppercase">{taxId.tax_type}</p>
							<div class="flex gap-1">
								{#if taxId.is_primary}<StatusBadge status="primary" />{/if}
								<StatusBadge status={taxId.verification_status} />
							</div>
						</div>
						<p class="text-sm">{taxId.tax_value}</p>
						<p class="text-xs text-muted-foreground">
							{taxId.country_code ?? organisation.country_code}
						</p>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">{t(locale, 'onboarding.tax.empty')}</p>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>

<EditSheet
	bind:open={legalOpen}
	title={t(locale, 'onboarding.legal.editIdentity')}
	description={isOperator
		? t(locale, 'onboarding.role.operator')
		: t(locale, 'onboarding.role.admin')}
>
	<form id="legal-form" method="POST" action="?/saveLegal" class="grid gap-4">
		<div class="flex flex-col gap-2">
			<Label for="legal_name">{t(locale, 'onboarding.legal.legalName')}</Label>
			<Input id="legal_name" name="legal_name" value={organisation.legal_name} required />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="trade_name">{t(locale, 'onboarding.legal.tradeName')}</Label>
			<Input id="trade_name" name="trade_name" value={organisation.trade_name ?? ''} />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="entity_type">{t(locale, 'onboarding.legal.entityType')}</Label>
			<Input id="entity_type" name="entity_type" value={organisation.entity_type} required />
		</div>
	</form>
	{#snippet footer()}
		<Button type="button" variant="outline" onclick={() => (legalOpen = false)}>
			{t(locale, 'common.cancel')}
		</Button>
		<Button type="submit" form="legal-form">
			{isOperator ? t(locale, 'common.submitApproval') : t(locale, 'common.save')}
		</Button>
	{/snippet}
</EditSheet>

<EditSheet
	bind:open={currenciesOpen}
	title={t(locale, 'onboarding.legal.editCurrencies')}
	description={t(locale, 'onboarding.legal.currenciesHint')}
>
	<form id="currencies-form" method="POST" action="?/saveCurrencies" class="grid gap-4">
		<input type="hidden" name="primary_currency_code" value={primaryCurrency} />
		{#each currencyRows as row, index (index)}
			<div class="grid gap-3 rounded-lg border border-border p-3">
				<div class="flex items-center justify-between gap-3">
					<Label for="currency_code_{index}">
						{t(locale, 'onboarding.column.currency')}
						{index + 1}
					</Label>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						disabled={currencyRows.length === 1}
						onclick={() => removeCurrencyRow(index)}
					>
						<Trash2Icon />
						<span class="sr-only">{t(locale, 'onboarding.legal.removeCurrency')}</span>
					</Button>
				</div>
				<Input
					id="currency_code_{index}"
					name="currency_code"
					bind:value={row.code}
					maxlength={3}
					placeholder="USD"
					class="uppercase"
					required
				/>
				<label class="flex items-center gap-2 text-sm">
					<input
						type="radio"
						name="primary_currency_index"
						value={index}
						checked={row.primary}
						onchange={() => setPrimaryCurrency(index)}
					/>
					{t(locale, 'onboarding.legal.primaryCurrency')}
				</label>
			</div>
		{/each}
		<Button type="button" variant="outline" onclick={addCurrencyRow}>
			<PlusIcon />
			{t(locale, 'onboarding.legal.addCurrency')}
		</Button>
	</form>
	{#snippet footer()}
		<Button type="button" variant="outline" onclick={() => (currenciesOpen = false)}>
			{t(locale, 'common.cancel')}
		</Button>
		<Button type="submit" form="currencies-form">
			{isOperator ? t(locale, 'common.submitApproval') : t(locale, 'common.save')}
		</Button>
	{/snippet}
</EditSheet>

<EditSheet
	bind:open={taxOpen}
	title={t(locale, 'onboarding.tax.editTitle')}
	description={t(locale, 'onboarding.tax.description')}
>
	<form id="tax-form" method="POST" action="?/saveTaxIds" class="flex flex-col gap-4">
		{#each taxRows as row, index (index)}
			<div class="grid gap-3 rounded-lg border border-border p-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium">{t(locale, 'onboarding.tax.type')} {index + 1}</p>
					<Button type="button" size="icon-sm" variant="ghost" onclick={() => removeTaxRow(index)}>
						<Trash2Icon />
					</Button>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="flex flex-col gap-2">
						<Label>{t(locale, 'onboarding.tax.type')}</Label>
						<input type="hidden" name="tax_type" value={row.type} />
						<Select.Root type="single" bind:value={row.type}>
							<Select.Trigger class="w-full uppercase">{row.type}</Select.Trigger>
							<Select.Content>
								{#each ['gstin', 'vat', 'cin', 'tan', 'pan', 'tin', 'other'] as option (option)}
									<Select.Item value={option} label={option.toUpperCase()} />
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="flex flex-col gap-2">
						<Label>{t(locale, 'onboarding.tax.number')}</Label>
						<Input name="tax_value" bind:value={row.value} required />
					</div>
					<div class="flex flex-col gap-2">
						<Label>{t(locale, 'onboarding.column.country')}</Label>
						<Input name="tax_country" bind:value={row.country} maxlength={2} required />
					</div>
					<div class="flex flex-col gap-2">
						<Label>{t(locale, 'onboarding.documents.status')}</Label>
						<input type="hidden" name="tax_verification" value={row.verification} />
						<Select.Root type="single" bind:value={row.verification}>
							<Select.Trigger class="w-full capitalize">{row.verification}</Select.Trigger>
							<Select.Content>
								{#each ['pending', 'verified', 'rejected'] as option (option)}
									<Select.Item value={option} label={option} class="capitalize" />
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>
				<label class="flex items-center gap-2 text-sm">
					<input
						type="radio"
						name="primary_tax_index"
						value={index}
						checked={row.primary}
						onchange={() => setPrimary(index)}
					/>
					{t(locale, 'onboarding.tax.primary')}
				</label>
				<input type="hidden" name="tax_uuid" value="" />
			</div>
		{/each}
		<Button type="button" variant="outline" onclick={addTaxRow}>
			<PlusIcon />
			{t(locale, 'onboarding.tax.add')}
		</Button>
	</form>
	{#snippet footer()}
		<Button type="button" variant="outline" onclick={() => (taxOpen = false)}>
			{t(locale, 'common.cancel')}
		</Button>
		<Button type="submit" form="tax-form">
			{isOperator ? t(locale, 'common.submitApproval') : t(locale, 'common.save')}
		</Button>
	{/snippet}
</EditSheet>
