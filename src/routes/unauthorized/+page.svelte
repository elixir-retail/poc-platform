<script lang="ts">
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);
</script>

<div class="flex min-h-svh items-center justify-center bg-background p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header>
			<div class="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
				<ShieldAlertIcon class="size-5 text-muted-foreground" />
			</div>
			<Card.Title>{t(locale, 'unauthorized.title')}</Card.Title>
			<Card.Description>
				{t(locale, 'unauthorized.description', { email: data.email ?? 'This account' })}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-sm text-muted-foreground">
				{t(locale, 'unauthorized.help')}
			</p>
		</Card.Content>
		<Card.Footer>
			<form method="POST" action="/logout" class="w-full">
				<Button type="submit" variant="outline" class="w-full">
					{t(locale, 'unauthorized.signOut')}
				</Button>
			</form>
		</Card.Footer>
	</Card.Root>
</div>
