<script lang="ts">
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import StoreIcon from '@lucide/svelte/icons/store';
	import WifiIcon from '@lucide/svelte/icons/wifi';
	import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale } from '$lib/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const locale = $derived(data.locale as Locale);
	const completedTotal = $derived(
		data.transactions
			.filter((transaction) => transaction.status === 'completed')
			.reduce((sum, transaction) => sum + transaction.gross_amount_cents, 0)
	);
	const onlineCount = $derived(
		data.transactions.filter((transaction) => transaction.channel === 'online').length
	);
	const offlineCount = $derived(
		data.transactions.filter((transaction) => transaction.channel === 'offline').length
	);

	function formatAmount(amountCents: number) {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: data.storeContext.store.currency_code
		}).format(amountCents / 100);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<StoreIcon class="size-5 text-muted-foreground" />
			<h1 class="text-2xl font-semibold tracking-tight text-foreground">
				{data.storeContext.store.name}
			</h1>
		</div>
		<p class="text-sm text-muted-foreground">
			{data.storeContext.store.store_code} ·
			{data.storeContext.organisation.trade_name ?? data.storeContext.organisation.legal_name}
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.dashboard.transactions')}</Card.Description>
				<Card.Title class="flex items-center gap-2">
					<ReceiptIcon class="size-4 text-muted-foreground" />
					{data.transactions.length}
				</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'storeApp.dashboard.completedValue')}</Card.Description>
				<Card.Title>{formatAmount(completedTotal)}</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'orgApp.transactions.online')}</Card.Description>
				<Card.Title class="flex items-center gap-2">
					<WifiIcon class="size-4 text-muted-foreground" />
					{onlineCount}
				</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'orgApp.transactions.offline')}</Card.Description>
				<Card.Title class="flex items-center gap-2">
					<WifiOffIcon class="size-4 text-muted-foreground" />
					{offlineCount}
				</Card.Title>
			</Card.Header>
		</Card.Root>
	</div>
</div>
