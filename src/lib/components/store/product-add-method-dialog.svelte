<script lang="ts">
	import KeyboardIcon from '@lucide/svelte/icons/keyboard';
	import ScanLineIcon from '@lucide/svelte/icons/scan-line';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { t, type Locale } from '$lib/i18n';

	let {
		open = $bindable(false),
		locale,
		onManual,
		onScan
	}: {
		open?: boolean;
		locale: Locale;
		onManual: () => void;
		onScan: () => void;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{t(locale, 'storeApp.products.add')}</Dialog.Title>
			<Dialog.Description>{t(locale, 'storeApp.products.addMethodDescription')}</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-3">
			<Button
				variant="outline"
				class="h-auto justify-start gap-3 px-4 py-4 text-start"
				onclick={() => {
					open = false;
					onManual();
				}}
			>
				<span class="rounded-md bg-muted p-2">
					<KeyboardIcon class="size-5" />
				</span>
				<span class="flex flex-col gap-0.5">
					<span class="font-medium">{t(locale, 'storeApp.products.addManual')}</span>
					<span class="text-xs font-normal text-muted-foreground">
						{t(locale, 'storeApp.products.addManualHint')}
					</span>
				</span>
			</Button>

			<Button
				variant="outline"
				class="h-auto justify-start gap-3 px-4 py-4 text-start"
				onclick={() => {
					open = false;
					onScan();
				}}
			>
				<span class="rounded-md bg-muted p-2">
					<ScanLineIcon class="size-5" />
				</span>
				<span class="flex flex-col gap-0.5">
					<span class="font-medium">{t(locale, 'storeApp.products.addScan')}</span>
					<span class="text-xs font-normal text-muted-foreground">
						{t(locale, 'storeApp.products.addScanHint')}
					</span>
				</span>
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
