<script lang="ts">
	import { browser } from '$app/environment';
	import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t, type Locale } from '$lib/i18n';

	let {
		open = $bindable(false),
		locale,
		onScan,
		title,
		description,
		readerId = 'product-barcode-reader'
	}: {
		open?: boolean;
		locale: Locale;
		onScan: (code: string) => void;
		title?: string;
		description?: string;
		readerId?: string;
	} = $props();

	let scanner: Html5Qrcode | null = null;
	let starting = $state(false);
	let errorMessage = $state<string | null>(null);

	async function stopScanner() {
		if (!scanner) return;
		const active = scanner;
		scanner = null;
		try {
			if (active.isScanning) {
				await active.stop();
			}
			active.clear();
		} catch {
			// Camera may already be stopped when the dialog closes.
		}
	}

	async function startScanner() {
		if (!browser || starting || scanner?.isScanning) return;

		starting = true;
		errorMessage = null;

		try {
			await stopScanner();
			scanner = new Html5Qrcode(readerId, {
				formatsToSupport: [
					Html5QrcodeSupportedFormats.QR_CODE,
					Html5QrcodeSupportedFormats.EAN_13,
					Html5QrcodeSupportedFormats.EAN_8,
					Html5QrcodeSupportedFormats.UPC_A,
					Html5QrcodeSupportedFormats.UPC_E,
					Html5QrcodeSupportedFormats.CODE_128,
					Html5QrcodeSupportedFormats.CODE_39,
					Html5QrcodeSupportedFormats.ITF
				],
				verbose: false
			});

			await scanner.start(
				{ facingMode: 'environment' },
				{
					fps: 10,
					qrbox: (viewfinderWidth, viewfinderHeight) => {
						const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75);
						return { width: edge, height: edge };
					},
					aspectRatio: 1
				},
				async (decodedText) => {
					const code = decodedText.trim();
					if (!code) return;
					await stopScanner();
					open = false;
					onScan(code);
				},
				() => undefined
			);
		} catch (err) {
			errorMessage =
				err instanceof Error ? err.message : t(locale, 'storeApp.products.scanCameraError');
			await stopScanner();
		} finally {
			starting = false;
		}
	}

	$effect(() => {
		if (!open) {
			void stopScanner();
			errorMessage = null;
			return;
		}

		const timer = window.setTimeout(() => {
			void startScanner();
		}, 150);

		return () => {
			window.clearTimeout(timer);
			void stopScanner();
		};
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg" showCloseButton={!starting}>
		<Dialog.Header>
			<Dialog.Title>{title ?? t(locale, 'storeApp.products.scanTitle')}</Dialog.Title>
			<Dialog.Description>
				{description ?? t(locale, 'storeApp.products.scanDescription')}
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-3">
			<div
				id={readerId}
				class="overflow-hidden rounded-lg border border-border bg-muted/40 [&_video]:max-h-80 [&_video]:w-full [&_video]:object-cover"
			></div>

			{#if starting}
				<p class="text-sm text-muted-foreground">{t(locale, 'storeApp.products.scanStarting')}</p>
			{:else if errorMessage}
				<p class="text-sm text-destructive">{errorMessage}</p>
				<Button variant="outline" onclick={() => void startScanner()}>
					{t(locale, 'storeApp.products.scanRetry')}
				</Button>
			{:else}
				<p class="text-sm text-muted-foreground">{t(locale, 'storeApp.products.scanHint')}</p>
			{/if}
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					open = false;
				}}
			>
				{t(locale, 'common.cancel')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
