<script lang="ts">
	import { resolve } from '$app/paths';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type {
		BillingInterval,
		BillingPlan,
		OrganisationBillingStatus
	} from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const isAdmin = $derived(data.profile?.role === 'platform_admin');
	const organisation = $derived(data.organisation);
	const billing = $derived(organisation.organisation_billing);
	const plan = $derived(billing?.billing_plan ?? null);

	let editOpen = $state(false);
	let planUuid = $state('');
	let status = $state<OrganisationBillingStatus>('active');
	let notes = $state('');
	let nextBillingAt = $state('');

	const selectedPlan = $derived(
		data.plans.find((item) => item.billing_plan_uuid === planUuid) ?? null
	);

	$effect(() => {
		if (selectedPlan?.plan_type === 'free') {
			status = 'free';
		} else if (status === 'free') {
			status = 'active';
		}
	});

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

	function openEditor() {
		planUuid = billing?.billing_plan_uuid ?? data.plans[0]?.billing_plan_uuid ?? '';
		status = billing?.status ?? 'active';
		notes = billing?.notes ?? '';
		nextBillingAt = billing?.next_billing_at
			? new Date(billing.next_billing_at).toISOString().slice(0, 10)
			: '';
		editOpen = true;
	}
</script>

<div class="flex flex-col gap-5">
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href={resolve('/billing')}>{t(locale, 'billing.title')}</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{organisation.org_code}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<CreditCardIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">
					{organisation.trade_name ?? organisation.legal_name}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground">
				{organisation.legal_name} · {organisation.org_code}
			</p>
			<p class="text-sm text-muted-foreground">{t(locale, 'billing.detail.description')}</p>
		</div>
		{#if isAdmin}
			<Button onclick={openEditor}>
				<PencilIcon />
				{billing ? t(locale, 'common.edit') : t(locale, 'billing.assign.button')}
			</Button>
		{/if}
	</div>

	{#if form?.message}
		<div
			class="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm"
			role="status"
			class:text-destructive={form.success === false}
		>
			{#if form.success}
				<CheckCircle2Icon class="size-4 text-primary" />
			{/if}
			{form.message}
		</div>
	{/if}

	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'billing.detail.organisation')}</Card.Title>
				<Card.Description>{t(locale, 'billing.detail.organisationHint')}</Card.Description>
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
					<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.contact.phone')}</p>
					<p class="font-medium">{organisation.contact_phone || '—'}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.onboarding')}</p>
					<StatusBadge status={organisation.overall_status} />
				</div>
				<div class="flex flex-wrap gap-2">
					<StatusBadge status={organisation.kyc_status} />
					<StatusBadge status={organisation.kyb_status} />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'billing.detail.assignment')}</Card.Title>
				<Card.Description>{t(locale, 'billing.detail.assignmentHint')}</Card.Description>
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
					<div>
						<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.notes')}</p>
						<p class="font-medium whitespace-pre-wrap">{billing.notes || '—'}</p>
					</div>
				{:else}
					<p class="text-muted-foreground">{t(locale, 'billing.detail.unassigned')}</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>

{#if isAdmin}
	<EditSheet
		bind:open={editOpen}
		title={t(locale, 'billing.assign.title')}
		description={t(locale, 'billing.assign.description')}
	>
		<form id="update-billing-form" method="POST" action="?/updateBilling" class="grid gap-4">
			<input type="hidden" name="org_uuid" value={organisation.organisation_uuid} />
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'billing.column.plan')}</Label>
				<input type="hidden" name="billing_plan_uuid" value={planUuid} />
				<Select.Root type="single" bind:value={planUuid}>
					<Select.Trigger class="w-full">
						{selectedPlan?.name ?? t(locale, 'billing.assign.selectPlan')}
					</Select.Trigger>
					<Select.Content>
						{#each data.plans as item (item.billing_plan_uuid)}
							<Select.Item
								value={item.billing_plan_uuid}
								label={`${item.plan_code} · ${item.name}`}
							/>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'billing.column.billingStatus')}</Label>
				<input type="hidden" name="status" value={status} />
				<Select.Root
					type="single"
					bind:value={status}
					disabled={selectedPlan?.plan_type === 'free'}
				>
					<Select.Trigger class="w-full">{billingStatusLabel(status)}</Select.Trigger>
					<Select.Content>
						{#if selectedPlan?.plan_type === 'free'}
							<Select.Item value="free" label={billingStatusLabel('free')} />
						{:else}
							{#each ['trial', 'active', 'past_due', 'cancelled', 'suspended'] as option (option)}
								<Select.Item
									value={option}
									label={billingStatusLabel(option as OrganisationBillingStatus)}
								/>
							{/each}
						{/if}
					</Select.Content>
				</Select.Root>
			</div>
			{#if selectedPlan?.plan_type === 'paid'}
				<div class="flex flex-col gap-2">
					<Label for="next_billing_at">{t(locale, 'billing.column.nextBilling')}</Label>
					<Input
						id="next_billing_at"
						name="next_billing_at"
						type="date"
						bind:value={nextBillingAt}
					/>
				</div>
			{/if}
			<div class="flex flex-col gap-2">
				<Label for="notes">{t(locale, 'billing.column.notes')}</Label>
				<Textarea id="notes" name="notes" rows={3} bind:value={notes} />
			</div>
		</form>
		{#snippet footer()}
			<Button type="button" variant="outline" onclick={() => (editOpen = false)}>
				{t(locale, 'common.cancel')}
			</Button>
			<Button type="submit" form="update-billing-form" disabled={!planUuid}>
				{t(locale, 'common.save')}
			</Button>
		{/snippet}
	</EditSheet>
{/if}
