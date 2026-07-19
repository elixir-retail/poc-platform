<script lang="ts">
	import BarcodeIcon from '@lucide/svelte/icons/barcode';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import BarcodeLabelPreview from '$lib/components/store/barcode-label-preview.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { type BarcodeFormat } from '$lib/barcodes';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const locale = $derived(data.locale as Locale);
	const storeName = $derived(data.storeContext.store.name);
	const currencyCode = $derived(data.storeContext.store.currency_code);

	const formats: BarcodeFormat[] = ['CODE128', 'EAN13', 'EAN8', 'CODE39', 'UPC'];
	const labelSizes = [
		{
			id: '50x30',
			labelKey: 'storeApp.barcodes.size.50x30' as MessageKey,
			widthMm: 50,
			heightMm: 30
		},
		{
			id: '40x30',
			labelKey: 'storeApp.barcodes.size.40x30' as MessageKey,
			widthMm: 40,
			heightMm: 30
		},
		{
			id: '58x40',
			labelKey: 'storeApp.barcodes.size.58x40' as MessageKey,
			widthMm: 58,
			heightMm: 40
		}
	] as const;

	let selectedProductUuid = $state('custom');
	let barcodeValue = $state('');
	let format = $state<BarcodeFormat>('CODE128');
	let labelSizeId = $state<(typeof labelSizes)[number]['id']>('50x30');
	let copies = $state(1);
	let productName = $state('');
	let sku = $state('');
	let priceCents = $state<number | null>(null);

	const selectedSize = $derived(
		labelSizes.find((size) => size.id === labelSizeId) ?? labelSizes[0]
	);
	const activeProducts = $derived(data.products.filter((product) => product.status === 'active'));
	const canPrint = $derived(barcodeValue.trim().length > 0);
	const priceLabel = $derived(
		priceCents === null
			? ''
			: new Intl.NumberFormat(undefined, {
					style: 'currency',
					currency: currencyCode
				}).format(priceCents / 100)
	);
	const productTriggerLabel = $derived.by(() => {
		if (selectedProductUuid === 'custom') {
			return t(locale, 'storeApp.barcodes.customValue');
		}
		const product = activeProducts.find((item) => item.store_product_uuid === selectedProductUuid);
		return product
			? `${product.name} · ${product.sku}`
			: t(locale, 'storeApp.barcodes.chooseProduct');
	});

	$effect(() => {
		if (selectedProductUuid === 'custom') return;
		const product = activeProducts.find((item) => item.store_product_uuid === selectedProductUuid);
		if (!product) return;

		productName = product.name;
		sku = product.sku;
		priceCents = product.price_cents;

		if (product.gtin && /^\d{13}$/.test(product.gtin)) {
			barcodeValue = product.gtin;
			format = 'EAN13';
		} else if (product.gtin && /^\d{8}$/.test(product.gtin)) {
			barcodeValue = product.gtin;
			format = 'EAN8';
		} else if (product.gtin && /^\d{12}$/.test(product.gtin)) {
			barcodeValue = product.gtin;
			format = 'UPC';
		} else if (product.gtin) {
			barcodeValue = product.gtin;
			format = 'CODE128';
		} else {
			barcodeValue = product.sku;
			format = 'CODE128';
		}
	});

	function formatLabel(value: BarcodeFormat) {
		return t(locale, `storeApp.barcodes.format.${value}` as MessageKey);
	}

	function sendToStickerPrinter() {
		if (!canPrint) return;
		window.print();
	}
</script>

<svelte:head>
	<title>{t(locale, 'storeApp.barcodes.title')}</title>
	{@html `<style>@media print { @page { size: ${selectedSize.widthMm}mm ${selectedSize.heightMm}mm; margin: 0; } }</style>`}
</svelte:head>

