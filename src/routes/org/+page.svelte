<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import StoreIcon from '@lucide/svelte/icons/store';
	import UsersIcon from '@lucide/svelte/icons/users';
	import WifiIcon from '@lucide/svelte/icons/wifi';
	import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const locale = $derived(data.locale as Locale);
	const context = $derived(data.organisationContext);

	const activeStores = $derived(data.stores.filter((store) => store.status === 'active').length);
	const onlineCount = $derived(
		data.transactions.filter((transaction) => transaction.channel === 'online').length
	);
	const offlineCount = $derived(
		data.transactions.filter((transaction) => transaction.channel === 'offline').length
	);
	const completedTotalCents = $derived(
		data.transactions
			.filter((transaction) => transaction.status === 'completed')
			.reduce((sum, transaction) => sum + transaction.gross_amount_cents, 0)
	);
	const revenueCurrency = $derived(
		data.transactions[0]?.currency_code ?? context.organisation.primary_currency_code
	);
	const revenueLabel = $derived(
		new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: revenueCurrency,
			maximumFractionDigits: 0
		}).format(completedTotalCents / 100)
	);

	const recentTransactions = $derived(data.transactions.slice(0, 5));

	// Per-store completed revenue for the breakdown bars.
	const storePerformance = $derived.by(() => {
		const totals = new Map<string, { name: string; code: string; cents: number }>();
		for (const transaction of data.transactions) {
			if (transaction.status !== 'completed') continue;
			const entry = totals.get(transaction.store_uuid) ?? {
				name: transaction.store?.name ?? '—',
				code: transaction.store?.store_code ?? '—',
				cents: 0
			};
			entry.cents += transaction.gross_amount_cents;
			totals.set(transaction.store_uuid, entry);
		}
		const rows = [...totals.entries()].map(([storeUuid, entry]) => ({ storeUuid, ...entry }));
		rows.sort((a, b) => b.cents - a.cents);
		const max = rows[0]?.cents ?? 0;
		return rows.map((row) => ({
			...row,
			percent: max === 0 ? 0 : Math.round((row.cents / max) * 100)
		}));
	});

	function formatAmount(amountCents: number, currencyCode: string) {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: currencyCode
		}).format(amountCents / 100);
	}

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
			{context.organisation.trade_name ?? context.organisation.legal_name}
		</h1>
		<p class="text-sm text-muted-foreground">
			{t(locale, 'orgApp.dashboard.welcome', { name: context.membership.display_name })}
		</p>
	</div>

	{#if data.pendingStoreRequests > 0}
		<a
			href={resolve('/org/stores')}
			class="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm transition-colors hover:bg-muted"
		>
			<ClockIcon class="size-4 shrink-0 text-muted-foreground" />
			<span class="flex-1">
				{t(locale, 'orgApp.dashboard.pendingRequests', { count: data.pendingStoreRequests })}
			</span>
			<ArrowRightIcon class="size-4 shrink-0 text-muted-foreground" />
		</a>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description class="flex items-center gap-2">
					<ReceiptIcon class="size-4" />
					{t(locale, 'orgApp.dashboard.kpi.revenue')}
				</Card.Description>
				<Card.Title class="text-3xl">{revenueLabel}</Card.Title>
			</Card.Header>
			<Card.Content class="text-xs text-muted-foreground">
				{t(locale, 'orgApp.dashboard.kpi.revenueHint', { count: data.transactions.length })}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description class="flex items-center gap-2">
					<StoreIcon class="size-4" />
					{t(locale, 'orgApp.stores.title')}
				</Card.Description>
				<Card.Title class="text-3xl">{data.stores.length}</Card.Title>
			</Card.Header>
			<Card.Content class="text-xs text-muted-foreground">
				{t(locale, 'orgApp.dashboard.kpi.activeStores', { count: activeStores })}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description class="flex items-center gap-2">
					<UsersIcon class="size-4" />
					{t(locale, 'orgApp.users.title')}
				</Card.Description>
				<Card.Title class="text-3xl">{data.userCounts.active}</Card.Title>
			</Card.Header>
			<Card.Content class="text-xs text-muted-foreground">
				{t(locale, 'orgApp.dashboard.kpi.admins', { count: data.userCounts.admins })}
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description class="flex items-center gap-2">
					<CreditCardIcon class="size-4" />
					{t(locale, 'orgApp.billing.title')}
				</Card.Description>
				<Card.Title class="truncate text-2xl">
					{data.billing?.billing_plan?.name ?? t(locale, 'billing.status.unassigned')}
				</Card.Title>
			</Card.Header>
			<Card.Content class="text-xs text-muted-foreground">
				{#if data.billing}
					{t(locale, `billing.status.${data.billing.status}` as MessageKey)}
					{#if data.billing.billing_plan && data.billing.billing_plan.plan_type === 'paid'}
						· {formatAmount(
							data.billing.billing_plan.amount_cents,
							data.billing.billing_plan.currency_code
						)}
						{t(
							locale,
							`billing.interval.${data.billing.billing_plan.billing_interval}` as MessageKey
						)}
					{/if}
				{:else}
					{t(locale, 'orgApp.billing.unassigned')}
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between gap-2">
					<div>
						<Card.Title>{t(locale, 'orgApp.dashboard.channels.title')}</Card.Title>
						<Card.Description>
							{t(locale, 'orgApp.dashboard.channels.description')}
						</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href={resolve('/org/transactions')}>
						{t(locale, 'orgApp.dashboard.viewAll')}
						<ArrowRightIcon />
					</Button>
				</div>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="rounded-lg border border-border p-3">
						<p class="flex items-center gap-2 text-xs text-muted-foreground">
							<WifiIcon class="size-3.5" />
							{t(locale, 'orgApp.transactions.online')}
						</p>
						<p class="mt-1 text-2xl font-semibold">{onlineCount}</p>
					</div>
					<div class="rounded-lg border border-border p-3">
						<p class="flex items-center gap-2 text-xs text-muted-foreground">
							<WifiOffIcon class="size-3.5" />
							{t(locale, 'orgApp.transactions.offline')}
						</p>
						<p class="mt-1 text-2xl font-semibold">{offlineCount}</p>
					</div>
				</div>
				<div>
					<p class="mb-3 text-xs font-medium text-muted-foreground">
						{t(locale, 'orgApp.dashboard.storePerformance')}
					</p>
					<div class="flex flex-col gap-3">
						{#each storePerformance as row (row.storeUuid)}
							<div class="flex items-center gap-3">
								<div class="w-36 shrink-0 truncate text-sm" title={row.name}>{row.name}</div>
								<div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
									<div
										class="h-full rounded-full bg-primary"
										style={`width: ${row.percent}%`}
									></div>
								</div>
								<span class="w-24 text-end text-sm font-medium tabular-nums">
									{formatAmount(row.cents, revenueCurrency)}
								</span>
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">
								{t(locale, 'orgApp.dashboard.noRevenue')}
							</p>
						{/each}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between gap-2">
					<div>
						<Card.Title>{t(locale, 'orgApp.dashboard.recentTransactions')}</Card.Title>
						<Card.Description>
							{t(locale, 'orgApp.dashboard.recentTransactionsHint')}
						</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href={resolve('/org/transactions')}>
						{t(locale, 'orgApp.dashboard.viewAll')}
						<ArrowRightIcon />
					</Button>
				</div>
			</Card.Header>
			<Card.Content class="flex flex-col divide-y divide-border">
				{#each recentTransactions as transaction (transaction.store_transaction_uuid)}
					<div class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
						<div class="flex min-w-0 flex-col">
							<span class="truncate text-sm font-medium text-foreground">
								{transaction.store?.name ?? '—'}
							</span>
							<span class="truncate text-xs text-muted-foreground">
								{transaction.transaction_code} · {relativeTime(transaction.occurred_at)}
							</span>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<Badge variant={transaction.channel === 'online' ? 'default' : 'secondary'}>
								{t(locale, `orgApp.transactions.${transaction.channel}` as MessageKey)}
							</Badge>
							<span
								class="text-sm font-medium tabular-nums"
								class:text-muted-foreground={transaction.status !== 'completed'}
							>
								{formatAmount(transaction.gross_amount_cents, transaction.currency_code)}
							</span>
						</div>
					</div>
				{:else}
					<p class="py-3 text-sm text-muted-foreground">
						{t(locale, 'orgApp.transactions.empty')}
					</p>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between gap-2">
					<div>
						<Card.Title>{t(locale, 'orgApp.stores.title')}</Card.Title>
						<Card.Description>{t(locale, 'orgApp.dashboard.storesHint')}</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href={resolve('/org/stores')}>
						{t(locale, 'orgApp.dashboard.viewAll')}
						<ArrowRightIcon />
					</Button>
				</div>
			</Card.Header>
			<Card.Content class="flex flex-col divide-y divide-border">
				{#each data.stores.slice(0, 5) as store (store.store_uuid)}
					<a
						href={resolve('/org/stores/[storeCode]', { storeCode: store.store_code })}
						class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
					>
						<div class="flex min-w-0 flex-col">
							<span class="truncate text-sm font-medium text-foreground">{store.name}</span>
							<span class="font-mono text-xs text-muted-foreground">{store.store_code}</span>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<Badge variant="outline">
								{t(locale, `orgApp.stores.mode.${store.business_mode}` as MessageKey)}
							</Badge>
							<Badge variant={store.status === 'active' ? 'secondary' : 'outline'}>
								{t(locale, `orgApp.stores.status.${store.status}` as MessageKey)}
							</Badge>
						</div>
					</a>
				{:else}
					<p class="py-3 text-sm text-muted-foreground">{t(locale, 'orgApp.stores.empty')}</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between gap-2">
					<div>
						<Card.Title class="flex items-center gap-2">
							<ActivityIcon class="size-4 text-muted-foreground" />
							{t(locale, 'orgApp.dashboard.activity')}
						</Card.Title>
						<Card.Description>{t(locale, 'orgApp.dashboard.activityHint')}</Card.Description>
					</div>
					<Button variant="ghost" size="sm" href={resolve('/org/audit')}>
						{t(locale, 'orgApp.dashboard.viewAll')}
						<ArrowRightIcon />
					</Button>
				</div>
			</Card.Header>
			<Card.Content class="flex flex-col divide-y divide-border">
				{#each data.activity as event (event.organisation_audit_event_uuid)}
					<div class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
						<span class="truncate text-sm text-foreground capitalize">
							{actionLabel(event.action)}
						</span>
						<span class="shrink-0 text-xs text-muted-foreground">
							{relativeTime(event.created_at)}
						</span>
					</div>
				{:else}
					<p class="py-3 text-sm text-muted-foreground">{t(locale, 'orgApp.audit.empty')}</p>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>
</div>
