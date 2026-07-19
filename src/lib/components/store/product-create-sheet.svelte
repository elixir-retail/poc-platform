<script lang="ts">
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import { PRODUCT_TYPES } from '$lib/schemas/products';
	import type { ProductType, StoreProduct } from '$lib/types/platform';

	let {
		open = $bindable(false),
		locale,
		currencyCode,
		product = null,
		defaults = null,
		scannedCode = null
	}: {
		open?: boolean;
		locale: Locale;
		currencyCode: string;
		product?: StoreProduct | null;
		defaults?: { sku?: string | null; gtin?: string | null } | null;
		scannedCode?: string | null;
	} = $props();

	let productType = $state<ProductType>('standard');
	let status = $state<'active' | 'inactive'>('active');
	let sku = $state('');
	let gtin = $state('');
	const isEdit = $derived(product !== null);
	const formId = $derived(isEdit ? 'edit-product-form' : 'create-product-form');

	$effect(() => {
		if (open) {
			productType = product?.product_type ?? 'standard';
			status = product?.status ?? 'active';
			sku = product?.sku ?? defaults?.sku ?? '';
			gtin = product?.gtin ?? defaults?.gtin ?? '';
		}
	});

	function typeLabel(type: ProductType) {
		return t(locale, `storeApp.products.type.${type}` as MessageKey);
	}
</script>

<EditSheet
	bind:open
	title={t(locale, isEdit ? 'storeApp.products.editTitle' : 'storeApp.products.addTitle')}
	description={t(
		locale,
		isEdit ? 'storeApp.products.editDescription' : 'storeApp.products.addDescription'
	)}
