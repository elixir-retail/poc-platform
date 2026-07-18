<script lang="ts">
	import { t, type Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const locale = $derived(data.locale as Locale);
	const welcome = $derived(
		data.user?.email
			? t(locale, 'dashboard.welcome', { email: data.user.email })
			: t(locale, 'dashboard.welcomeAnonymous')
	);
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-semibold tracking-tight text-foreground">
		{t(locale, 'dashboard.title')}
	</h1>
	<p class="text-sm text-muted-foreground">{welcome}</p>
</div>
