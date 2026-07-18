<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale } from '$lib/i18n';
	import type { OrganisationListItem } from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const locale = $derived(data.locale as Locale);

	let createOpen = $state(false);
	let preferredLanguage = $state('en');

	function primaryTaxId(organisation: OrganisationListItem) {
		const taxId =
			organisation.organisation_tax_id.find((item) => item.is_primary) ??
			organisation.organisation_tax_id[0];
		if (!taxId) return '—';
		const visible = taxId.tax_value.slice(-4);
		return `${taxId.tax_type.toUpperCase()} ••••${visible}`;
	}

	function currencyLabel(organisation: OrganisationListItem) {
		const additional = Math.max(organisation.organisation_currency.length - 1, 0);
		return additional > 0
			? `${organisation.primary_currency_code} +${additional}`
			: organisation.primary_currency_code;
	}

	function openOrganisation(orgCode: string) {
		goto(resolve(`/onboarding/${orgCode}` as '/onboarding/[orgCode]'));
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<Building2Icon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">
					{t(locale, 'onboarding.title')}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground">{t(locale, 'onboarding.description')}</p>
		</div>
		<Button onclick={() => (createOpen = true)}>
			<PlusIcon />
			{t(locale, 'onboarding.create.button')}
		</Button>
	</div>

	{#if form?.message}
		<div
			class="rounded-lg border border-border bg-card px-4 py-3 text-sm"
			role="status"
			class:text-destructive={form.success === false}
		>
			{form.message}
		</div>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'onboarding.organisations')}</Card.Title>
			<Card.Description>
				{t(locale, 'onboarding.records', { count: data.organisations.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'onboarding.column.orgId')}</Table.Head>
							<Table.Head>{t(locale, 'onboarding.column.organisation')}</Table.Head>
							<Table.Head>{t(locale, 'onboarding.column.contact')}</Table.Head>
							<Table.Head>{t(locale, 'onboarding.column.country')}</Table.Head>
							<Table.Head>{t(locale, 'onboarding.column.language')}</Table.Head>
							<Table.Head>{t(locale, 'onboarding.column.currency')}</Table.Head>
							<Table.Head>{t(locale, 'onboarding.column.kyc')}</Table.Head>
							<Table.Head>{t(locale, 'onboarding.column.kyb')}</Table.Head>
							<Table.Head>{t(locale, 'onboarding.column.taxId')}</Table.Head>
							<Table.Head>{t(locale, 'onboarding.column.overall')}</Table.Head>
							<Table.Head>{t(locale, 'onboarding.column.updated')}</Table.Head>
							<Table.Head><span class="sr-only">Open</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.organisations as organisation (organisation.organisation_uuid)}
							<Table.Row
								class="cursor-pointer"
								tabindex={0}
								onclick={() => openOrganisation(organisation.org_code)}
								onkeydown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										openOrganisation(organisation.org_code);
									}
								}}
							>
								<Table.Cell class="ps-6 font-medium">{organisation.org_code}</Table.Cell>
								<Table.Cell>
									<div class="flex min-w-44 flex-col">
										<span class="font-medium"
											>{organisation.trade_name ?? organisation.legal_name}</span
										>
										<span class="max-w-52 truncate text-xs text-muted-foreground">
											{organisation.legal_name}
										</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex min-w-40 flex-col text-sm">
										<span class="truncate">{organisation.contact_email}</span>
										<span class="text-xs text-muted-foreground">
											{organisation.contact_phone ?? '—'}
										</span>
									</div>
								</Table.Cell>
								<Table.Cell>{organisation.country_code}</Table.Cell>
								<Table.Cell>{organisation.preferred_language.toUpperCase()}</Table.Cell>
								<Table.Cell>{currencyLabel(organisation)}</Table.Cell>
								<Table.Cell><StatusBadge status={organisation.kyc_status} /></Table.Cell>
								<Table.Cell><StatusBadge status={organisation.kyb_status} /></Table.Cell>
								<Table.Cell class="font-mono text-xs">{primaryTaxId(organisation)}</Table.Cell>
								<Table.Cell><StatusBadge status={organisation.overall_status} /></Table.Cell>
								<Table.Cell class="text-sm whitespace-nowrap text-muted-foreground">
									{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
										new Date(organisation.changed_at)
									)}
								</Table.Cell>
								<Table.Cell><ArrowRightIcon class="size-4 text-muted-foreground" /></Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={12} class="h-32 text-center text-muted-foreground">
									{t(locale, 'onboarding.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<EditSheet
	bind:open={createOpen}
	title={t(locale, 'onboarding.create.title')}
	description={t(locale, 'onboarding.create.description')}
>
	<form
		id="create-organisation-form"
		method="POST"
		action="?/createOrganisation"
		class="grid gap-4"
	>
		<div class="flex flex-col gap-2">
			<Label for="legal_name">{t(locale, 'onboarding.legal.legalName')}</Label>
			<Input id="legal_name" name="legal_name" required />
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="flex flex-col gap-2">
				<Label for="contact_email">{t(locale, 'onboarding.contact.email')}</Label>
				<Input id="contact_email" name="contact_email" type="email" required />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="contact_phone">{t(locale, 'onboarding.contact.phone')}</Label>
				<Input id="contact_phone" name="contact_phone" type="tel" placeholder="+91…" />
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="entity_type">{t(locale, 'onboarding.legal.entityType')}</Label>
			<Input id="entity_type" name="entity_type" placeholder="Private Limited" required />
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="flex flex-col gap-2">
				<Label for="country_code">{t(locale, 'onboarding.legal.country')}</Label>
				<Input id="country_code" name="country_code" maxlength={2} value="IN" required />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="primary_currency_code">{t(locale, 'onboarding.legal.primaryCurrency')}</Label>
				<Input
					id="primary_currency_code"
					name="primary_currency_code"
					maxlength={3}
					value="INR"
					required
				/>
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<Label>{t(locale, 'onboarding.legal.preferredLanguage')}</Label>
			<input type="hidden" name="preferred_language" value={preferredLanguage} />
			<Select.Root type="single" bind:value={preferredLanguage}>
				<Select.Trigger class="w-full uppercase">{preferredLanguage}</Select.Trigger>
				<Select.Content>
					{#each ['en', 'hi', 'ta', 'te'] as option (option)}
						<Select.Item value={option} label={option.toUpperCase()} />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</form>
	{#snippet footer()}
		<Button type="button" variant="outline" onclick={() => (createOpen = false)}>
			{t(locale, 'common.cancel')}
		</Button>
		<Button type="submit" form="create-organisation-form">
			{t(locale, 'onboarding.create.submit')}
		</Button>
	{/snippet}
</EditSheet>
