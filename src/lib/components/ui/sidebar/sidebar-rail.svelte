<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { useSidebar } from './context.svelte.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		toggleLabel = 'Toggle Sidebar',
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
		toggleLabel?: string;
	} = $props();

	const sidebar = useSidebar();
</script>

<button
	bind:this={ref}
	data-sidebar="rail"
	data-slot="sidebar-rail"
	aria-label={toggleLabel}
	tabindex={-1}
	onclick={sidebar.toggle}
	title={toggleLabel}
	class={cn(
		'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex',
		'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar',
		'[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
		'[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</button>

<style>
	/* Cursor rules live here so Tailwind doesn't flag mutually exclusive cursor-* utilities. */
	:global([data-side='left'] [data-slot='sidebar-rail']) {
		cursor: w-resize;
	}

	:global([data-side='right'] [data-slot='sidebar-rail']) {
		cursor: e-resize;
	}

	:global([data-side='left'][data-state='collapsed'] [data-slot='sidebar-rail']) {
		cursor: e-resize;
	}

	:global([data-side='right'][data-state='collapsed'] [data-slot='sidebar-rail']) {
		cursor: w-resize;
	}
</style>
