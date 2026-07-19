<script lang="ts">
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale } from '$lib/i18n';
	import type { OrganisationDetail } from '$lib/types/platform';

	let {
		organisation,
		isAdmin,
		locale
	}: {
		organisation: OrganisationDetail;
		isAdmin: boolean;
		locale: Locale;
	} = $props();

	const currencies = $derived(
		organisation.organisation_currency
			.map((row) => row.currency_code)
			.sort((a, b) => {
				if (a === organisation.primary_currency_code) return -1;
				if (b === organisation.primary_currency_code) return 1;
				return a.localeCompare(b);
			})
			.join(', ')
	);

	const completion = $derived(
		[
			organisation.organisation_address.length > 0,
			organisation.organisation_director.length > 0,
			organisation.organisation_bank_account.length > 0,
			organisation.organisation_document.length > 0,
			organisation.organisation_tax_id.length > 0,
			organisation.kyc_status === 'approved',
			organisation.kyb_status === 'approved'
		].filter(Boolean).length
	);
</script>

<Card.Root>
	<Card.Header>
		<div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
			<div class="flex items-start gap-3">
				<div class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
					<Building2Icon class="size-5 text-muted-foreground" />
				</div>
				<div class="min-w-0 space-y-1">
					<Card.Title class="truncate">
						{organisation.trade_name ?? organisation.legal_name}
					</Card.Title>
					<Card.Description>
						{organisation.legal_name} · {organisation.entity_type}
					</Card.Description>
					<p class="text-sm text-muted-foreground">
						{t(locale, 'onboarding.column.orgId')}:
						<span class="font-medium text-foreground">{organisation.org_code}</span>
					</p>
					<p class="truncate text-sm text-muted-foreground">
						{organisation.contact_email}
						{#if organisation.contact_phone}
							· {organisation.contact_phone}
						{/if}
					</p>
				</div>
			</div>
			<div class="flex flex-col items-start gap-2 lg:items-end">
				<div class="flex flex-wrap gap-2">
					<StatusBadge status={organisation.overall_status} />
					<StatusBadge status={organisation.kyc_status} />
					<StatusBadge status={organisation.kyb_status} />
				</div>
				<p class="text-xs text-muted-foreground">
					{isAdmin ? t(locale, 'onboarding.role.admin') : t(locale, 'onboarding.role.operator')}
				</p>
			</div>
		</div>
	</Card.Header>
	<Card.Content class="space-y-4">
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			<div class="rounded-lg border border-border p-3">
				<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.column.country')}</p>
				<p class="font-medium">{organisation.country_code}</p>
			</div>
			<div class="rounded-lg border border-border p-3">
				<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.column.language')}</p>
				<p class="font-medium uppercase">{organisation.preferred_language}</p>
			</div>
			<div class="rounded-lg border border-border p-3">
				<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.column.currency')}</p>
				<p class="font-medium">{currencies || organisation.primary_currency_code}</p>
			</div>
			<div class="rounded-lg border border-border p-3">
				<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.contact.email')}</p>
				<p class="truncate font-medium">{organisation.contact_email}</p>
			</div>
			<div class="rounded-lg border border-border p-3">
				<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.contact.phone')}</p>
				<p class="font-medium">{organisation.contact_phone || '—'}</p>
			</div>
			<div class="rounded-lg border border-border p-3">
				<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.header.completion')}</p>
				<p class="font-medium">{completion}/7</p>
			</div>
		</div>
	</Card.Content>
</Card.Root>
