<script lang="ts">
	import { page } from '$app/state';
	import { t, type Locale } from '$lib/i18n';

	const locale = $derived(page.data.locale as Locale);
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-2xl font-semibold tracking-tight text-foreground">{t(locale, 'users.title')}</h1>
	<p class="text-sm text-muted-foreground">{t(locale, 'users.description')}</p>
</div>
