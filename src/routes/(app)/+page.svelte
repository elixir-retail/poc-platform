<script lang="ts">
	import { resolve } from '$app/paths';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import IndianRupeeIcon from '@lucide/svelte/icons/indian-rupee';
	import UsersIcon from '@lucide/svelte/icons/users';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale } from '$lib/i18n';
	import type { OnboardingStatus } from '$lib/types/platform';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const locale = $derived(data.locale as Locale);
	const welcome = $derived(
		data.user?.email
			? t(locale, 'dashboard.welcome', { email: data.user.email })
			: t(locale, 'dashboard.welcomeAnonymous')
	);

	const totalOrgs = $derived(data.organisations.length);
	const onboardedOrgs = $derived(
		data.organisations.filter((org) => org.overall_status === 'onboarded').length
	);
	const pendingVerifications = $derived(
		data.organisations.filter((org) => org.kyc_status === 'pending' || org.kyb_status === 'pending')
			.length
	);

	const pipelineStatuses: OnboardingStatus[] = [
		'draft',
		'submitted',
		'in_review',
		'changes_requested',
		'partially_approved',
		'onboarded',
		'rejected',
		'suspended'
	];
	const pipeline = $derived(
		pipelineStatuses
			.map((status) => ({
				status,
				count: data.organisations.filter((org) => org.overall_status === status).length
			}))
			.filter((row) => row.count > 0)
	);

	const billedOrgs = $derived(data.billing.length);
	const freeOrgs = $derived(
		data.billing.filter((row) => row.billing_plan?.plan_type === 'free').length
	);
	const paidOrgs = $derived(
		data.billing.filter((row) => row.billing_plan?.plan_type === 'paid').length
	);
	const unassignedOrgs = $derived(Math.max(totalOrgs - billedOrgs, 0));

	// Monthly recurring revenue from active/trial paid assignments, normalised to a month.
	const mrrCents = $derived(
		data.billing.reduce((sum, row) => {
			if (!row.billing_plan || row.billing_plan.plan_type !== 'paid') return sum;
			if (row.status !== 'active' && row.status !== 'past_due') return sum;
			const monthly =
				row.billing_plan.billing_interval === 'yearly'
					? row.billing_plan.amount_cents / 12
					: row.billing_plan.amount_cents;
			return sum + monthly;
		}, 0)
	);
	const mrrCurrency = $derived(
		data.billing.find((row) => row.billing_plan?.plan_type === 'paid')?.billing_plan
			?.currency_code ?? 'INR'
	);
	const mrrLabel = $derived(
		new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: mrrCurrency,
			maximumFractionDigits: 0
		}).format(mrrCents / 100)
	);

	const recentOrgs = $derived(data.organisations.slice(0, 5));

	function relativeTime(value: string) {
		const diffMs = Date.now() - new Date(value).getTime();
		const minutes = Math.round(diffMs / 60000);
		const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
		if (minutes < 60) return formatter.format(-minutes, 'minute');
		const hours = Math.round(minutes / 60);
		if (hours < 24) return formatter.format(-hours, 'hour');
		return formatter.format(-Math.round(hours / 24), 'day');
	}

	function actionLabel(action: string) {
		return action.replaceAll('.', ' ').replaceAll('_', ' ');
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<h1 class="text-2xl font-semibold tracking-tight text-foreground">
			{t(locale, 'dashboard.title')}
		</h1>
		<p class="text-sm text-muted-foreground">{welcome}</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description class="flex items-center gap-2">
					<Building2Icon class="size-4" />
					{t(locale, 'dashboard.kpi.organisations')}
				</Card.Description>
				<Card.Title class="text-3xl">{totalOrgs}</Card.Title>
			</Card.Header>
			<Card.Content class="text-xs text-muted-foreground">
				{t(locale, 'dashboard.kpi.onboarded', { count: onboardedOrgs })}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description class="flex items-center gap-2">
					<ClockIcon class="size-4" />
					{t(locale, 'dashboard.kpi.pendingReview')}
				</Card.Description>
				<Card.Title class="text-3xl">{pendingVerifications}</Card.Title>
			</Card.Header>
			<Card.Content class="text-xs text-muted-foreground">
				{t(locale, 'dashboard.kpi.changeRequests', { count: data.pendingChangeRequests })}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description class="flex items-center gap-2">
					<IndianRupeeIcon class="size-4" />
					{t(locale, 'dashboard.kpi.mrr')}
				</Card.Description>
				<Card.Title class="text-3xl">{mrrLabel}</Card.Title>
			</Card.Header>
			<Card.Content class="text-xs text-muted-foreground">
				{t(locale, 'dashboard.kpi.paidOrgs', { count: paidOrgs })}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description class="flex items-center gap-2">
					<UsersIcon class="size-4" />
					{t(locale, 'dashboard.kpi.users')}
				</Card.Description>
				<Card.Title class="text-3xl">{data.userCounts.active}</Card.Title>
			</Card.Header>
			<Card.Content class="text-xs text-muted-foreground">
				{t(locale, 'dashboard.kpi.admins', { count: data.userCounts.admins })}
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between gap-2">
					<div>
						<Card.Title>{t(locale, 'dashboard.pipeline.title')}</Card.Title>
						<Card.Description>{t(locale, 'dashboard.pipeline.description')}</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href={resolve('/onboarding')}>
						{t(locale, 'dashboard.viewAll')}
						<ArrowRightIcon />
					</Button>
				</div>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				{#each pipeline as row (row.status)}
					<div class="flex items-center gap-3">
						<div class="w-40 shrink-0">
							<StatusBadge status={row.status} />
						</div>
						<div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
							<div
								class="h-full rounded-full bg-primary"
								style={`width: ${totalOrgs === 0 ? 0 : Math.round((row.count / totalOrgs) * 100)}%`}
							></div>
						</div>
						<span class="w-8 text-end text-sm font-medium tabular-nums">{row.count}</span>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">{t(locale, 'dashboard.pipeline.empty')}</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between gap-2">
					<div>
						<Card.Title>{t(locale, 'dashboard.billing.title')}</Card.Title>
						<Card.Description>{t(locale, 'dashboard.billing.description')}</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href={resolve('/billing')}>
						{t(locale, 'dashboard.viewAll')}
						<ArrowRightIcon />
					</Button>
				</div>
			</Card.Header>
			<Card.Content class="grid gap-3 sm:grid-cols-2">
				<div class="rounded-lg border border-border p-3">
					<p class="text-xs text-muted-foreground">{t(locale, 'dashboard.billing.paid')}</p>
					<p class="flex items-center gap-2 text-2xl font-semibold">
						{paidOrgs}
						<CreditCardIcon class="size-4 text-muted-foreground" />
					</p>
				</div>
				<div class="rounded-lg border border-border p-3">
					<p class="text-xs text-muted-foreground">{t(locale, 'dashboard.billing.free')}</p>
					<p class="flex items-center gap-2 text-2xl font-semibold">
						{freeOrgs}
						<CircleCheckIcon class="size-4 text-muted-foreground" />
					</p>
				</div>
				<div class="rounded-lg border border-border p-3">
					<p class="text-xs text-muted-foreground">{t(locale, 'dashboard.billing.unassigned')}</p>
					<p class="text-2xl font-semibold">{unassignedOrgs}</p>
				</div>
				<div class="rounded-lg border border-border p-3">
					<p class="text-xs text-muted-foreground">{t(locale, 'dashboard.billing.plans')}</p>
					<p class="text-2xl font-semibold">
						{data.planCounts.active}<span class="text-sm text-muted-foreground"
							>/{data.planCounts.total}</span
						>
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'dashboard.recentOrgs.title')}</Card.Title>
				<Card.Description>{t(locale, 'dashboard.recentOrgs.description')}</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col divide-y divide-border">
				{#each recentOrgs as org (org.organisation_uuid)}
					<a
						href={resolve(`/onboarding/${org.org_code}` as '/onboarding/[orgCode]')}
						class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
					>
						<div class="flex min-w-0 flex-col">
							<span class="truncate text-sm font-medium text-foreground">
								{org.trade_name ?? org.legal_name}
							</span>
							<span class="text-xs text-muted-foreground">
								{org.org_code} · {relativeTime(org.changed_at)}
							</span>
						</div>
						<StatusBadge status={org.overall_status} />
					</a>
				{:else}
					<p class="py-3 text-sm text-muted-foreground">{t(locale, 'onboarding.empty')}</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<ActivityIcon class="size-4 text-muted-foreground" />
					{t(locale, 'dashboard.activity.title')}
				</Card.Title>
				<Card.Description>{t(locale, 'dashboard.activity.description')}</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col divide-y divide-border">
				{#each data.activity as event (event.audit_event_uuid)}
					<div class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
						<div class="flex min-w-0 flex-col">
							<span class="truncate text-sm text-foreground capitalize">
								{actionLabel(event.action)}
							</span>
							<span class="text-xs text-muted-foreground">
								{event.actor?.display_name ?? '—'} · {relativeTime(event.created_at)}
							</span>
						</div>
						<Badge variant="outline" class="shrink-0 capitalize">
							{event.entity_type.replaceAll('_', ' ')}
						</Badge>
					</div>
				{:else}
					<p class="py-3 text-sm text-muted-foreground">{t(locale, 'dashboard.activity.empty')}</p>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>
