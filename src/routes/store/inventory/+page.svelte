<script lang="ts">
	import BoxesIcon from '@lucide/svelte/icons/boxes';
	import PackageXIcon from '@lucide/svelte/icons/package-x';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import StoreIcon from '@lucide/svelte/icons/store';
	import InventoryEditSheet from '$lib/components/store/inventory-edit-sheet.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { StoreInventory } from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const totalUnits = $derived(
		data.inventory.reduce((total, entry) => total + entry.quantity_on_hand, 0)
	);
	const outOfStockCount = $derived(
		data.inventory.filter((entry) => entry.quantity_on_hand === 0).length
	);

	let editOpen = $state(false);
	let selectedEntry = $state<StoreInventory | null>(null);

	$effect(() => {
		if (form?.success) editOpen = false;
	});

	function openEdit(entry: StoreInventory) {
		selectedEntry = entry;
		editOpen = true;
	}

	function stockStatus(entry: StoreInventory) {
		return entry.quantity_on_hand === 0 ? 'out' : 'inStock';
	}

	function formatLastCounted(value: string | null) {
		return value
			? new Intl.DateTimeFormat(undefined, {
					dateStyle: 'medium',
					timeStyle: 'short'
				}).format(new Date(value))
			: '—';
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<StoreIcon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{t(locale, 'storeApp.inventory.title')}
			</h1>
		</div>
		<p class="text-sm text-muted-foreground">{t(locale, 'storeApp.inventory.description')}</p>
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

	<div class="grid gap-3 sm:grid-cols-2">
		<Card.Root>
			<Card.Content class="flex items-center gap-3 p-4">
				<div class="rounded-md bg-muted p-2"><BoxesIcon class="size-5" /></div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'storeApp.inventory.totalUnits')}</p>
					<p class="text-2xl font-semibold">{totalUnits}</p>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content class="flex items-center gap-3 p-4">
				<div class="rounded-md bg-muted p-2"><PackageXIcon class="size-5" /></div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'storeApp.inventory.outOfStock')}</p>
					<p class="text-2xl font-semibold">{outOfStockCount}</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'storeApp.inventory.title')}</Card.Title>
			<Card.Description>
				{t(locale, 'storeApp.inventory.items', { count: data.inventory.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-3 md:hidden">
				{#each data.inventory as entry (entry.store_inventory_uuid)}
					<article class="flex flex-col gap-3 rounded-lg border border-border p-4">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="font-medium">{entry.product.name}</p>
								<p class="font-mono text-xs text-muted-foreground">{entry.product.sku}</p>
							</div>
							<Badge variant={stockStatus(entry) === 'out' ? 'destructive' : 'secondary'}>
								{t(locale, `storeApp.inventory.${stockStatus(entry)}` as MessageKey)}
							</Badge>
						</div>
						<div class="grid grid-cols-2 gap-3 text-sm">
							<div>
								<p class="text-xs text-muted-foreground">
									{t(locale, 'storeApp.inventory.onHand')}
								</p>
								<p class="text-xl font-semibold">{entry.quantity_on_hand}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">
									{t(locale, 'storeApp.inventory.location')}
								</p>
								<p>{entry.storage_location ?? '—'}</p>
							</div>
						</div>
						<Button variant="outline" size="sm" onclick={() => openEdit(entry)}>
							<PencilIcon class="size-4" />
							{t(locale, 'storeApp.inventory.edit')}
						</Button>
					</article>
				{:else}
					<p class="py-10 text-center text-sm text-muted-foreground">
						{t(locale, 'storeApp.inventory.empty')}
					</p>
				{/each}
			</div>

			<div class="hidden overflow-x-auto md:block">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t(locale, 'storeApp.inventory.product')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.products.sku')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.inventory.onHand')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.inventory.status')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.inventory.location')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.inventory.lastCounted')}</Table.Head>
							<Table.Head class="text-end">{t(locale, 'storeApp.inventory.actions')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.inventory as entry (entry.store_inventory_uuid)}
							<Table.Row>
								<Table.Cell>
									<p class="font-medium">{entry.product.name}</p>
									<p class="text-xs text-muted-foreground">
										{entry.product.brand ?? entry.product.product_category}
									</p>
								</Table.Cell>
								<Table.Cell class="font-mono text-xs">{entry.product.sku}</Table.Cell>
								<Table.Cell class="text-lg font-semibold">{entry.quantity_on_hand}</Table.Cell>
								<Table.Cell>
									<Badge variant={stockStatus(entry) === 'out' ? 'destructive' : 'secondary'}>
										{t(locale, `storeApp.inventory.${stockStatus(entry)}` as MessageKey)}
									</Badge>
								</Table.Cell>
								<Table.Cell>{entry.storage_location ?? '—'}</Table.Cell>
								<Table.Cell class="text-sm whitespace-nowrap text-muted-foreground">
									{formatLastCounted(entry.last_counted_at)}
								</Table.Cell>
								<Table.Cell class="text-end">
									<Button
										variant="ghost"
										size="icon"
										onclick={() => openEdit(entry)}
										aria-label={t(locale, 'storeApp.inventory.edit')}
									>
										<PencilIcon class="size-4" />
									</Button>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={7} class="h-32 text-center text-muted-foreground">
									{t(locale, 'storeApp.inventory.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<InventoryEditSheet bind:open={editOpen} entry={selectedEntry} {locale} />
