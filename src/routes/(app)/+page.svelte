<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex flex-col gap-2">
	<h1 class="text-foreground text-2xl font-semibold tracking-tight">Dashboard</h1>
	<p class="text-muted-foreground text-sm">
		Welcome{data.user?.email ? `, ${data.user.email}` : ''}. Merchant onboarding, billing, access,
		and audit views will land here.
	</p>
</div>
