<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { ButtonVariant } from '$lib/components/ui/button/button.svelte';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel,
		cancelLabel,
		confirmVariant = 'destructive',
		busy = false,
		onConfirm
	}: {
		open?: boolean;
		title: string;
		description: string;
		confirmLabel: string;
		cancelLabel: string;
		confirmVariant?: ButtonVariant;
		busy?: boolean;
		onConfirm: () => void | Promise<void>;
	} = $props();

	async function handleConfirm() {
		await onConfirm();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content showCloseButton={false} class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="gap-2 sm:justify-end">
			<Button type="button" variant="outline" disabled={busy} onclick={() => (open = false)}>
				{cancelLabel}
			</Button>
			<Button
				type="button"
				variant={confirmVariant}
				disabled={busy}
				onclick={() => void handleConfirm()}
			>
				{confirmLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
