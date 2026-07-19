<script lang="ts">
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { BillingInterval, BillingPlan, OrganisationBillingStatus } from '$lib/types/platform';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const locale = $derived(data.locale as Locale);
	const organisation = $derived(data.organisationContext.organisation);
	const billing = $derived(data.billing);
	const plan = $derived(billing?.billing_plan ?? null);

	function formatAmount(item: Pick<BillingPlan, 'amount_cents' | 'currency_code' | 'plan_type'>) {
		if (item.plan_type === 'free' || item.amount_cents === 0) {
			return t(locale, 'billing.amount.free');
		}
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: item.currency_code
		}).format(item.amount_cents / 100);
	}

	function intervalLabel(interval: BillingInterval) {
		return t(locale, `billing.interval.${interval}` as MessageKey);
	}

	function billingStatusLabel(value: OrganisationBillingStatus | 'unassigned') {
		return t(locale, `billing.status.${value}` as MessageKey);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<CreditCardIcon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{t(locale, 'orgApp.billing.title')}
			</h1>
		</div>
		<p class="text-sm text-muted-foreground">{t(locale, 'orgApp.billing.description')}</p>
		<p class="text-sm text-muted-foreground">
			{organisation.trade_name ?? organisation.legal_name} · {organisation.org_code}
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.billing.organisation')}</Card.Title>
				<Card.Description>{t(locale, 'orgApp.billing.organisationHint')}</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-3 text-sm">
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.orgId')}</p>
					<p class="font-medium">{organisation.org_code}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.contact.email')}</p>
					<p class="font-medium">{organisation.contact_email}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.onboarding')}</p>
					<StatusBadge status={organisation.overall_status} />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.billing.plan')}</Card.Title>
				<Card.Description>{t(locale, 'orgApp.billing.planHint')}</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-3 text-sm">
				{#if plan && billing}
					<div>
						<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.plan')}</p>
						<p class="font-medium">
							{plan.name}
							<span class="ms-1 font-mono text-xs text-muted-foreground">{plan.plan_code}</span>
						</p>
					</div>
					{#if plan.description}
						<div>
							<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.description')}</p>
							<p class="font-medium whitespace-pre-wrap">{plan.description}</p>
						</div>
					{/if}
					<div>
						<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.planType')}</p>
						<Badge variant={plan.plan_type === 'free' ? 'secondary' : 'default'}>
							{t(locale, `billing.planType.${plan.plan_type}` as MessageKey)}
						</Badge>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.amount')}</p>
						<p class="font-medium">{formatAmount(plan)}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.interval')}</p>
						<p class="font-medium">{intervalLabel(plan.billing_interval)}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.billingStatus')}</p>
						<Badge variant="secondary">{billingStatusLabel(billing.status)}</Badge>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.started')}</p>
						<p class="font-medium">
							{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
								new Date(billing.started_at)
							)}
						</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.nextBilling')}</p>
						<p class="font-medium">
							{#if billing.next_billing_at}
								{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
									new Date(billing.next_billing_at)
								)}
							{:else}
								—
							{/if}
						</p>
					</div>
				{:else}
					<p class="text-muted-foreground">{t(locale, 'orgApp.billing.unassigned')}</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
