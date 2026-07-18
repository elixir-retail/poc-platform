<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		description,
		children,
		footer
	}: {
		open?: boolean;
		title: string;
		description?: string;
		children: Snippet;
		footer?: Snippet;
	} = $props();
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="w-full gap-0 p-0 sm:max-w-lg">
		<Sheet.Header class="border-b border-border px-6 py-4">
			<Sheet.Title>{title}</Sheet.Title>
			{#if description}
				<Sheet.Description>{description}</Sheet.Description>
			{/if}
		</Sheet.Header>
		<div class="flex-1 overflow-y-auto px-6 py-4">
			{@render children()}
		</div>
		{#if footer}
			<Sheet.Footer class="border-t border-border px-6 py-4">
				{@render footer()}
			</Sheet.Footer>
		{/if}
	</Sheet.Content>
</Sheet.Root>