<div class="barcode-studio flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<BarcodeIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">
					{t(locale, 'storeApp.barcodes.title')}
				</h1>
			</div>
			<p class="max-w-2xl text-sm text-muted-foreground">
				{t(locale, 'storeApp.barcodes.description')}
			</p>
		</div>
		<Button class="print:hidden" disabled={!canPrint} onclick={sendToStickerPrinter}>
			<PrinterIcon class="size-4" />
			{t(locale, 'storeApp.barcodes.sendToPrinter')}
		</Button>
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
		<Card.Root class="print:hidden">
			<Card.Header>
				<Card.Title>{t(locale, 'storeApp.barcodes.configure')}</Card.Title>
				<Card.Description>{t(locale, 'storeApp.barcodes.configureHint')}</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-5">
				<div class="flex flex-col gap-2">
					<Label>{t(locale, 'storeApp.barcodes.product')}</Label>
					<input type="hidden" value={selectedProductUuid} />
					<Select.Root type="single" bind:value={selectedProductUuid}>
						<Select.Trigger class="w-full">{productTriggerLabel}</Select.Trigger>
						<Select.Content>
							<Select.Item value="custom" label={t(locale, 'storeApp.barcodes.customValue')} />
							{#each activeProducts as product (product.store_product_uuid)}
								<Select.Item
									value={product.store_product_uuid}
									label={`${product.name} · ${product.sku}`}
								/>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				{#if selectedProductUuid === 'custom'}
					<div class="flex flex-col gap-2">
						<Label for="label_product_name">{t(locale, 'storeApp.barcodes.productName')}</Label>
						<Input
							id="label_product_name"
							bind:value={productName}
							placeholder={t(locale, 'storeApp.barcodes.productNamePlaceholder')}
							maxlength={80}
						/>
					</div>
				{/if}

				<div class="flex flex-col gap-2">
					<Label for="barcode_value">{t(locale, 'storeApp.barcodes.value')}</Label>
					<Input
						id="barcode_value"
						bind:value={barcodeValue}
						placeholder={t(locale, 'storeApp.barcodes.valuePlaceholder')}
						class="font-mono"
						maxlength={64}
					/>
					<p class="text-xs text-muted-foreground">{t(locale, 'storeApp.barcodes.valueHint')}</p>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-2">
						<Label>{t(locale, 'storeApp.barcodes.format')}</Label>
						<input type="hidden" value={format} />
						<Select.Root type="single" bind:value={format}>
							<Select.Trigger class="w-full">{formatLabel(format)}</Select.Trigger>
							<Select.Content>
								{#each formats as item (item)}
									<Select.Item value={item} label={formatLabel(item)} />
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="flex flex-col gap-2">
						<Label>{t(locale, 'storeApp.barcodes.labelSize')}</Label>
						<input type="hidden" value={labelSizeId} />
						<Select.Root type="single" bind:value={labelSizeId}>
							<Select.Trigger class="w-full">
								{t(locale, selectedSize.labelKey)}
							</Select.Trigger>
							<Select.Content>
								{#each labelSizes as size (size.id)}
									<Select.Item value={size.id} label={t(locale, size.labelKey)} />
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-2">
						<Label for="barcode_copies">{t(locale, 'storeApp.barcodes.copies')}</Label>
						<Input
							id="barcode_copies"
							type="number"
							min="1"
							max="50"
							step="1"
							inputmode="numeric"
							bind:value={copies}
						/>
					</div>
					{#if selectedProductUuid === 'custom'}
						<div class="flex flex-col gap-2">
							<Label for="barcode_sku">{t(locale, 'storeApp.products.sku')}</Label>
							<Input id="barcode_sku" class="font-mono" bind:value={sku} maxlength={50} />
						</div>
					{/if}
				</div>

				<div class="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
					{t(locale, 'storeApp.barcodes.printerHint')}
				</div>

				<Button class="w-full" disabled={!canPrint} onclick={sendToStickerPrinter}>
					<PrinterIcon class="size-4" />
					{t(locale, 'storeApp.barcodes.sendToPrinter')}
				</Button>
			</Card.Content>
		</Card.Root>

		<div class="flex flex-col gap-4">
			<Card.Root class="print:hidden">
				<Card.Header>
					<Card.Title>{t(locale, 'storeApp.barcodes.preview')}</Card.Title>
					<Card.Description>{t(locale, 'storeApp.barcodes.previewHint')}</Card.Description>
				</Card.Header>
				<Card.Content>
					<div
						class="flex min-h-72 items-center justify-center rounded-xl border border-border p-6"
						style="background:
							radial-gradient(circle at top, color-mix(in oklab, var(--color-muted) 85%, transparent), transparent 58%),
							linear-gradient(180deg, color-mix(in oklab, var(--color-card) 90%, var(--color-muted)), var(--color-card));"
					>
						<div class="origin-center scale-125 sm:scale-150">
							<BarcodeLabelPreview
								value={barcodeValue}
								{format}
								productName={productName || t(locale, 'storeApp.barcodes.untitled')}
								{priceLabel}
								{sku}
								{storeName}
								widthMm={selectedSize.widthMm}
								heightMm={selectedSize.heightMm}
								barcodeId="barcode-preview-svg"
							/>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<div id="barcode-print-root" class="hidden print:block">
				{#each Array.from( { length: Math.min(Math.max(Number(copies) || 1, 1), 50) } ) as _, index (index)}
					<div class="barcode-print-page">
						<BarcodeLabelPreview
							value={barcodeValue}
							{format}
							productName={productName || t(locale, 'storeApp.barcodes.untitled')}
							{priceLabel}
							{sku}
							{storeName}
							widthMm={selectedSize.widthMm}
							heightMm={selectedSize.heightMm}
							barcodeId={`barcode-print-svg-${index}`}
						/>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	@media print {
		:global(body *) {
			visibility: hidden !important;
		}

		:global(#barcode-print-root),
		:global(#barcode-print-root *) {
			visibility: visible !important;
		}

		:global(#barcode-print-root) {
			display: block !important;
			position: absolute;
			inset: 0;
			margin: 0;
			padding: 0;
			background: white;
		}

		:global(.barcode-print-page) {
			page-break-after: always;
			break-after: page;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100vh;
		}

		:global(.barcode-print-page:last-child) {
			page-break-after: auto;
			break-after: auto;
		}

		@page {
			margin: 0;
			size: auto;
		}
	}
</style>
