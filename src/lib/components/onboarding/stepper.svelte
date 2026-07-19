<script lang="ts">
	import type { Component } from 'svelte';
	import { cn } from '$lib/utils.js';

	type StepItem<T extends string> = {
		value: T;
		label: string;
		icon: Component;
	};

	let {
		steps,
		active,
		onSelect
	}: {
		steps: StepItem<string>[];
		active: string;
		onSelect: (value: string) => void;
	} = $props();

	const activeIndex = $derived(steps.findIndex((step) => step.value === active));
</script>

<nav aria-label="Steps" class="overflow-x-auto">
	<ol class="flex w-max min-w-full items-start">
		{#each steps as step, index (step.value)}
			{@const isActive = step.value === active}
			{@const isVisited = index < activeIndex}
			<li class={cn('flex items-start', index > 0 && 'flex-1')}>
				{#if index > 0}
					<div
						class={cn(
							'mt-4.5 h-px min-w-6 flex-1 transition-colors',
							index <= activeIndex ? 'bg-primary' : 'bg-border'
						)}
						aria-hidden="true"
					></div>
				{/if}
				<button
					type="button"
					onclick={() => onSelect(step.value)}
					aria-current={isActive ? 'step' : undefined}
					class="group flex flex-col items-center gap-1.5 rounded-md px-3 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<span
						class={cn(
							'flex size-9 items-center justify-center rounded-full border transition-colors',
							isActive
								? 'border-primary bg-primary text-primary-foreground'
								: isVisited
									? 'border-primary/40 bg-primary/10 text-primary'
									: 'border-border bg-background text-muted-foreground group-hover:border-primary/40 group-hover:text-foreground'
						)}
					>
						<step.icon class="size-4" />
					</span>
					<span
						class={cn(
							'text-xs whitespace-nowrap transition-colors',
							isActive
								? 'font-medium text-foreground'
								: 'text-muted-foreground group-hover:text-foreground'
						)}
					>
						{step.label}
					</span>
				</button>
			</li>
		{/each}
	</ol>
</nav>
