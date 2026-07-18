<script lang="ts">
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import UsersIcon from '@lucide/svelte/icons/users';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale } from '$lib/i18n';
	import type { PlatformUserListItem } from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const isAdmin = $derived(data.profile?.role === 'platform_admin');

	let createOpen = $state(false);
	let editOpen = $state(false);
	let activeUser = $state<PlatformUserListItem | null>(null);
	let createRole = $state('platform_op');
	let editRole = $state('platform_op');
	let editActive = $state(true);

	function roleLabel(role: string) {
		return role === 'platform_admin'
			? t(locale, 'users.role.admin')
			: t(locale, 'users.role.operator');
	}

	function openEdit(user: PlatformUserListItem) {
		activeUser = user;
		editRole = user.role;
		editActive = user.is_active;
		editOpen = true;
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<UsersIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">
					{t(locale, 'users.title')}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground">{t(locale, 'users.description')}</p>
			<p class="text-xs text-muted-foreground">
				{isAdmin ? t(locale, 'users.roleHint.admin') : t(locale, 'users.roleHint.operator')}
			</p>
		</div>
		<Button onclick={() => (createOpen = true)}>
			<PlusIcon />
			{t(locale, 'users.create.button')}
		</Button>
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
			<Card.Title>{t(locale, 'users.listTitle')}</Card.Title>
			<Card.Description>
				{t(locale, 'users.records', { count: data.users.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'users.column.name')}</Table.Head>
							<Table.Head>{t(locale, 'users.column.email')}</Table.Head>
							<Table.Head>{t(locale, 'users.column.role')}</Table.Head>
							<Table.Head>{t(locale, 'users.column.status')}</Table.Head>
							<Table.Head>{t(locale, 'users.column.created')}</Table.Head>
							{#if isAdmin}
								<Table.Head>{t(locale, 'common.edit')}</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.users as user (user.profile_uuid)}
							<Table.Row>
								<Table.Cell class="ps-6 font-medium">{user.display_name}</Table.Cell>
								<Table.Cell>{user.email}</Table.Cell>
								<Table.Cell>
									<Badge variant={user.role === 'platform_admin' ? 'default' : 'secondary'}>
										{roleLabel(user.role)}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={user.is_active ? 'secondary' : 'destructive'}>
										{user.is_active
											? t(locale, 'users.status.active')
											: t(locale, 'users.status.inactive')}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-sm text-muted-foreground">
									{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
										new Date(user.created_at)
									)}
								</Table.Cell>
								{#if isAdmin}
									<Table.Cell>
										<Button size="sm" variant="outline" onclick={() => openEdit(user)}>
											{t(locale, 'common.edit')}
										</Button>
									</Table.Cell>
								{/if}
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell
									colspan={isAdmin ? 6 : 5}
									class="h-28 text-center text-muted-foreground"
								>
									{t(locale, 'users.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<EditSheet
	bind:open={createOpen}
	title={t(locale, 'users.create.title')}
	description={t(locale, 'users.create.description')}
>
	<form id="create-user-form" method="POST" action="?/createUser" class="grid gap-4">
		<div class="flex flex-col gap-2">
			<Label for="display_name">{t(locale, 'users.column.name')}</Label>
			<Input id="display_name" name="display_name" required />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="email">{t(locale, 'users.column.email')}</Label>
			<Input id="email" name="email" type="email" required />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="temporary_password">{t(locale, 'users.create.password')}</Label>
			<Input
				id="temporary_password"
				name="temporary_password"
				type="password"
				minlength={8}
				required
			/>
			<p class="text-xs text-muted-foreground">{t(locale, 'users.create.passwordHint')}</p>
		</div>
		{#if isAdmin}
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'users.column.role')}</Label>
				<input type="hidden" name="role" value={createRole} />
				<Select.Root type="single" bind:value={createRole}>
					<Select.Trigger class="w-full">{roleLabel(createRole)}</Select.Trigger>
					<Select.Content>
						<Select.Item value="platform_op" label={t(locale, 'users.role.operator')} />
						<Select.Item value="platform_admin" label={t(locale, 'users.role.admin')} />
					</Select.Content>
				</Select.Root>
			</div>
		{:else}
			<input type="hidden" name="role" value="platform_op" />
			<p class="text-sm text-muted-foreground">{t(locale, 'users.create.operatorOnly')}</p>
		{/if}
	</form>
	{#snippet footer()}
		<Button type="button" variant="outline" onclick={() => (createOpen = false)}>
			{t(locale, 'common.cancel')}
		</Button>
		<Button type="submit" form="create-user-form">{t(locale, 'users.create.submit')}</Button>
	{/snippet}
</EditSheet>

{#if isAdmin && activeUser}
	<EditSheet
		bind:open={editOpen}
		title={t(locale, 'users.edit.title')}
		description={activeUser.email}
	>
		<form id="update-user-form" method="POST" action="?/updateUser" class="grid gap-4">
			<input type="hidden" name="profile_uuid" value={activeUser.profile_uuid} />
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'users.column.role')}</Label>
				<input type="hidden" name="role" value={editRole} />
				<Select.Root type="single" bind:value={editRole}>
					<Select.Trigger class="w-full">{roleLabel(editRole)}</Select.Trigger>
					<Select.Content>
						<Select.Item value="platform_op" label={t(locale, 'users.role.operator')} />
						<Select.Item value="platform_admin" label={t(locale, 'users.role.admin')} />
					</Select.Content>
				</Select.Root>
			</div>
			<label class="flex items-center gap-2 text-sm">
				<input type="hidden" name="is_active" value={editActive ? 'true' : 'false'} />
				<input type="checkbox" bind:checked={editActive} />
				{t(locale, 'users.edit.active')}
			</label>
		</form>
		{#snippet footer()}
			<Button type="button" variant="outline" onclick={() => (editOpen = false)}>
				{t(locale, 'common.cancel')}
			</Button>
			<Button type="submit" form="update-user-form">{t(locale, 'common.save')}</Button>
		{/snippet}
	</EditSheet>
{/if}
