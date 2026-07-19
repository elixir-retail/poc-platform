<script lang="ts">
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import BarcodeIcon from '@lucide/svelte/icons/barcode';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import PackageIcon from '@lucide/svelte/icons/package';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
	import StoreIcon from '@lucide/svelte/icons/store';
	import UsersIcon from '@lucide/svelte/icons/users';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import UserAvatar from '$lib/components/user-avatar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { StoreAppContext, StoreBusinessMode } from '$lib/types/platform';

	type StoreRoute =
		| '/store'
		| '/store/billing'
		| '/store/transactions'
		| '/store/counters'
		| '/store/users'
		| '/store/customers'
		| '/store/reports'
		| '/store/devices'
		| '/store/settings'
		| '/store/products'
		| '/store/inventory'
		| '/store/barcodes'
		| '/store/services'
		| '/store/appointments';

	type NavItem = { titleKey: MessageKey; href: StoreRoute; icon: typeof LayoutDashboardIcon };

	let {
		context,
		locale,
		toggleLabel,
		sidebarTitle,
		sidebarDescription
	}: {
		context: StoreAppContext;
		locale: Locale;
		toggleLabel: string;
		sidebarTitle: string;
		sidebarDescription: string;
	} = $props();

	const mode = $derived(context.store.business_mode as StoreBusinessMode);
	const showRetail = $derived(mode === 'retail' || mode === 'hybrid');
	const showService = $derived(mode === 'service' || mode === 'hybrid');

	const mainItems: NavItem[] = [
		{ titleKey: 'storeApp.dashboard', href: '/store', icon: LayoutDashboardIcon },
		{ titleKey: 'storeApp.billing', href: '/store/billing', icon: CreditCardIcon },
		{ titleKey: 'storeApp.transactions', href: '/store/transactions', icon: ReceiptIcon },
		{ titleKey: 'storeApp.counters', href: '/store/counters', icon: MonitorIcon },
		{ titleKey: 'storeApp.users', href: '/store/users', icon: UsersIcon },
		{ titleKey: 'storeApp.customers', href: '/store/customers', icon: ShoppingBagIcon },
		{ titleKey: 'storeApp.reports', href: '/store/reports', icon: ClipboardListIcon },
		{ titleKey: 'storeApp.devices', href: '/store/devices', icon: MonitorIcon },
		{ titleKey: 'storeApp.settings', href: '/store/settings', icon: SettingsIcon }
	];

	const retailItems: NavItem[] = [
		{ titleKey: 'storeApp.products', href: '/store/products', icon: PackageIcon },
		{ titleKey: 'storeApp.inventory', href: '/store/inventory', icon: StoreIcon },
		{ titleKey: 'storeApp.barcodes', href: '/store/barcodes', icon: BarcodeIcon }
	];

	const serviceItems: NavItem[] = [
		{ titleKey: 'storeApp.services', href: '/store/services', icon: WrenchIcon },
		{ titleKey: 'storeApp.appointments', href: '/store/appointments', icon: CalendarClockIcon }
	];

	const pathname = $derived(page.url.pathname);
	const signOutLabel = $derived(t(locale, 'app.signOut'));

	function isActive(href: StoreRoute) {
		if (href === '/store') return pathname === '/store';
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

{#snippet navGroup(labelKey: MessageKey, items: NavItem[])}
	<Sidebar.Group>
		<Sidebar.GroupLabel>{t(locale, labelKey)}</Sidebar.GroupLabel>
		<Sidebar.GroupContent>
			<Sidebar.Menu>
				{#each items as item (item.href)}
					{@const title = t(locale, item.titleKey)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive={isActive(item.href)} tooltipContent={title}>
							{#snippet child({ props })}
								<a href={resolve(item.href)} {...props}>
									<item.icon />
									<span>{title}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.GroupContent>
	</Sidebar.Group>
{/snippet}

<Sidebar.Root collapsible="icon" {sidebarTitle} {sidebarDescription}>
	<Sidebar.Header>
		<a href={resolve('/store')} class="flex items-center gap-2 px-2 py-1.5">
			<StoreIcon class="size-4 shrink-0" />
			<span class="truncate text-sm font-semibold text-sidebar-foreground"
				>{context.store.name}</span
			>
		</a>
		<p class="truncate px-2 text-xs text-muted-foreground">
			{t(locale, `orgApp.stores.mode.${mode}` as MessageKey)}
		</p>
	</Sidebar.Header>
	<Sidebar.Content>
		{@render navGroup('storeApp.navigation', mainItems)}
		{#if showRetail}
			{@render navGroup('storeApp.navigation.retail', retailItems)}
		{/if}
		{#if showService}
			{@render navGroup('storeApp.navigation.service', serviceItems)}
		{/if}
	</Sidebar.Content>
	<Sidebar.Footer>
		<form id="store-logout-form" method="POST" action="/logout" class="hidden"></form>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					size="lg"
					tooltipContent={context.membership.display_name}
					class="pe-10"
				>
					{#snippet child({ props })}
						<a href={resolve('/store/settings')} {...props}>
							<UserAvatar name={context.membership.display_name} />
							<div class="flex min-w-0 flex-col leading-tight">
								<span class="truncate text-sm font-medium text-sidebar-foreground">
									{context.membership.display_name}
								</span>
								<span class="truncate text-xs text-muted-foreground">
									{t(locale, 'storeApp.role.root')}
								</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
				<Sidebar.MenuAction class="cursor-pointer" title={signOutLabel}>
					{#snippet child({ props })}
						<button type="submit" form="store-logout-form" aria-label={signOutLabel} {...props}>
							<LogOutIcon />
						</button>
					{/snippet}
				</Sidebar.MenuAction>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
	<Sidebar.Rail {toggleLabel} />
</Sidebar.Root>
