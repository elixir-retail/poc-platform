<script lang="ts">
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { t, type Locale } from '$lib/i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const locale = $derived(data.locale as Locale);
</script>

<div class="flex min-h-svh items-center justify-center bg-background p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header>
			<div class="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
				<KeyRoundIcon class="size-5 text-muted-foreground" />
			</div>
			<Card.Title>{t(locale, 'orgApp.changePassword.title')}</Card.Title>
			<Card.Description>{t(locale, 'orgApp.changePassword.description')}</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" id="change-password-form" class="grid gap-4">
				{#if form?.message}
					<div class="rounded-lg border border-border p-3 text-sm text-destructive" role="alert">
						{form.message}
					</div>
				{/if}
				<div class="grid gap-2">
					<Label for="password">{t(locale, 'orgApp.changePassword.new')}</Label>
					<Input
						id="password"
						name="password"
						type="password"
						minlength={8}
						autocomplete="new-password"
						required
					/>
				</div>
				<div class="grid gap-2">
					<Label for="confirm_password">{t(locale, 'orgApp.changePassword.confirm')}</Label>
					<Input
						id="confirm_password"
						name="confirm_password"
						type="password"
						minlength={8}
						autocomplete="new-password"
						required
					/>
				</div>
			</form>
		</Card.Content>
		<Card.Footer>
			<Button type="submit" form="change-password-form" class="w-full">
				{t(locale, 'orgApp.changePassword.submit')}
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
