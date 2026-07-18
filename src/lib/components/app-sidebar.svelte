<script lang="ts">
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import UsersIcon from '@lucide/svelte/icons/users';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LocaleSwitcher from '$lib/components/locale-switcher.svelte';
	import ModeToggle from '$lib/components/mode-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { PlatformProfile } from '$lib/types/platform';
	import type { User } from '@supabase/supabase-js';

	type NavItem = {
		titleKey: MessageKey;
		href: '/' | '/onboarding' | '/billing' | '/users' | '/audit';
		icon: typeof LayoutDashboardIcon;
	};

	let {
		user,
		profile,
		locale,
		toggleLabel,
		sidebarTitle,
		sidebarDescription
	}: {
		user: User | null;
		profile: PlatformProfile;
		locale: Locale;
		toggleLabel: string;
		sidebarTitle: string;
		sidebarDescription: string;
	} = $props();

	const navItems: NavItem[] = [
		{ titleKey: 'nav.dashboard', href: '/', icon: LayoutDashboardIcon },
		{ titleKey: 'nav.organizations', href: '/onboarding', icon: Building2Icon },
		{ titleKey: 'nav.billing', href: '/billing', icon: CreditCardIcon },
		{ titleKey: 'nav.users', href: '/users', icon: UsersIcon },
		{ titleKey: 'nav.audit', href: '/audit', icon: ClipboardListIcon }
	];

	const pathname = $derived(page.url.pathname);

	function isActive(href: string) {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<Sidebar.Root collapsible="icon" {sidebarTitle} {sidebarDescription}>
	<Sidebar.Header>
		<a href={resolve('/')} class="flex items-center gap-2 px-2 py-1.5">
			<span class="truncate text-sm font-semibold text-sidebar-foreground">
				{t(locale, 'app.platform')}
			</span>
		</a>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>{t(locale, 'app.navigation')}</Sidebar.GroupLabel>
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
		<div class="flex flex-col gap-2 px-1">
			<p class="truncate px-1 text-xs font-medium text-sidebar-foreground">
				{user?.email ?? t(locale, 'app.signedIn')}
			</p>
			<p class="truncate px-1 text-xs text-muted-foreground">
				{profile.role === 'platform_admin' ? 'Platform admin' : 'Platform operator'}
			</p>
			<div class="flex items-center gap-1">
				<LocaleSwitcher {locale} />
				<ModeToggle {locale} />
				<form method="POST" action="/logout">
					<Button type="submit" variant="ghost" size="icon" aria-label={t(locale, 'app.signOut')}>
						<LogOutIcon />
					</Button>
				</form>
			</div>
		</div>
	</Sidebar.Footer>
	<Sidebar.Rail {toggleLabel} />
</Sidebar.Root>
