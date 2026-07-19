<script lang="ts">
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import StoreIcon from '@lucide/svelte/icons/store';
	import UsersIcon from '@lucide/svelte/icons/users';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);
	const context = $derived(data.organisationContext);
	const modules = [
		{ key: 'orgApp.users' as MessageKey, icon: UsersIcon },
		{ key: 'orgApp.stores' as MessageKey, icon: StoreIcon },
		{ key: 'orgApp.transactions' as MessageKey, icon: ReceiptIcon },
		{ key: 'orgApp.billing' as MessageKey, icon: CreditCardIcon },
		{ key: 'orgApp.profile' as MessageKey, icon: Building2Icon }
	];
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<h1 class="text-2xl font-semibold tracking-tight text-foreground">
			{t(locale, 'orgApp.dashboard.title')}
		</h1>
		<p class="text-sm text-muted-foreground">{t(locale, 'orgApp.dashboard.description')}</p>
	</div>
	<Card.Root>
		<Card.Header>
			<Card.Title>
				{context.organisation.trade_name ?? context.organisation.legal_name}
			</Card.Title>
			<Card.Description>
				{context.organisation.org_code} · {context.organisation.contact_email}
			</Card.Description>
		</Card.Header>
		<Card.Content class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
			{#each modules as module (module.key)}
				<div class="flex items-center gap-3 rounded-lg border border-border p-4">
					<module.icon class="size-5 text-muted-foreground" />
					<span class="text-sm font-medium">{t(locale, module.key)}</span>
				</div>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
