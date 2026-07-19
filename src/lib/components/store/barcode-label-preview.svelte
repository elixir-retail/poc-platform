<script lang="ts">
	import { browser } from '$app/environment';
	import JsBarcode from 'jsbarcode';
	import { normalizeBarcodeValue, type BarcodeFormat } from '$lib/barcodes';

	let {
		value,
		format,
		productName,
		priceLabel,
		sku,
		storeName,
		widthMm,
		heightMm,
		barcodeId = 'barcode-svg'
	}: {
		value: string;
		format: BarcodeFormat;
		productName: string;
		priceLabel: string;
		sku: string;
		storeName: string;
		widthMm: number;
		heightMm: number;
		barcodeId?: string;
	} = $props();

	let errorMessage = $state<string | null>(null);
	let correctedNotice = $state<string | null>(null);
	let svgEl = $state<SVGSVGElement | null>(null);

	const normalized = $derived(normalizeBarcodeValue(value, format));

	$effect(() => {
		if (!browser || !svgEl) return;

		while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
		errorMessage = null;
		correctedNotice = null;

		if (!value.trim()) return;

		if (normalized.error || !normalized.value) {
			errorMessage = normalized.error;
			return;
		}

		let valid = true;
		try {
			JsBarcode(svgEl, normalized.value, {
				format,
				displayValue: true,
				font: 'JetBrains Mono, ui-monospace, monospace',
				fontSize: 12,
				height: Math.max(36, Math.round(heightMm * 1.6)),
				width: format === 'EAN13' || format === 'UPC' ? 1.6 : 2,
				margin: 4,
				background: '#ffffff',
				lineColor: '#111827',
				textMargin: 4,
				valid: (isValid) => {
					valid = isValid;
				}
			});

			if (!valid) {
				errorMessage = 'This value is not valid for the selected barcode format.';
				while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
				return;
			}

			if (normalized.corrected && normalized.value !== value.trim()) {
				correctedNotice = `Check digit adjusted to ${normalized.value} for a valid ${format} code.`;
			}
		} catch {
			errorMessage = 'Unable to render this barcode. Check the value and format.';
			while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
		}
	});
</script>

<div
	class="barcode-label relative overflow-hidden rounded-lg border border-dashed border-border bg-white text-slate-900 shadow-sm"
	style={`width: ${widthMm}mm; height: ${heightMm}mm;`}
>
	<div
		class="pointer-events-none absolute inset-0 opacity-[0.04]"
		style="background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0); background-size: 8px 8px;"
	></div>

	<div class="relative flex h-full flex-col justify-between gap-1 p-2.5">
		<div class="flex items-start justify-between gap-2">
			<div class="min-w-0">
				<p class="truncate text-[8px] font-medium tracking-[0.18em] text-slate-500 uppercase">
					{storeName}
				</p>
				<p class="mt-0.5 line-clamp-2 text-[11px] leading-tight font-semibold text-slate-900">
					{productName || 'Product label'}
				</p>
			</div>
			{#if priceLabel}
				<p class="shrink-0 text-[12px] font-bold tracking-tight text-slate-900">{priceLabel}</p>
			{/if}
		</div>

		<div class="flex min-h-0 flex-1 items-center justify-center">
			<svg
				bind:this={svgEl}
				id={barcodeId}
				class="max-h-full max-w-full"
				class:hidden={!value.trim() || !!errorMessage}
			></svg>
			{#if !value.trim()}
				<p class="px-2 text-center text-[10px] text-slate-400">
					Enter a code to preview the sticker
				</p>
			{:else if errorMessage}
				<p class="px-2 text-center text-[10px] text-slate-400">{errorMessage}</p>
			{/if}
		</div>

		{#if sku}
			<p class="truncate text-center font-mono text-[8px] tracking-wide text-slate-500">
				{sku}
			</p>
		{/if}
	</div>
</div>

{#if errorMessage && value.trim()}
	<p class="mt-2 text-sm text-destructive">{errorMessage}</p>
{:else if correctedNotice}
	<p class="mt-2 text-sm text-muted-foreground">{correctedNotice}</p>
{/if}
