<script lang="ts">
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import StoreIcon from '@lucide/svelte/icons/store';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import UserAvatar from '$lib/components/user-avatar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { StoreAppContext } from '$lib/types/platform';

	type StoreRoute = '/store' | '/store/transactions';
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

	const navItems: NavItem[] = [
		{ titleKey: 'storeApp.dashboard', href: '/store', icon: LayoutDashboardIcon },
		{ titleKey: 'storeApp.transactions', href: '/store/transactions', icon: ReceiptIcon }
	];

	const pathname = $derived(page.url.pathname);
	const signOutLabel = $derived(t(locale, 'app.signOut'));

	function isActive(href: StoreRoute) {
		if (href === '/store') return pathname === '/store';
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<Sidebar.Root collapsible="icon" {sidebarTitle} {sidebarDescription}>
	<Sidebar.Header>
		<a href={resolve('/store')} class="flex items-center gap-2 px-2 py-1.5">
			<StoreIcon class="size-4 shrink-0" />
			<span class="truncate text-sm font-semibold text-sidebar-foreground"
				>{context.store.name}</span
			>
		</a>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>{t(locale, 'storeApp.navigation')}</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navItems as item (item.href)}
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
						<a href={resolve('/store')} {...props}>
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
