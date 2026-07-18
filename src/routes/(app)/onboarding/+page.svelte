<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale } from '$lib/i18n';
	import type { OrganisationListItem } from '$lib/types/platform';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);

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
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<Building2Icon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{t(locale, 'onboarding.title')}
			</h1>
		</div>
		<p class="text-sm text-muted-foreground">{t(locale, 'onboarding.description')}</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'onboarding.organisations')}</Card.Title>
			<Card.Description>
				{t(locale, 'onboarding.records', { count: data.organisations.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="ps-6">{t(locale, 'onboarding.column.orgId')}</Table.Head>
						<Table.Head>{t(locale, 'onboarding.column.organisation')}</Table.Head>
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
							<Table.Cell colspan={11} class="h-32 text-center text-muted-foreground">
								{t(locale, 'onboarding.empty')}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