>
	<form
		id={formId}
		method="POST"
		action={isEdit ? '?/updateProduct' : '?/createProduct'}
		class="grid gap-6"
	>
		{#if !isEdit && scannedCode}
			<div class="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
				<p class="text-muted-foreground">{t(locale, 'storeApp.products.scannedCode')}</p>
				<p class="mt-1 font-mono text-sm font-medium text-foreground">{scannedCode}</p>
				{#if defaults?.gtin}
					<p class="mt-1 text-xs text-muted-foreground">
						{t(locale, 'storeApp.products.scannedGtinWired')}
					</p>
				{/if}
			</div>
		{:else if !isEdit && (defaults?.gtin || defaults?.sku)}
			<p
				class="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
			>
				{t(locale, 'storeApp.products.scannedCode')}
			</p>
		{/if}
		<section class="grid gap-4">
			<h3 class="text-sm font-semibold">{t(locale, 'storeApp.products.identity')}</h3>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-2 sm:col-span-2">
					<Label for="product_name">{t(locale, 'storeApp.products.name')}</Label>
					<Input
						id="product_name"
						name="name"
						value={product?.name ?? ''}
						maxlength={120}
						required
					/>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="product_sku">{t(locale, 'storeApp.products.sku')}</Label>
					<Input id="product_sku" name="sku" bind:value={sku} maxlength={50} required />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="product_brand">{t(locale, 'storeApp.products.brand')}</Label>
					<Input id="product_brand" name="brand" value={product?.brand ?? ''} maxlength={80} />
				</div>
				<div class="flex flex-col gap-2 sm:col-span-2">
					<Label for="product_description">
						{t(locale, 'storeApp.products.descriptionField')}
					</Label>
					<Textarea
						id="product_description"
						name="description"
						value={product?.description ?? ''}
						maxlength={500}
					/>
				</div>
			</div>
		</section>

		<section class="grid gap-4 border-t border-border pt-5">
			<h3 class="text-sm font-semibold">{t(locale, 'storeApp.products.commerce')}</h3>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label>{t(locale, 'storeApp.products.type')}</Label>
					<input type="hidden" name="product_type" value={productType} />
					<Select.Root type="single" bind:value={productType}>
						<Select.Trigger class="w-full">{typeLabel(productType)}</Select.Trigger>
						<Select.Content>
							{#each PRODUCT_TYPES as type (type)}
								<Select.Item value={type} label={typeLabel(type)} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="product_category">{t(locale, 'storeApp.products.category')}</Label>
					<Input
						id="product_category"
						name="product_category"
						value={product?.product_category ?? ''}
						placeholder="Grocery, Audio, Mobile Phones"
						maxlength={80}
						required
					/>
				</div>
				<div class="flex flex-col gap-2 sm:col-span-2">
					<Label for="product_price">
						{t(locale, 'storeApp.products.price')} ({currencyCode})
					</Label>
					<Input
						id="product_price"
						name="price"
						type="number"
						min="0"
						step="0.01"
						inputmode="decimal"
						value={product ? product.price_cents / 100 : ''}
						required
					/>
				</div>
				{#if !isEdit}
					<div class="flex flex-col gap-2 sm:col-span-2">
						<Label for="product_quantity_on_hand">
							{t(locale, 'storeApp.products.quantityOnHand')}
						</Label>
						<Input
							id="product_quantity_on_hand"
							name="quantity_on_hand"
							type="number"
							min="0"
							step="1"
							inputmode="numeric"
							value="0"
							required
						/>
						<p class="text-xs text-muted-foreground">
							{t(locale, 'storeApp.products.quantityOnHandHint')}
						</p>
					</div>
				{/if}
				{#if isEdit}
					<div class="flex flex-col gap-2 sm:col-span-2">
						<Label>{t(locale, 'storeApp.products.status')}</Label>
						<input type="hidden" name="status" value={status} />
						<Select.Root type="single" bind:value={status}>
							<Select.Trigger class="w-full">
								{t(locale, `storeApp.products.status.${status}` as MessageKey)}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="active" label={t(locale, 'storeApp.products.status.active')} />
								<Select.Item
									value="inactive"
									label={t(locale, 'storeApp.products.status.inactive')}
								/>
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
			</div>
		</section>

		<section class="grid gap-4 border-t border-border pt-5">
			<h3 class="text-sm font-semibold">{t(locale, 'storeApp.products.traceability')}</h3>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label for="product_package_number">
						{t(locale, 'storeApp.products.packageNumber')}
					</Label>
					<Input
						id="product_package_number"
						name="package_number"
						value={product?.package_number ?? ''}
						maxlength={80}
					/>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="product_gtin">{t(locale, 'storeApp.products.gtin')}</Label>
					<Input
						id="product_gtin"
						name="gtin"
						bind:value={gtin}
						inputmode="numeric"
						pattern={'[0-9]{8,14}'}
						maxlength={14}
					/>
					<p class="text-xs text-muted-foreground">
						{t(locale, 'storeApp.products.gtinHint')}
					</p>
				</div>
				<div class="flex flex-col gap-2 sm:col-span-2">
					<Label for="product_batch">{t(locale, 'storeApp.products.batchLot')}</Label>
					<Input
						id="product_batch"
						name="batch_lot_number"
						value={product?.batch_lot_number ?? ''}
						maxlength={20}
					/>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="product_manufacturing_date">
						{t(locale, 'storeApp.products.manufactured')}
					</Label>
					<Input
						id="product_manufacturing_date"
						name="manufacturing_date"
						type="date"
						value={product?.manufacturing_date ?? ''}
					/>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="product_expiry_date">{t(locale, 'storeApp.products.expires')}</Label>
					<Input
						id="product_expiry_date"
						name="expiry_date"
						type="date"
						value={product?.expiry_date ?? ''}
					/>
				</div>
			</div>
		</section>

		{#if productType === 'electronics' || productType === 'mobile_phone' || productType === 'laptop'}
			<section class="grid gap-4 border-t border-border pt-5">
				<h3 class="text-sm font-semibold">{t(locale, 'storeApp.products.electronics')}</h3>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-2">
						<Label for="product_warranty">{t(locale, 'storeApp.products.warranty')}</Label>
						<Input
							id="product_warranty"
							name="warranty_months"
							type="number"
							min="0"
							max="240"
							inputmode="numeric"
							value={product?.warranty_months ?? ''}
						/>
					</div>
					<div class="flex flex-col gap-2">
						<Label for="product_serial">{t(locale, 'storeApp.products.serial')}</Label>
						<Input
							id="product_serial"
							name="manufacturer_serial_number"
							value={product?.manufacturer_serial_number ?? ''}
							maxlength={80}
						/>
					</div>
					{#if productType === 'mobile_phone'}
						<div class="flex flex-col gap-2 sm:col-span-2">
							<Label for="product_imei">{t(locale, 'storeApp.products.imei')}</Label>
							<Input
								id="product_imei"
								name="imei"
								value={product?.imei ?? ''}
								inputmode="numeric"
								pattern="[0-9]{15}"
								maxlength={15}
								required
							/>
							<p class="text-xs text-muted-foreground">
								{t(locale, 'storeApp.products.imeiHint')}
							</p>
						</div>
					{/if}
					<div class="flex flex-col gap-2 sm:col-span-2">
						<Label for="product_tracking">{t(locale, 'storeApp.products.tracking')}</Label>
						<Input
							id="product_tracking"
							name="tracking_number"
							value={product?.tracking_number ?? ''}
							maxlength={80}
						/>
					</div>
				</div>
			</section>
		{/if}
	</form>

	{#snippet footer()}
		<Button type="submit" form={formId} class="w-full sm:w-auto">
			{t(locale, isEdit ? 'storeApp.products.save' : 'storeApp.products.add')}
		</Button>
	{/snippet}
</EditSheet>
