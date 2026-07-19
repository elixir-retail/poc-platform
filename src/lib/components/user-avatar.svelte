<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';

	let {
		name,
		avatarUrl = null,
		size = 'default',
		class: className
	}: {
		name: string;
		avatarUrl?: string | null;
		size?: 'default' | 'sm' | 'lg';
		class?: string;
	} = $props();

	const initials = $derived(
		name
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);
</script>

<Avatar.Root {size} class={className}>
	{#if avatarUrl}
		<Avatar.Image src={avatarUrl} alt={name} />
	{/if}
	<Avatar.Fallback>{initials}</Avatar.Fallback>
</Avatar.Root>
