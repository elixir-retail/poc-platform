<script lang="ts">
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import UsersIcon from '@lucide/svelte/icons/users';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import UserAvatar from '$lib/components/user-avatar.svelte';
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
	const profileLabel = $derived(t(locale, 'profile.title'));
	const signOutLabel = $derived(t(locale, 'app.signOut'));

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
		<form id="logout-form" method="POST" action="/logout" class="hidden"></form>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					size="lg"
					isActive={isActive('/profile')}
					tooltipContent={profileLabel}
					class="pe-10"
				>
					{#snippet child({ props })}
						<a href={resolve('/profile')} {...props}>
							<UserAvatar name={profile.display_name} avatarUrl={profile.avatar_url} />
							<div class="flex min-w-0 flex-col leading-tight">
								<span class="truncate text-sm font-medium text-sidebar-foreground">
									{profile.display_name}
								</span>
								<span class="truncate text-xs text-muted-foreground">
									{user?.email ?? profile.email}
								</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
				<Sidebar.MenuAction class="cursor-pointer" title={signOutLabel}>
					{#snippet child({ props })}
						<button type="submit" form="logout-form" aria-label={signOutLabel} {...props}>
							<LogOutIcon />
						</button>
					{/snippet}
				</Sidebar.MenuAction>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
	<Sidebar.Rail {toggleLabel} />
</Sidebar.Root>
