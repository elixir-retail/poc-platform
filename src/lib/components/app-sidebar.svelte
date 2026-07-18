<script lang="ts">
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import UsersIcon from '@lucide/svelte/icons/users';
	import { page } from '$app/state';
	import ModeToggle from '$lib/components/mode-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import type { User } from '@supabase/supabase-js';

	type NavItem = {
		title: string;
		href: string;
		icon: typeof LayoutDashboardIcon;
	};

	let { user }: { user: User | null } = $props();

	const navItems: NavItem[] = [
		{ title: 'Dashboard', href: '/', icon: LayoutDashboardIcon },
		{ title: 'Organizations', href: '/organizations', icon: Building2Icon },
		{ title: 'Billing', href: '/billing', icon: CreditCardIcon },
		{ title: 'Users', href: '/users', icon: UsersIcon },
		{ title: 'Audit log', href: '/audit', icon: ClipboardListIcon }
	];

	const pathname = $derived(page.url.pathname);

	function isActive(href: string) {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header>
		<a href="/" class="flex items-center gap-2 px-2 py-1.5">
			<span class="text-sidebar-foreground truncate text-sm font-semibold">Platform</span>
		</a>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navItems as item (item.href)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={isActive(item.href)}
								tooltipContent={item.title}
							>
								{#snippet child({ props })}
									<a href={item.href} {...props}>
										<item.icon />
										<span>{item.title}</span>
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
		<div class="flex items-center gap-1 px-1">
			<div class="min-w-0 flex-1 px-1">
				<p class="text-sidebar-foreground truncate text-xs font-medium">
					{user?.email ?? 'Signed in'}
				</p>
			</div>
			<ModeToggle />
			<form method="POST" action="/logout">
				<Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
					<LogOutIcon />
				</Button>
			</form>
		</div>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
