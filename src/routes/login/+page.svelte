<script lang="ts">
	import LocaleSwitcher from '$lib/components/locale-switcher.svelte';
	import ModeToggle from '$lib/components/mode-toggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { LoginErrorCode } from '$lib/schemas/auth';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);

	const errorKey = $derived.by((): MessageKey | null => {
		const code = form?.errorCode as LoginErrorCode | undefined;
		if (!code) return null;
		const map: Record<LoginErrorCode, MessageKey> = {
			invalidEmail: 'login.error.invalidEmail',
			passwordRequired: 'login.error.passwordRequired',
			invalidCredentials: 'login.error.invalidCredentials',
			generic: 'login.error.generic'
		};
		return map[code];
	});
</script>

<div class="relative flex min-h-svh items-center justify-center bg-background p-4">
	<div class="absolute inset-e-4 top-4 flex items-center gap-1">
		<LocaleSwitcher {locale} />
		<ModeToggle {locale} />
	</div>

	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>{t(locale, 'login.title')}</Card.Title>
			<Card.Description>{t(locale, 'login.description')}</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/login" class="flex flex-col gap-4">
				{#if errorKey}
					<p class="text-sm text-destructive" role="alert">{t(locale, errorKey)}</p>
				{/if}
				<div class="flex flex-col gap-2">
					<Label for="email">{t(locale, 'login.email')}</Label>
					<Input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						value={form?.email ?? ''}
					/>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="password">{t(locale, 'login.password')}</Label>
					<Input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
					/>
				</div>
				<Button type="submit" class="w-full">{t(locale, 'login.submit')}</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
