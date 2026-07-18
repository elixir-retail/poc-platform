<script lang="ts">
	import BellIcon from '@lucide/svelte/icons/bell';
	import CheckCheckIcon from '@lucide/svelte/icons/check-check';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
		<div>
			<div class="flex items-center gap-2">
				<BellIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">
					{t(locale, 'notifications.title')}
				</h1>
			</div>
			<p class="mt-1 text-sm text-muted-foreground">
				{t(locale, 'notifications.description')}
			</p>
		</div>
		<form method="POST" action="?/markAllRead">
			<Button type="submit" variant="outline" size="sm">
				<CheckCheckIcon />
				{t(locale, 'notifications.markAllRead')}
			</Button>
		</form>
	</div>

	<div class="flex flex-col gap-3">
		{#each data.notifications as notification (notification.notification_uuid)}
			<Card.Root class={notification.read_at ? 'opacity-70' : undefined}>
				<Card.Header>
					<div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
						<div>
							<Card.Title class="text-base">{notification.title}</Card.Title>
							<Card.Description>
								{new Intl.DateTimeFormat(undefined, {
									dateStyle: 'medium',
									timeStyle: 'short'
								}).format(new Date(notification.created_at))}
							</Card.Description>
						</div>
						{#if !notification.read_at}
							<span class="size-2 rounded-full bg-primary" aria-label="Unread"></span>
						{/if}
					</div>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">{notification.body}</p>
				</Card.Content>
				<Card.Footer class="justify-between">
					{#if notification.link_path}
						<Button href={notification.link_path} variant="outline" size="sm">
							{t(locale, 'common.open')}
						</Button>
					{/if}
					{#if !notification.read_at}
						<form method="POST" action="?/markRead">
							<input
								type="hidden"
								name="notification_uuid"
								value={notification.notification_uuid}
							/>
							<Button type="submit" variant="ghost" size="sm">
								{t(locale, 'notifications.markRead')}
							</Button>
						</form>
					{/if}
				</Card.Footer>
			</Card.Root>
		{:else}
			<Card.Root>
				<Card.Content class="py-12 text-center text-sm text-muted-foreground">
					{t(locale, 'notifications.empty')}
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
