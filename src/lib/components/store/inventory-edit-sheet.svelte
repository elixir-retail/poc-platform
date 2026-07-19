<script lang="ts">
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { t, type Locale } from '$lib/i18n';
	import type { StoreInventory } from '$lib/types/platform';

	let {
		open = $bindable(false),
		entry,
		locale
	}: {
		open?: boolean;
		entry: StoreInventory | null;
		locale: Locale;
	} = $props();
</script>

<EditSheet
	bind:open
	title={t(locale, 'storeApp.inventory.editTitle')}
	description={entry
		? t(locale, 'storeApp.inventory.editDescription', { name: entry.product.name })
		: undefined}
>
	{#if entry}
		<form id="edit-inventory-form" method="POST" action="?/updateInventory" class="grid gap-5">
			<input type="hidden" name="store_inventory_uuid" value={entry.store_inventory_uuid} />

			<div class="rounded-lg border border-border bg-muted/40 p-3">
				<p class="font-medium">{entry.product.name}</p>
				<p class="font-mono text-xs text-muted-foreground">{entry.product.sku}</p>
			</div>

			<div class="flex flex-col gap-2">
				<Label for="quantity_on_hand">{t(locale, 'storeApp.inventory.onHand')}</Label>
				<Input
					id="quantity_on_hand"
					name="quantity_on_hand"
					type="number"
					min="0"
					step="1"
					inputmode="numeric"
					value={entry.quantity_on_hand}
					required
				/>
			</div>

			<div class="flex flex-col gap-2">
				<Label for="storage_location">{t(locale, 'storeApp.inventory.location')}</Label>
				<Input
					id="storage_location"
					name="storage_location"
					value={entry.storage_location ?? ''}
					maxlength={120}
				/>
			</div>
		</form>
	{/if}

	{#snippet footer()}
		<Button type="submit" form="edit-inventory-form" class="w-full sm:w-auto" disabled={!entry}>
			{t(locale, 'storeApp.inventory.save')}
		</Button>
	{/snippet}
</EditSheet>
