<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import UsersIcon from '@lucide/svelte/icons/users';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import UserAvatar from '$lib/components/user-avatar.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { OrganisationUserRole } from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const canManage = $derived(
		data.organisationContext.membership.role === 'root' ||
			data.organisationContext.membership.role === 'admin'
	);
	let createOpen = $state(false);
	let createRole = $state<'admin' | 'viewer'>('viewer');

	function roleLabel(role: OrganisationUserRole) {
		return t(locale, `orgApp.role.${role}` as MessageKey);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<UsersIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">
					{t(locale, 'orgApp.users.title')}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground">{t(locale, 'orgApp.users.description')}</p>
			{#if !canManage}
				<p class="text-xs text-muted-foreground">{t(locale, 'orgApp.users.adminOnly')}</p>
			{/if}
		</div>
		{#if canManage}
			<Button onclick={() => (createOpen = true)}>
				<PlusIcon />
				{t(locale, 'orgApp.users.add')}
			</Button>
		{/if}
	</div>

	{#if form?.message}
		<div
			class="rounded-lg border border-border bg-card px-4 py-3 text-sm"
			class:text-destructive={form.success === false}
			role="status"
		>
			{form.message}
		</div>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'orgApp.users.listTitle')}</Card.Title>
			<Card.Description>
				{t(locale, 'orgApp.users.records', { count: data.users.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'orgApp.users.field.name')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.users.field.email')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.users.field.role')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.users.column.storeAccess')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.users.column.status')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.users as user (user.organisation_user_uuid)}
							<Table.Row>
								<Table.Cell class="ps-6">
									<div class="flex items-center gap-3">
										<UserAvatar name={user.display_name} />
										<span class="font-medium">{user.display_name}</span>
									</div>
								</Table.Cell>
								<Table.Cell>{user.email}</Table.Cell>
								<Table.Cell>
									<Badge variant={user.role === 'root' ? 'default' : 'secondary'}>
										{roleLabel(user.role)}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									{user.role === 'viewer'
										? t(locale, 'orgApp.users.storeAccess.request')
										: t(locale, 'orgApp.users.storeAccess.manage')}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={user.is_active ? 'secondary' : 'outline'}>
										{user.is_active
											? t(locale, 'orgApp.users.status.active')
											: t(locale, 'orgApp.users.status.inactive')}
									</Badge>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={5} class="h-32 text-center text-muted-foreground">
									{t(locale, 'orgApp.users.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

{#if canManage}
	<EditSheet
		bind:open={createOpen}
		title={t(locale, 'orgApp.users.create.title')}
		description={t(locale, 'orgApp.users.create.description')}
	>
		<form id="create-org-user-form" method="POST" action="?/createUser" class="grid gap-4">
			<div class="flex flex-col gap-2">
				<Label for="display_name">{t(locale, 'orgApp.users.field.name')}</Label>
				<Input id="display_name" name="display_name" required />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="email">{t(locale, 'orgApp.users.field.email')}</Label>
				<Input id="email" name="email" type="email" required />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="temporary_password">{t(locale, 'orgApp.users.field.password')}</Label>
				<Input
					id="temporary_password"
					name="temporary_password"
					type="password"
					minlength={8}
					autocomplete="new-password"
					required
				/>
				<p class="text-xs text-muted-foreground">
					{t(locale, 'orgApp.users.field.passwordHint')}
				</p>
			</div>
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'orgApp.users.field.role')}</Label>
				<input type="hidden" name="role" value={createRole} />
				<Select.Root type="single" bind:value={createRole}>
					<Select.Trigger class="w-full">{roleLabel(createRole)}</Select.Trigger>
					<Select.Content>
						<Select.Item value="admin" label={roleLabel('admin')} />
						<Select.Item value="viewer" label={roleLabel('viewer')} />
					</Select.Content>
				</Select.Root>
			</div>
		</form>
		{#snippet footer()}
			<Button type="button" variant="outline" onclick={() => (createOpen = false)}>
				{t(locale, 'common.cancel')}
			</Button>
			<Button type="submit" form="create-org-user-form">
				{t(locale, 'orgApp.users.create.submit')}
			</Button>
		{/snippet}
	</EditSheet>
{/if}
