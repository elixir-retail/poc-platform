<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
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
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const locale = $derived(data.locale as Locale);
	let createOpen = $state(false);
	let createRole = $state('cashier');
	let deleteConfirmOpen = $state(false);
	let pendingDeleteUserUuid = $state<string | null>(null);

	$effect(() => {
		if (form?.success) createOpen = false;
	});

	function roleLabel(role: string) {
		return t(locale, `storeApp.users.role.${role}` as MessageKey);
	}

	function requestDeleteUser(storeUserUuid: string) {
		pendingDeleteUserUuid = storeUserUuid;
		deleteConfirmOpen = true;
	}

	function confirmDeleteUser() {
		if (!pendingDeleteUserUuid) return;
		(
			document.getElementById(
				`delete-store-user-${pendingDeleteUserUuid}`
			) as HTMLFormElement | null
		)?.requestSubmit();
		pendingDeleteUserUuid = null;
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<UsersIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight">
					{t(locale, 'storeApp.users.title')}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground">{t(locale, 'storeApp.users.description')}</p>
			<p class="text-xs text-muted-foreground">{t(locale, 'storeApp.users.loginHint')}</p>
		</div>
		{#if data.canManage}
			<Button
				onclick={() => {
					createRole = data.staffRoles[0] ?? 'manager';
					createOpen = true;
				}}
			>
				<PlusIcon class="size-4" />
				{t(locale, 'storeApp.users.add')}
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
			<Card.Title>{t(locale, 'storeApp.users.list')}</Card.Title>
			<Card.Description>
				{t(locale, 'storeApp.users.count', { count: data.users.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'storeApp.users.name')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.users.email')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.users.role')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.users.status')}</Table.Head>
							{#if data.canManage}
								<Table.Head class="pe-6 text-end">{t(locale, 'storeApp.users.actions')}</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.users as user (user.store_user_uuid)}
							<Table.Row>
								<Table.Cell class="ps-6">
									<div class="flex items-center gap-3">
										<UserAvatar name={user.display_name} />
										<span class="font-medium">{user.display_name}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="font-mono text-sm">{user.email}</Table.Cell>
								<Table.Cell>
									{#if data.canManage && user.role !== 'root'}
										<form method="POST" action="?/updateRole" class="max-w-44">
											<input
												type="hidden"
												name="store_user_uuid"
												value={user.store_user_uuid}
											/>
											<select
												name="role"
												class="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
												value={user.role}
												onchange={(event) => {
													const formEl = (event.currentTarget as HTMLSelectElement).form;
													formEl?.requestSubmit();
												}}
											>
												{#each data.staffRoles as role (role)}
													<option value={role}>{roleLabel(role)}</option>
												{/each}
											</select>
										</form>
									{:else}
										<Badge variant={user.role === 'root' ? 'default' : 'secondary'}>
											{roleLabel(user.role)}
										</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={user.is_active ? 'secondary' : 'outline'}>
										{user.is_active
											? t(locale, 'storeApp.users.status.active')
											: t(locale, 'storeApp.users.status.inactive')}
									</Badge>
								</Table.Cell>
								{#if data.canManage}
									<Table.Cell class="pe-6 text-end">
										{#if user.role !== 'root'}
											<div class="flex justify-end gap-2">
												{#if user.is_active}
													<form method="POST" action="?/deactivateUser">
														<input
															type="hidden"
															name="store_user_uuid"
															value={user.store_user_uuid}
														/>
														<Button type="submit" size="sm" variant="outline">
															{t(locale, 'storeApp.users.deactivate')}
														</Button>
													</form>
												{/if}
												<form
													id={`delete-store-user-${user.store_user_uuid}`}
													method="POST"
													action="?/deleteUser"
												>
													<input
														type="hidden"
														name="store_user_uuid"
														value={user.store_user_uuid}
													/>
													<Button
														type="button"
														size="sm"
														variant="destructive"
														onclick={() => requestDeleteUser(user.store_user_uuid)}
													>
														<Trash2Icon class="size-4" />
														{t(locale, 'storeApp.users.delete')}
													</Button>
												</form>
											</div>
										{:else}
											<span class="text-xs text-muted-foreground">
												{t(locale, 'storeApp.users.adminProtected')}
											</span>
										{/if}
									</Table.Cell>
								{/if}
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell
									colspan={data.canManage ? 5 : 4}
									class="h-32 text-center text-muted-foreground"
								>
									{t(locale, 'storeApp.users.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

{#if data.canManage}
	<EditSheet
		bind:open={createOpen}
		title={t(locale, 'storeApp.users.addTitle')}
		description={t(locale, 'storeApp.users.addDescription')}
	>
		<form id="create-store-user-form" method="POST" action="?/createUser" class="grid gap-4">
			<div class="flex flex-col gap-2">
				<Label for="store_user_name">{t(locale, 'storeApp.users.name')}</Label>
				<Input id="store_user_name" name="display_name" maxlength={120} required />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="store_user_email">{t(locale, 'storeApp.users.email')}</Label>
				<Input id="store_user_email" name="email" type="email" maxlength={160} required />
			</div>
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'storeApp.users.role')}</Label>
				<input type="hidden" name="role" value={createRole} />
				<Select.Root type="single" bind:value={createRole}>
					<Select.Trigger class="w-full">{roleLabel(createRole)}</Select.Trigger>
					<Select.Content>
						{#each data.staffRoles as role (role)}
							<Select.Item value={role} label={roleLabel(role)} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="store_user_password">{t(locale, 'storeApp.users.temporaryPassword')}</Label>
				<Input
					id="store_user_password"
					name="temporary_password"
					type="password"
					minlength={8}
					maxlength={72}
					required
				/>
				<p class="text-xs text-muted-foreground">{t(locale, 'storeApp.users.passwordHint')}</p>
			</div>
		</form>
		{#snippet footer()}
			<div class="flex w-full justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (createOpen = false)}>
					{t(locale, 'common.cancel')}
				</Button>
				<Button type="submit" form="create-store-user-form">
					{t(locale, 'storeApp.users.add')}
				</Button>
			</div>
		{/snippet}
	</EditSheet>

	<ConfirmDialog
		bind:open={deleteConfirmOpen}
		title={t(locale, 'storeApp.users.deleteTitle')}
		description={t(locale, 'storeApp.users.deleteConfirm')}
		confirmLabel={t(locale, 'common.delete')}
		cancelLabel={t(locale, 'common.cancel')}
		onConfirm={confirmDeleteUser}
	/>
{/if}
