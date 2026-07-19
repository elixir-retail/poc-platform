<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import BarcodeIcon from '@lucide/svelte/icons/barcode';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import PackageIcon from '@lucide/svelte/icons/package';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
	import StoreIcon from '@lucide/svelte/icons/store';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import UsersIcon from '@lucide/svelte/icons/users';
	import WifiIcon from '@lucide/svelte/icons/wifi';
	import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { StoreBusinessMode } from '$lib/types/platform';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);
	const mode = $derived(data.storeContext.store.business_mode as StoreBusinessMode);
	const showRetail = $derived(mode === 'retail' || mode === 'hybrid');
	const showService = $derived(mode === 'service' || mode === 'hybrid');

	const completedTotal = $derived(
		data.transactions
			.filter((transaction) => transaction.status === 'completed')
			.reduce((sum, transaction) => sum + transaction.gross_amount_cents, 0)
	);
	const onlineCount = $derived(
		data.transactions.filter((transaction) => transaction.channel === 'online').length
	);
	const offlineCount = $derived(
		data.transactions.filter((transaction) => transaction.channel === 'offline').length
	);

	type ModuleLink = {
		titleKey: MessageKey;
		descriptionKey: MessageKey;
		href:
			| '/store/transactions'
			| '/store/counters'
			| '/store/users'
			| '/store/customers'
			| '/store/billing'
			| '/store/reports'
			| '/store/devices'
			| '/store/settings'
			| '/store/products'
			| '/store/inventory'
			| '/store/barcodes'
			| '/store/services'
			| '/store/appointments';
		icon: typeof ReceiptIcon;
	};

	const modules = $derived.by(() => {
		const items: ModuleLink[] = [
			{
				titleKey: 'storeApp.billing',
				descriptionKey: 'storeApp.billing.description',
				href: '/store/billing',
				icon: CreditCardIcon
			},
			{
				titleKey: 'storeApp.transactions',
				descriptionKey: 'storeApp.transactions.description',
				href: '/store/transactions',
				icon: ReceiptIcon
			},
			{
				titleKey: 'storeApp.counters',
				descriptionKey: 'storeApp.counters.description',
				href: '/store/counters',
				icon: MonitorIcon
			},
			{
				titleKey: 'storeApp.users',
				descriptionKey: 'storeApp.users.description',
				href: '/store/users',
				icon: UsersIcon
			},
			{
				titleKey: 'storeApp.customers',
				descriptionKey: 'storeApp.customers.description',
				href: '/store/customers',
				icon: ShoppingBagIcon
			},
			{
				titleKey: 'storeApp.reports',
				descriptionKey: 'storeApp.reports.description',
				href: '/store/reports',
				icon: ClipboardListIcon
			},
			{
				titleKey: 'storeApp.devices',
				descriptionKey: 'storeApp.devices.description',
				href: '/store/devices',
				icon: MonitorIcon
			},
			{
				titleKey: 'storeApp.settings',
				descriptionKey: 'storeApp.settings.description',
				href: '/store/settings',
				icon: SettingsIcon
			}
		];

		if (showRetail) {
			items.push(
				{
					titleKey: 'storeApp.products',
					descriptionKey: 'storeApp.products.description',
					href: '/store/products',
					icon: PackageIcon
				},
				{
					titleKey: 'storeApp.inventory',
					descriptionKey: 'storeApp.inventory.description',
					href: '/store/inventory',
					icon: StoreIcon
				},
				{
					titleKey: 'storeApp.barcodes',
					descriptionKey: 'storeApp.barcodes.description',
					href: '/store/barcodes',
					icon: BarcodeIcon
				}
			);
		}

		if (showService) {
			items.push(
				{
					titleKey: 'storeApp.services',
					descriptionKey: 'storeApp.services.description',
					href: '/store/services',
					icon: WrenchIcon
				},
				{
					titleKey: 'storeApp.appointments',
					descriptionKey: 'storeApp.appointments.description',
					href: '/store/appointments',
					icon: CalendarClockIcon
				}
			);
		}

		return items;
	});

	function formatAmount(amountCents: number) {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: data.storeContext.store.currency_code
		}).format(amountCents / 100);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<div class="flex flex-wrap items-center gap-2">
			<StoreIcon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{data.storeContext.store.name}
			</h1>
			<Badge variant="secondary">
				{t(locale, `orgApp.stores.mode.${mode}` as MessageKey)}
			</Badge>
		</div>
		<p class="text-sm text-muted-foreground">
			{data.storeContext.store.store_code} ·
			{data.storeContext.organisation.trade_name ?? data.storeContext.organisation.legal_name}
		</p>
		<p class="text-sm text-muted-foreground">
			{t(locale, 'storeApp.dashboard.welcome', { name: data.storeContext.membership.display_name })}
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.dashboard.transactions')}</Card.Description>
				<Card.Title class="flex items-center gap-2">
					<ReceiptIcon class="size-4 text-muted-foreground" />
					{data.transactions.length}
				</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.dashboard.completedValue')}</Card.Description>
				<Card.Title>{formatAmount(completedTotal)}</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'orgApp.transactions.online')}</Card.Description>
				<Card.Title class="flex items-center gap-2">
					<WifiIcon class="size-4 text-muted-foreground" />
					{onlineCount}
				</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'orgApp.transactions.offline')}</Card.Description>
				<Card.Title class="flex items-center gap-2">
					<WifiOffIcon class="size-4 text-muted-foreground" />
					{offlineCount}
				</Card.Title>
			</Card.Header>
		</Card.Root>
	</div>

	<div>
		<h2 class="mb-3 text-sm font-semibold text-foreground">
			{t(locale, 'storeApp.dashboard.modules')}
		</h2>
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{#each modules as module (module.href)}
				<a
					href={resolve(module.href)}
					class="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40"
				>
					<module.icon class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
					<div class="min-w-0 flex-1">
						<div class="flex items-center justify-between gap-2">
							<p class="text-sm font-medium text-foreground">{t(locale, module.titleKey)}</p>
							<ArrowRightIcon
								class="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
							/>
						</div>
						<p class="mt-1 text-xs text-muted-foreground">{t(locale, module.descriptionKey)}</p>
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>
