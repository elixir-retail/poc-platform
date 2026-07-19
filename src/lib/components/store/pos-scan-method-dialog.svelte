<script lang="ts">
	import CameraIcon from '@lucide/svelte/icons/camera';
	import ScanBarcodeIcon from '@lucide/svelte/icons/scan-barcode';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t, type Locale } from '$lib/i18n';

	let {
		open = $bindable(false),
		locale,
		onCamera,
		onScanner
	}: {
		open?: boolean;
		locale: Locale;
		onCamera: () => void;
		onScanner: () => void;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="gap-5 sm:max-w-md">
		<Dialog.Header class="pe-8">
			<Dialog.Title>{t(locale, 'storeApp.pos.scanTitle')}</Dialog.Title>
			<Dialog.Description>{t(locale, 'storeApp.pos.scanMethodDescription')}</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-3">
			<button
				type="button"
				class="flex w-full items-start gap-3 rounded-xl border border-border bg-background px-4 py-4 text-start transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				onclick={() => {
					open = false;
					onCamera();
				}}
			>
				<span class="rounded-md bg-muted p-2 text-foreground">
					<CameraIcon class="size-5" />
				</span>
				<span class="min-w-0 flex-1 space-y-1">
					<span class="block text-sm font-medium text-foreground">
						{t(locale, 'storeApp.pos.scanCamera')}
					</span>
					<span class="block text-xs leading-relaxed whitespace-normal text-muted-foreground">
						{t(locale, 'storeApp.pos.scanCameraHint')}
					</span>
				</span>
			</button>

			<button
				type="button"
				class="flex w-full items-start gap-3 rounded-xl border border-border bg-background px-4 py-4 text-start transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				onclick={() => {
					open = false;
					onScanner();
				}}
			>
				<span class="rounded-md bg-muted p-2 text-foreground">
					<ScanBarcodeIcon class="size-5" />
				</span>
				<span class="min-w-0 flex-1 space-y-1">
					<span class="block text-sm font-medium text-foreground">
						{t(locale, 'storeApp.pos.scanHandheld')}
					</span>
					<span class="block text-xs leading-relaxed whitespace-normal text-muted-foreground">
						{t(locale, 'storeApp.pos.scanHandheldHint')}
					</span>
				</span>
			</button>
		</div>
	</Dialog.Content>
</Dialog.Root>
