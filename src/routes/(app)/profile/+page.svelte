<script lang="ts">
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import UserRoundCogIcon from '@lucide/svelte/icons/user-round-cog';
	import UserAvatar from '$lib/components/user-avatar.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { t, type Locale } from '$lib/i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const profile = $derived(data.profile);
	const roleLabel = $derived(
		profile.role === 'platform_admin'
			? t(locale, 'users.role.admin')
			: t(locale, 'users.role.operator')
	);
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col gap-6">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<UserRoundCogIcon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{t(locale, 'profile.title')}
			</h1>
		</div>
		<p class="text-sm text-muted-foreground">{t(locale, 'profile.description')}</p>
	</div>

	{#if form?.message}
		<div
			class="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm"
			role="status"
		>
			{#if form.success}
				<CheckCircle2Icon class="size-4 text-primary" />
			{/if}
			{form.message}
		</div>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'profile.avatarTitle')}</Card.Title>
			<Card.Description>{t(locale, 'profile.avatarDescription')}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-6">
			<div class="flex items-center gap-4">
				<UserAvatar
					name={profile.display_name}
					avatarUrl={profile.avatar_url}
					class="size-16 text-lg"
				/>
				<div class="flex flex-col">
					<span class="text-sm font-medium text-foreground">{profile.display_name}</span>
					<span class="text-xs text-muted-foreground">{profile.email}</span>
				</div>
			</div>
			<form
				method="POST"
				action="?/updateAvatar"
				enctype="multipart/form-data"
				class="flex flex-col gap-3"
			>
				<div class="flex flex-col gap-2">
					<Label for="avatar-file">{t(locale, 'profile.uploadLabel')}</Label>
					<Input
						id="avatar-file"
						name="avatar"
						type="file"
						accept="image/png,image/jpeg,image/webp"
						required
					/>
					<p class="text-xs text-muted-foreground">{t(locale, 'profile.uploadHint')}</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<Button type="submit">{t(locale, 'profile.uploadButton')}</Button>
					{#if profile.avatar_url}
						<Button type="submit" variant="outline" formaction="?/removeAvatar" formnovalidate>
							{t(locale, 'profile.removeButton')}
						</Button>
					{/if}
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'profile.accountTitle')}</Card.Title>
			<Card.Description>{t(locale, 'profile.accountDescription')}</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4 text-sm">
			<div class="flex flex-col gap-1">
				<span class="text-xs text-muted-foreground">{t(locale, 'profile.nameLabel')}</span>
				<span class="font-medium text-foreground">{profile.display_name}</span>
			</div>
			<div class="flex flex-col gap-1">
				<span class="text-xs text-muted-foreground">{t(locale, 'profile.emailLabel')}</span>
				<span class="font-medium text-foreground">{profile.email}</span>
			</div>
			<div class="flex flex-col gap-1">
				<span class="text-xs text-muted-foreground">{t(locale, 'profile.roleLabel')}</span>
				<Badge variant={profile.role === 'platform_admin' ? 'default' : 'secondary'} class="w-fit">
					{roleLabel}
				</Badge>
			</div>
		</Card.Content>
	</Card.Root>
</div>
