<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import BellIcon from '@lucide/svelte/icons/bell';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { t, type Locale } from '$lib/i18n';
	import type { PlatformNotification } from '$lib/types/platform';

	let { notifications }: { notifications: PlatformNotification[] } = $props();

	const unreadCount = $derived(
		notifications.filter((notification) => !notification.read_at).length
	);
	const locale = $derived(page.data.locale as Locale);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				variant="ghost"
				size="icon"
				class="relative"
				aria-label={t(locale, 'notifications.title')}
				{...props}
			>
				<BellIcon />
				{#if unreadCount > 0}
					<span
						class="absolute -inset-e-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground"
					>
						{unreadCount > 9 ? '9+' : unreadCount}
					</span>
				{/if}
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-80">
		<DropdownMenu.Label class="flex items-center justify-between">
			<span>{t(locale, 'notifications.title')}</span>
			<a href={resolve('/notifications')} class="text-xs font-normal text-primary hover:underline">
				{t(locale, 'notifications.viewAll')}
			</a>
		</DropdownMenu.Label>
		<DropdownMenu.Separator />
		{#each notifications.slice(0, 5) as notification (notification.notification_uuid)}
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<a
						href={resolve((notification.link_path ?? '/notifications') as '/notifications')}
						class="flex w-full flex-col items-start gap-1"
						{...props}
					>
						<span class:font-semibold={!notification.read_at} class="text-sm"
							>{notification.title}</span
						>
						<span class="line-clamp-2 text-xs text-muted-foreground">{notification.body}</span>
					</a>
				{/snippet}
			</DropdownMenu.Item>
		{:else}
			<div class="px-2 py-6 text-center text-sm text-muted-foreground">
				{t(locale, 'notifications.empty')}
			</div>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
