<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TagIcon from '@lucide/svelte/icons/tag';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Textarea } from '$lib/components/ui/textarea';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type {
		BillingInterval,
		BillingPlan,
		OrganisationBillingListItem,
		OrganisationBillingStatus
	} from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const isAdmin = $derived(data.profile?.role === 'platform_admin');
	const activePlans = $derived(data.plans.filter((plan) => plan.is_active));

	let createPlanOpen = $state(false);
	let assignOpen = $state(false);
	let planType = $state<'free' | 'paid'>('paid');
	let billingInterval = $state<BillingInterval>('monthly');
	let assignOrgUuid = $state('');
	let assignPlanUuid = $state('');
	let assignStatus = $state<OrganisationBillingStatus>('active');

	const selectedAssignPlan = $derived(
		activePlans.find((plan) => plan.billing_plan_uuid === assignPlanUuid) ?? null
	);

	$effect(() => {
		if (planType === 'free') {
			billingInterval = 'none';
		} else if (billingInterval === 'none') {
			billingInterval = 'monthly';
		}
	});

	$effect(() => {
		if (selectedAssignPlan?.plan_type === 'free') {
			assignStatus = 'free';
		} else if (assignStatus === 'free') {
			assignStatus = 'active';
		}
	});

	function formatAmount(plan: Pick<BillingPlan, 'amount_cents' | 'currency_code' | 'plan_type'>) {
		if (plan.plan_type === 'free' || plan.amount_cents === 0) {
			return t(locale, 'billing.amount.free');
		}
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: plan.currency_code
		}).format(plan.amount_cents / 100);
	}

	function intervalLabel(interval: BillingInterval) {
		return t(locale, `billing.interval.${interval}` as MessageKey);
	}

	function billingStatusLabel(status: OrganisationBillingStatus | 'unassigned') {
		return t(locale, `billing.status.${status}` as MessageKey);
	}

	function planTypeLabel(type: BillingPlan['plan_type']) {
		return t(locale, `billing.planType.${type}` as MessageKey);
	}

	function openOrganisationBilling(orgCode: string) {
		goto(resolve(`/billing/${orgCode}` as '/billing/[orgCode]'));
	}

	function openAssign(organisation?: OrganisationBillingListItem) {
		assignOrgUuid =
			organisation?.organisation_uuid ?? data.organisations[0]?.organisation_uuid ?? '';
		assignPlanUuid =
			organisation?.organisation_billing?.billing_plan_uuid ??
			activePlans[0]?.billing_plan_uuid ??
			'';
		assignStatus = organisation?.organisation_billing?.status ?? 'active';
		assignOpen = true;
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<CreditCardIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">
					{t(locale, 'billing.title')}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground">{t(locale, 'billing.description')}</p>
			{#if !isAdmin}
				<p class="text-xs text-muted-foreground">{t(locale, 'billing.role.operator')}</p>
			{/if}
		</div>
		{#if isAdmin}
			<div class="flex flex-wrap gap-2">
				<Button variant="outline" onclick={() => openAssign()}>
					<TagIcon />
					{t(locale, 'billing.assign.button')}
				</Button>
				<Button onclick={() => (createPlanOpen = true)}>
					<PlusIcon />
					{t(locale, 'billing.plan.create.button')}
				</Button>
			</div>
		{/if}
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
			<Card.Title>{t(locale, 'billing.plans.title')}</Card.Title>
			<Card.Description>
				{t(locale, 'billing.plans.records', { count: data.plans.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'billing.column.planCode')}</Table.Head>
							<Table.Head>{t(locale, 'billing.column.planName')}</Table.Head>
							<Table.Head>{t(locale, 'billing.column.planType')}</Table.Head>
							<Table.Head>{t(locale, 'billing.column.amount')}</Table.Head>
							<Table.Head>{t(locale, 'billing.column.interval')}</Table.Head>
							<Table.Head>{t(locale, 'billing.column.planStatus')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.plans as plan (plan.billing_plan_uuid)}
							<Table.Row>
								<Table.Cell class="ps-6 font-mono text-sm font-medium">{plan.plan_code}</Table.Cell>
								<Table.Cell>
									<div class="flex min-w-40 flex-col">
										<span class="font-medium">{plan.name}</span>
										{#if plan.description}
											<span class="line-clamp-1 text-xs text-muted-foreground">
												{plan.description}
											</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={plan.plan_type === 'free' ? 'secondary' : 'default'}>
										{planTypeLabel(plan.plan_type)}
									</Badge>
								</Table.Cell>
								<Table.Cell>{formatAmount(plan)}</Table.Cell>
								<Table.Cell>{intervalLabel(plan.billing_interval)}</Table.Cell>
								<Table.Cell>
									<Badge variant={plan.is_active ? 'secondary' : 'destructive'}>
										{plan.is_active
											? t(locale, 'billing.plan.active')
											: t(locale, 'billing.plan.inactive')}
									</Badge>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={6} class="h-24 text-center text-muted-foreground">
									{t(locale, 'billing.plans.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'billing.organisations.title')}</Card.Title>
			<Card.Description>
				{t(locale, 'billing.organisations.records', { count: data.organisations.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'billing.column.orgId')}</Table.Head>
							<Table.Head>{t(locale, 'billing.column.organisation')}</Table.Head>
							<Table.Head>{t(locale, 'billing.column.plan')}</Table.Head>
							<Table.Head>{t(locale, 'billing.column.billingStatus')}</Table.Head>
							<Table.Head>{t(locale, 'billing.column.amount')}</Table.Head>
							<Table.Head>{t(locale, 'billing.column.onboarding')}</Table.Head>
							<Table.Head><span class="sr-only">Open</span></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.organisations as organisation (organisation.organisation_uuid)}
							{@const billing = organisation.organisation_billing}
							{@const plan = billing?.billing_plan ?? null}
							<Table.Row
								class="cursor-pointer"
								tabindex={0}
								onclick={() => openOrganisationBilling(organisation.org_code)}
								onkeydown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										openOrganisationBilling(organisation.org_code);
									}
								}}
							>
								<Table.Cell class="ps-6 font-medium">{organisation.org_code}</Table.Cell>
								<Table.Cell>
									<div class="flex min-w-44 flex-col">
										<span class="font-medium">
											{organisation.trade_name ?? organisation.legal_name}
										</span>
										<span class="truncate text-xs text-muted-foreground">
											{organisation.contact_email}
										</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									{#if plan}
										<span class="font-medium">{plan.name}</span>
										<span class="ms-1 font-mono text-xs text-muted-foreground">
											{plan.plan_code}
										</span>
									{:else}
										<span class="text-muted-foreground">{t(locale, 'billing.unassigned')}</span>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={billing ? 'secondary' : 'outline'}>
										{billingStatusLabel(billing?.status ?? 'unassigned')}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									{#if plan}
										{formatAmount(plan)}
									{:else}
										—
									{/if}
								</Table.Cell>
								<Table.Cell>
									<StatusBadge status={organisation.overall_status} />
								</Table.Cell>
								<Table.Cell>
									<ArrowRightIcon class="size-4 text-muted-foreground" />
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={7} class="h-24 text-center text-muted-foreground">
									{t(locale, 'billing.organisations.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

{#if isAdmin}
	<EditSheet
		bind:open={createPlanOpen}
		title={t(locale, 'billing.plan.create.title')}
		description={t(locale, 'billing.plan.create.description')}
	>
		<form id="create-plan-form" method="POST" action="?/createPlan" class="grid gap-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label for="plan_code">{t(locale, 'billing.column.planCode')}</Label>
					<Input id="plan_code" name="plan_code" placeholder="STARTER" required />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="plan_name">{t(locale, 'billing.column.planName')}</Label>
					<Input id="plan_name" name="name" required />
				</div>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="plan_description">{t(locale, 'billing.column.description')}</Label>
				<Textarea id="plan_description" name="description" rows={3} />
			</div>
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'billing.column.planType')}</Label>
				<input type="hidden" name="plan_type" value={planType} />
				<Select.Root type="single" bind:value={planType}>
					<Select.Trigger class="w-full">{planTypeLabel(planType)}</Select.Trigger>
					<Select.Content>
						<Select.Item value="free" label={planTypeLabel('free')} />
						<Select.Item value="paid" label={planTypeLabel('paid')} />
					</Select.Content>
				</Select.Root>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label for="amount_cents">{t(locale, 'billing.column.amountCents')}</Label>
					<Input
						id="amount_cents"
						name="amount_cents"
						type="number"
						min="0"
						step="1"
						value={planType === 'free' ? 0 : 99900}
						readonly={planType === 'free'}
						required
					/>
					<p class="text-xs text-muted-foreground">{t(locale, 'billing.amount.hint')}</p>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="currency_code">{t(locale, 'billing.column.currency')}</Label>
					<Input id="currency_code" name="currency_code" maxlength={3} value="INR" required />
				</div>
			</div>
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'billing.column.interval')}</Label>
				<input type="hidden" name="billing_interval" value={billingInterval} />
				<Select.Root type="single" bind:value={billingInterval} disabled={planType === 'free'}>
					<Select.Trigger class="w-full">{intervalLabel(billingInterval)}</Select.Trigger>
					<Select.Content>
						{#if planType === 'free'}
							<Select.Item value="none" label={intervalLabel('none')} />
						{:else}
							<Select.Item value="monthly" label={intervalLabel('monthly')} />
							<Select.Item value="yearly" label={intervalLabel('yearly')} />
						{/if}
					</Select.Content>
				</Select.Root>
			</div>
			<input type="hidden" name="is_active" value="true" />
		</form>
		{#snippet footer()}
			<Button type="button" variant="outline" onclick={() => (createPlanOpen = false)}>
				{t(locale, 'common.cancel')}
			</Button>
			<Button type="submit" form="create-plan-form">
				{t(locale, 'billing.plan.create.submit')}
			</Button>
		{/snippet}
	</EditSheet>

	<EditSheet
		bind:open={assignOpen}
		title={t(locale, 'billing.assign.title')}
		description={t(locale, 'billing.assign.description')}
	>
		<form id="assign-billing-form" method="POST" action="?/assignBilling" class="grid gap-4">
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'billing.column.organisation')}</Label>
				<input type="hidden" name="org_uuid" value={assignOrgUuid} />
				<Select.Root type="single" bind:value={assignOrgUuid}>
					<Select.Trigger class="w-full">
						{data.organisations.find((org) => org.organisation_uuid === assignOrgUuid)
							?.legal_name ?? t(locale, 'billing.assign.selectOrg')}
					</Select.Trigger>
					<Select.Content>
						{#each data.organisations as organisation (organisation.organisation_uuid)}
							<Select.Item
								value={organisation.organisation_uuid}
								label={`${organisation.org_code} · ${organisation.legal_name}`}
							/>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'billing.column.plan')}</Label>
				<input type="hidden" name="billing_plan_uuid" value={assignPlanUuid} />
				<Select.Root type="single" bind:value={assignPlanUuid}>
					<Select.Trigger class="w-full">
						{selectedAssignPlan?.name ?? t(locale, 'billing.assign.selectPlan')}
					</Select.Trigger>
					<Select.Content>
						{#each activePlans as plan (plan.billing_plan_uuid)}
							<Select.Item
								value={plan.billing_plan_uuid}
								label={`${plan.plan_code} · ${plan.name}`}
							/>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'billing.column.billingStatus')}</Label>
				<input type="hidden" name="status" value={assignStatus} />
				<Select.Root
					type="single"
					bind:value={assignStatus}
					disabled={selectedAssignPlan?.plan_type === 'free'}
				>
					<Select.Trigger class="w-full">{billingStatusLabel(assignStatus)}</Select.Trigger>
					<Select.Content>
						{#if selectedAssignPlan?.plan_type === 'free'}
							<Select.Item value="free" label={billingStatusLabel('free')} />
						{:else}
							{#each ['trial', 'active', 'past_due', 'cancelled', 'suspended'] as status (status)}
								<Select.Item
									value={status}
									label={billingStatusLabel(status as OrganisationBillingStatus)}
								/>
							{/each}
						{/if}
					</Select.Content>
				</Select.Root>
			</div>
			{#if selectedAssignPlan?.plan_type === 'paid'}
				<div class="flex flex-col gap-2">
					<Label for="next_billing_at">{t(locale, 'billing.column.nextBilling')}</Label>
					<Input id="next_billing_at" name="next_billing_at" type="date" />
				</div>
			{/if}
			<div class="flex flex-col gap-2">
				<Label for="assign_notes">{t(locale, 'billing.column.notes')}</Label>
				<Textarea id="assign_notes" name="notes" rows={3} />
			</div>
		</form>
		{#snippet footer()}
			<Button type="button" variant="outline" onclick={() => (assignOpen = false)}>
				{t(locale, 'common.cancel')}
			</Button>
			<Button type="submit" form="assign-billing-form" disabled={!assignOrgUuid || !assignPlanUuid}>
				{t(locale, 'billing.assign.submit')}
			</Button>
		{/snippet}
	</EditSheet>
{/if}
