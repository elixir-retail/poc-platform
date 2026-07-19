<script lang="ts">
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import StoreIcon from '@lucide/svelte/icons/store';
	import UsersIcon from '@lucide/svelte/icons/users';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import UserAvatar from '$lib/components/user-avatar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { OrganisationAppContext } from '$lib/types/platform';

	type OrgRoute =
		| '/org'
		| '/org/users'
		| '/org/stores'
		| '/org/transactions'
		| '/org/billing'
		| '/org/profile';
	type NavItem = { titleKey: MessageKey; href: OrgRoute; icon: typeof LayoutDashboardIcon };

	let {
		context,
		locale,
		toggleLabel,
		sidebarTitle,
		sidebarDescription
	}: {
		context: OrganisationAppContext;
		locale: Locale;
		toggleLabel: string;
		sidebarTitle: string;
		sidebarDescription: string;
	} = $props();

	const navItems: NavItem[] = [
		{ titleKey: 'orgApp.dashboard', href: '/org', icon: LayoutDashboardIcon },
		{ titleKey: 'orgApp.users', href: '/org/users', icon: UsersIcon },
		{ titleKey: 'orgApp.stores', href: '/org/stores', icon: StoreIcon },
		{ titleKey: 'orgApp.transactions', href: '/org/transactions', icon: ReceiptIcon },
		{ titleKey: 'orgApp.billing', href: '/org/billing', icon: CreditCardIcon },
		{ titleKey: 'orgApp.profile', href: '/org/profile', icon: Building2Icon }
	];

	const pathname = $derived(page.url.pathname);
	const signOutLabel = $derived(t(locale, 'app.signOut'));
	const organisationName = $derived(
		context.organisation.trade_name ?? context.organisation.legal_name
	);

	function isActive(href: OrgRoute) {
		if (href === '/org') return pathname === '/org';
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<Sidebar.Root collapsible="icon" {sidebarTitle} {sidebarDescription}>
	<Sidebar.Header>
		<a href={resolve('/org')} class="flex items-center gap-2 px-2 py-1.5">
			<Building2Icon class="size-4 shrink-0" />
			<span class="truncate text-sm font-semibold text-sidebar-foreground">{organisationName}</span>
		</a>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>{t(locale, 'orgApp.navigation')}</Sidebar.GroupLabel>
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
		<form id="org-logout-form" method="POST" action="/logout" class="hidden"></form>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					size="lg"
					tooltipContent={context.membership.display_name}
					class="pe-10"
				>
					{#snippet child({ props })}
						<a href={resolve('/org/profile')} {...props}>
							<UserAvatar name={context.membership.display_name} />
							<div class="flex min-w-0 flex-col leading-tight">
								<span class="truncate text-sm font-medium text-sidebar-foreground">
									{context.membership.display_name}
								</span>
								<span class="truncate text-xs text-muted-foreground">
									{t(locale, `orgApp.role.${context.membership.role}` as MessageKey)}
								</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
				<Sidebar.MenuAction class="cursor-pointer" title={signOutLabel}>
					{#snippet child({ props })}
						<button type="submit" form="org-logout-form" aria-label={signOutLabel} {...props}>
							<LogOutIcon />
						</button>
					{/snippet}
				</Sidebar.MenuAction>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
	<Sidebar.Rail {toggleLabel} />
</Sidebar.Root>
