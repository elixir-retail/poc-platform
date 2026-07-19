<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PackageIcon from '@lucide/svelte/icons/package';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ProductAddMethodDialog from '$lib/components/store/product-add-method-dialog.svelte';
	import ProductBarcodeScanner from '$lib/components/store/product-barcode-scanner.svelte';
	import ProductCreateSheet from '$lib/components/store/product-create-sheet.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { ProductType, StoreProduct } from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	let methodOpen = $state(false);
	let scannerOpen = $state(false);
	let createOpen = $state(false);
	let createDefaults = $state<{ sku?: string | null; gtin?: string | null } | null>(null);
	let search = $state('');

	const filteredProducts = $derived.by(() => {
		const query = search.trim().toLowerCase();
		if (!query) return data.products;
		return data.products.filter((product) =>
			[
				product.name,
				product.sku,
				product.brand,
				product.product_category,
				product.gtin,
				product.batch_lot_number,
				product.imei,
				product.manufacturer_serial_number,
				product.tracking_number
			].some((value) => value?.toLowerCase().includes(query))
		);
	});

	$effect(() => {
		if (form?.success) {
			createOpen = false;
			createDefaults = null;
		}
	});

	function typeLabel(type: ProductType) {
		return t(locale, `storeApp.products.type.${type}` as MessageKey);
	}

	function formatPrice(product: StoreProduct) {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: product.currency_code
		}).format(product.price_cents / 100);
	}

	function formatDate(value: string | null) {
		return value
			? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(
					new Date(`${value}T00:00:00Z`)
				)
			: '—';
	}

	function openProduct(productUuid: string) {
		goto(resolve('/store/products/[productId]', { productId: productUuid }));
	}

	function handleProductKeydown(event: KeyboardEvent, productUuid: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openProduct(productUuid);
		}
	}

	function openManualCreate() {
		createDefaults = null;
		createOpen = true;
	}

	function openScanner() {
		scannerOpen = true;
	}

	function handleScannedCode(code: string) {
		const normalized = code.trim();
		const digitsOnly = normalized.replace(/\D/g, '');
		if (/^\d{8,14}$/.test(normalized) || /^\d{8,14}$/.test(digitsOnly)) {
			createDefaults = {
				gtin: /^\d{8,14}$/.test(normalized) ? normalized : digitsOnly
			};
		} else {
			createDefaults = {
				sku: normalized.slice(0, 50).toUpperCase()
			};
		}
		createOpen = true;
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<PackageIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">
					{t(locale, 'storeApp.products.title')}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground">{t(locale, 'storeApp.products.description')}</p>
		</div>
		<Button onclick={() => (methodOpen = true)}>
			<PlusIcon class="size-4" />
			{t(locale, 'storeApp.products.add')}
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
				<Card.Title>{t(locale, 'storeApp.products.title')}</Card.Title>
				<Card.Description>
					{t(locale, 'storeApp.products.count', { count: data.products.length })}
				</Card.Description>
			</div>
			<div class="relative max-w-md">
				<SearchIcon
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={search}
					class="ps-9"
					placeholder={t(locale, 'storeApp.products.search')}
				/>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-3 md:hidden">
				{#each filteredProducts as product (product.store_product_uuid)}
					<div
						class="flex cursor-pointer flex-col gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						role="link"
						tabindex={0}
						onclick={() => openProduct(product.store_product_uuid)}
						onkeydown={(event) => handleProductKeydown(event, product.store_product_uuid)}
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<h2 class="font-semibold text-foreground">{product.name}</h2>
								<p class="font-mono text-xs text-muted-foreground">{product.sku}</p>
								{#if product.brand}
									<p class="mt-1 text-xs text-muted-foreground">{product.brand}</p>
								{/if}
							</div>
							<Badge variant="secondary">{typeLabel(product.product_type)}</Badge>
						</div>

						{#if product.description}
							<p class="text-sm text-muted-foreground">{product.description}</p>
						{/if}

						<dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
							<div>
								<dt class="text-xs text-muted-foreground">
									{t(locale, 'storeApp.products.category')}
								</dt>
								<dd class="font-medium">{product.product_category}</dd>
							</div>
							<div>
								<dt class="text-xs text-muted-foreground">
									{t(locale, 'storeApp.products.price')}
								</dt>
								<dd class="font-medium">{formatPrice(product)}</dd>
							</div>
							<div>
								<dt class="text-xs text-muted-foreground">
									{t(locale, 'storeApp.products.packageNumber')}
								</dt>
								<dd>{product.package_number ?? '—'}</dd>
							</div>
							<div>
								<dt class="text-xs text-muted-foreground">
									{t(locale, 'storeApp.products.batchLot')}
								</dt>
								<dd>{product.batch_lot_number ?? '—'}</dd>
							</div>
							<div>
								<dt class="text-xs text-muted-foreground">
									{t(locale, 'storeApp.products.manufactured')}
								</dt>
								<dd>{formatDate(product.manufacturing_date)}</dd>
							</div>
							<div>
								<dt class="text-xs text-muted-foreground">
									{t(locale, 'storeApp.products.expires')}
								</dt>
								<dd>{formatDate(product.expiry_date)}</dd>
							</div>
						</dl>

						{#if product.gtin || product.imei || product.manufacturer_serial_number || product.tracking_number || product.warranty_months !== null}
							<div class="border-t border-border pt-3 text-xs text-muted-foreground">
								{#if product.gtin}<p>GTIN: <span class="font-mono">{product.gtin}</span></p>{/if}
								{#if product.imei}<p>IMEI: <span class="font-mono">{product.imei}</span></p>{/if}
								{#if product.manufacturer_serial_number}
									<p>Serial: <span class="font-mono">{product.manufacturer_serial_number}</span></p>
								{/if}
								{#if product.tracking_number}
									<p>Tracking: <span class="font-mono">{product.tracking_number}</span></p>
								{/if}
								{#if product.warranty_months !== null}
									<p>{t(locale, 'storeApp.products.warranty')}: {product.warranty_months}</p>
								{/if}
							</div>
						{/if}
					</div>
				{:else}
					<p class="py-10 text-center text-sm text-muted-foreground">
						{t(locale, 'storeApp.products.empty')}
					</p>
				{/each}
			</div>

			<div class="hidden overflow-x-auto md:block">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>{t(locale, 'storeApp.products.name')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.products.sku')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.products.type')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.products.price')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.products.identifiers')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.products.dates')}</Table.Head>
							<Table.Head>{t(locale, 'storeApp.products.warranty')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredProducts as product (product.store_product_uuid)}
							<Table.Row
								class="cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
								role="link"
								tabindex={0}
								onclick={() => openProduct(product.store_product_uuid)}
								onkeydown={(event) => handleProductKeydown(event, product.store_product_uuid)}
							>
								<Table.Cell class="min-w-56 align-top">
									<p class="font-medium">{product.name}</p>
									<p class="text-xs text-muted-foreground">
										{product.brand ?? '—'} · {product.product_category}
									</p>
									{#if product.description}
										<p class="mt-1 max-w-72 text-xs text-muted-foreground">
											{product.description}
										</p>
									{/if}
								</Table.Cell>
								<Table.Cell class="align-top font-mono text-xs font-medium">
									{product.sku}
								</Table.Cell>
								<Table.Cell class="align-top">
									<Badge variant="secondary">{typeLabel(product.product_type)}</Badge>
								</Table.Cell>
								<Table.Cell class="align-top font-medium whitespace-nowrap">
									{formatPrice(product)}
								</Table.Cell>
								<Table.Cell class="min-w-52 align-top font-mono text-xs">
									<p>Package: {product.package_number ?? '—'}</p>
									<p>GTIN: {product.gtin ?? '—'}</p>
									<p>Lot: {product.batch_lot_number ?? '—'}</p>
									{#if product.imei}<p>IMEI: {product.imei}</p>{/if}
									{#if product.manufacturer_serial_number}
										<p>Serial: {product.manufacturer_serial_number}</p>
									{/if}
									{#if product.tracking_number}<p>Tracking: {product.tracking_number}</p>{/if}
								</Table.Cell>
								<Table.Cell class="min-w-40 align-top text-xs">
									<p>Mfg: {formatDate(product.manufacturing_date)}</p>
									<p>Expiry: {formatDate(product.expiry_date)}</p>
								</Table.Cell>
								<Table.Cell class="align-top">
									{product.warranty_months === null ? '—' : `${product.warranty_months} months`}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={7} class="h-32 text-center text-muted-foreground">
									{t(locale, 'storeApp.products.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<ProductAddMethodDialog
	bind:open={methodOpen}
	{locale}
	onManual={openManualCreate}
	onScan={openScanner}
/>
<ProductBarcodeScanner bind:open={scannerOpen} {locale} onScan={handleScannedCode} />
<ProductCreateSheet
	bind:open={createOpen}
	{locale}
	currencyCode={data.storeContext.store.currency_code}
	defaults={createDefaults}
/>
