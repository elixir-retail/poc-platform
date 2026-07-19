<script lang="ts">
	import type { Component } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale, type MessageKey } from '$lib/i18n';

	let {
		icon: Icon,
		titleKey,
		descriptionKey,
		locale,
		skeletonKey = 'orgApp.skeleton'
	}: {
		icon: Component;
		titleKey: MessageKey;
		descriptionKey: MessageKey;
		locale: Locale;
		skeletonKey?: MessageKey;
	} = $props();
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<Icon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">{t(locale, titleKey)}</h1>
		</div>
		<p class="text-sm text-muted-foreground">{t(locale, descriptionKey)}</p>
	</div>
	<Card.Root>
		<Card.Content class="flex min-h-48 items-center justify-center p-6">
			<p class="max-w-md text-center text-sm text-muted-foreground">
				{t(locale, skeletonKey)}
			</p>
		</Card.Content>
	</Card.Root>
</div>
