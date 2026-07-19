<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
	import CustomerFormSheet from '$lib/components/store/customer-form-sheet.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale } from '$lib/i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const locale = $derived(data.locale as Locale);
	let createOpen = $state(false);
	let search = $state('');
	let deleteConfirmOpen = $state(false);
	let pendingDeleteCustomerUuid = $state<string | null>(null);

	const filtered = $derived.by(() => {
		const query = search.trim().toLowerCase();
		if (!query) return data.customers;
		return data.customers.filter((customer) =>
			[customer.full_name, customer.phone, customer.email, customer.city]
				.filter(Boolean)
				.some((value) => value!.toLowerCase().includes(query))
		);
	});

	$effect(() => {
		if (form?.success) createOpen = false;
	});

	function openCustomer(customerUuid: string) {
		goto(resolve('/store/customers/[customerId]', { customerId: customerUuid }));
	}

	function requestDeleteCustomer(customerUuid: string) {
		pendingDeleteCustomerUuid = customerUuid;
		deleteConfirmOpen = true;
	}

	function confirmDeleteCustomer() {
		if (!pendingDeleteCustomerUuid) return;
		(
			document.getElementById(
				`delete-customer-${pendingDeleteCustomerUuid}`
			) as HTMLFormElement | null
		)?.requestSubmit();
		pendingDeleteCustomerUuid = null;
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<ShoppingBagIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight">
					{t(locale, 'storeApp.customers.title')}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground">{t(locale, 'storeApp.customers.description')}</p>
		</div>
		<Button onclick={() => (createOpen = true)}>
			<PlusIcon class="size-4" />
			{t(locale, 'storeApp.customers.add')}
		</Button>
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
		<Card.Header class="gap-4">
			<div>
				<Card.Title>{t(locale, 'storeApp.customers.list')}</Card.Title>
				<Card.Description>
					{t(locale, 'storeApp.customers.count', { count: data.customers.length })}
				</Card.Description>
			</div>
			<div class="relative max-w-md">
				<SearchIcon
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={search}
					class="ps-9"
					placeholder={t(locale, 'storeApp.customers.search')}
				/>
			</div>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'storeApp.customers.fullName')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.customers.phone')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.customers.email')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.customers.city')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.customers.status')}</Table.Head>
							{#if data.canManage}
								<Table.Head class="pe-6 text-end">{t(locale, 'storeApp.customers.actions')}</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filtered as customer (customer.store_customer_uuid)}
							<Table.Row
								class="cursor-pointer"
								onclick={() => openCustomer(customer.store_customer_uuid)}
							>
								<Table.Cell class="ps-6 font-medium">{customer.full_name}</Table.Cell>
								<Table.Cell class="font-mono text-sm">{customer.phone}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{customer.email ?? '—'}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{customer.city ?? '—'}</Table.Cell>
								<Table.Cell>
									<Badge variant={customer.status === 'active' ? 'secondary' : 'outline'}>
										{t(locale, `storeApp.customers.status.${customer.status}`)}
									</Badge>
								</Table.Cell>
								{#if data.canManage}
									<Table.Cell class="pe-6 text-end">
										<form
											id={`delete-customer-${customer.store_customer_uuid}`}
											method="POST"
											action="?/deleteCustomer"
										>
											<input
												type="hidden"
												name="store_customer_uuid"
												value={customer.store_customer_uuid}
											/>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												class="text-destructive"
												onclick={(event) => {
													event.stopPropagation();
													requestDeleteCustomer(customer.store_customer_uuid);
												}}
											>
												<Trash2Icon class="size-4" />
												{t(locale, 'storeApp.customers.delete')}
											</Button>
										</form>
									</Table.Cell>
								{/if}
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell
									colspan={data.canManage ? 6 : 5}
									class="h-32 text-center text-muted-foreground"
								>
									{t(locale, 'storeApp.customers.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<CustomerFormSheet bind:open={createOpen} {locale} />

{#if data.canManage}
	<ConfirmDialog
		bind:open={deleteConfirmOpen}
		title={t(locale, 'storeApp.customers.deleteTitle')}
		description={t(locale, 'storeApp.customers.deleteConfirm')}
		confirmLabel={t(locale, 'common.delete')}
		cancelLabel={t(locale, 'common.cancel')}
		onConfirm={confirmDeleteCustomer}
	/>
{/if}
