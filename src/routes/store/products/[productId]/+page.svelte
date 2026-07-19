<script lang="ts">
	import { resolve } from '$app/paths';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PackageIcon from '@lucide/svelte/icons/package';
	import ProductFormSheet from '$lib/components/store/product-create-sheet.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { ProductType } from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const product = $derived(data.product);
	let editOpen = $state(false);

	$effect(() => {
		if (form?.success) editOpen = false;
	});

	function typeLabel(type: ProductType) {
		return t(locale, `storeApp.products.type.${type}` as MessageKey);
	}

	function formatPrice() {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: product.currency_code
		}).format(product.price_cents / 100);
	}

	function formatDate(value: string | null) {
		return value
			? new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(
					new Date(`${value}T00:00:00Z`)
				)
			: '—';
	}
</script>

<div class="flex flex-col gap-6">
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href={resolve('/store/products')}>
					{t(locale, 'storeApp.products.back')}
				</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{product.sku}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex flex-wrap items-center gap-2">
				<PackageIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">{product.name}</h1>
				<Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
					{t(locale, `storeApp.products.status.${product.status}` as MessageKey)}
				</Badge>
			</div>
			<p class="font-mono text-sm text-muted-foreground">{product.sku}</p>
			{#if product.description}
				<p class="max-w-3xl text-sm text-muted-foreground">{product.description}</p>
			{/if}
		</div>
		<Button onclick={() => (editOpen = true)}>
			<PencilIcon class="size-4" />
			{t(locale, 'storeApp.products.edit')}
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

	<div class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'storeApp.products.identity')}</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="grid gap-4 text-sm sm:grid-cols-2">
					<div>
						<dt class="text-xs text-muted-foreground">{t(locale, 'storeApp.products.sku')}</dt>
						<dd class="font-mono font-medium">{product.sku}</dd>
					</div>
					<div>
						<dt class="text-xs text-muted-foreground">
							{t(locale, 'storeApp.products.brand')}
						</dt>
						<dd class="font-medium">{product.brand ?? '—'}</dd>
					</div>
					<div>
						<dt class="text-xs text-muted-foreground">
							{t(locale, 'storeApp.products.type')}
						</dt>
						<dd class="font-medium">{typeLabel(product.product_type)}</dd>
					</div>
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
						<dd class="font-medium">{formatPrice()}</dd>
					</div>
					<div>
						<dt class="text-xs text-muted-foreground">
							{t(locale, 'storeApp.products.status')}
						</dt>
						<dd class="font-medium">
							{t(locale, `storeApp.products.status.${product.status}` as MessageKey)}
						</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'storeApp.products.traceability')}</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="grid gap-4 text-sm sm:grid-cols-2">
					<div>
						<dt class="text-xs text-muted-foreground">
							{t(locale, 'storeApp.products.packageNumber')}
						</dt>
						<dd class="font-mono font-medium">{product.package_number ?? '—'}</dd>
					</div>
					<div>
						<dt class="text-xs text-muted-foreground">
							{t(locale, 'storeApp.products.gtin')}
						</dt>
						<dd class="font-mono font-medium">{product.gtin ?? '—'}</dd>
					</div>
					<div>
						<dt class="text-xs text-muted-foreground">
							{t(locale, 'storeApp.products.batchLot')}
						</dt>
						<dd class="font-mono font-medium">{product.batch_lot_number ?? '—'}</dd>
					</div>
					<div>
						<dt class="text-xs text-muted-foreground">
							{t(locale, 'storeApp.products.manufactured')}
						</dt>
						<dd class="font-medium">{formatDate(product.manufacturing_date)}</dd>
					</div>
					<div>
						<dt class="text-xs text-muted-foreground">
							{t(locale, 'storeApp.products.expires')}
						</dt>
						<dd class="font-medium">{formatDate(product.expiry_date)}</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>

		{#if product.product_type === 'electronics' || product.product_type === 'mobile_phone' || product.product_type === 'laptop' || product.imei || product.manufacturer_serial_number || product.tracking_number}
			<Card.Root class="lg:col-span-2">
				<Card.Header>
					<Card.Title>{t(locale, 'storeApp.products.electronics')}</Card.Title>
				</Card.Header>
				<Card.Content>
					<dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
						<div>
							<dt class="text-xs text-muted-foreground">
								{t(locale, 'storeApp.products.warranty')}
							</dt>
							<dd class="font-medium">
								{product.warranty_months === null ? '—' : `${product.warranty_months} months`}
							</dd>
						</div>
						<div>
							<dt class="text-xs text-muted-foreground">
								{t(locale, 'storeApp.products.serial')}
							</dt>
							<dd class="font-mono font-medium">
								{product.manufacturer_serial_number ?? '—'}
							</dd>
						</div>
						<div>
							<dt class="text-xs text-muted-foreground">
								{t(locale, 'storeApp.products.imei')}
							</dt>
							<dd class="font-mono font-medium">{product.imei ?? '—'}</dd>
						</div>
						<div>
							<dt class="text-xs text-muted-foreground">
								{t(locale, 'storeApp.products.tracking')}
							</dt>
							<dd class="font-mono font-medium">{product.tracking_number ?? '—'}</dd>
						</div>
					</dl>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>

<ProductFormSheet
	bind:open={editOpen}
	{locale}
	currencyCode={data.storeContext.store.currency_code}
	{product}
/>
