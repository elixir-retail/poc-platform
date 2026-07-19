<script lang="ts">
	import { resolve } from '$app/paths';
	import Clock3Icon from '@lucide/svelte/icons/clock-3';
	import MailIcon from '@lucide/svelte/icons/mail';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import StoreIcon from '@lucide/svelte/icons/store';
	import StoreEditSheet from '$lib/components/organisation/store-edit-sheet.svelte';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type {
		GoodsCharacteristic,
		RetailCategory,
		ServiceCategory,
		ServiceModel,
		StoreBusinessMode
	} from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const store = $derived(data.store);
	const isViewer = $derived(data.organisationContext.membership.role === 'viewer');
	const pendingRequest = $derived(
		data.storeRequests.find((request) => request.status === 'pending') ?? null
	);

	let editOpen = $state(false);

	$effect(() => {
		if (form?.success) editOpen = false;
	});

	function modeLabel(mode: StoreBusinessMode) {
		return t(locale, `orgApp.stores.mode.${mode}` as MessageKey);
	}

	function retailLabel(category: RetailCategory) {
		return t(locale, `orgApp.stores.retail.${category}` as MessageKey);
	}

	function serviceLabel(category: ServiceCategory) {
		return t(locale, `orgApp.stores.service.${category}` as MessageKey);
	}

	function goodsLabel(characteristic: GoodsCharacteristic) {
		return t(locale, `orgApp.stores.goods.${characteristic}` as MessageKey);
	}

	function serviceModelLabel(model: ServiceModel) {
		return t(locale, `orgApp.stores.serviceModel.${model}` as MessageKey);
	}
</script>

<div class="flex flex-col gap-6">
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href={resolve('/org/stores')}>
					{t(locale, 'orgApp.stores.title')}
				</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{store.store_code}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<StoreIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">{store.name}</h1>
				<Badge variant={store.status === 'active' ? 'secondary' : 'outline'}>
					{t(locale, `orgApp.stores.status.${store.status}` as MessageKey)}
				</Badge>
			</div>
			<p class="font-mono text-xs text-muted-foreground">{store.store_code}</p>
			{#if store.description}
				<p class="max-w-3xl text-sm text-muted-foreground">{store.description}</p>
			{/if}
			{#if isViewer}
				<p class="text-xs text-muted-foreground">
					{t(locale, 'orgApp.stores.detail.viewerHint')}
				</p>
			{/if}
		</div>
		<Button onclick={() => (editOpen = true)} disabled={isViewer && pendingRequest !== null}>
			<PencilIcon />
			{isViewer
				? t(locale, 'orgApp.stores.detail.requestChanges')
				: t(locale, 'orgApp.stores.detail.edit')}
		</Button>
	</div>

	{#if form?.message}
		<div
			class="rounded-lg border border-border bg-card px-4 py-3 text-sm"
			class:text-destructive={form.success === false}
			role="status"
		>
			{form.message}
		</div>
	{/if}

	{#if pendingRequest}
		<div
			class="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm"
			role="status"
		>
			<Clock3Icon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
			<div>
				<p class="font-medium">{t(locale, 'orgApp.stores.detail.pendingTitle')}</p>
				<p class="text-muted-foreground">
					{t(locale, 'orgApp.stores.detail.pendingDescription')}
				</p>
			</div>
		</div>
	{/if}

	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.stores.section.classification')}</Card.Title>
				<Card.Description>{t(locale, 'orgApp.stores.detail.classificationHint')}</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-4 text-sm">
				<div>
					<p class="text-xs text-muted-foreground">
						{t(locale, 'orgApp.stores.field.businessMode')}
					</p>
					<p class="font-medium">{modeLabel(store.business_mode)}</p>
				</div>
				{#if store.retail_category}
					<div>
						<p class="text-xs text-muted-foreground">
							{t(locale, 'orgApp.stores.field.retailCategory')}
						</p>
						<p class="font-medium">{retailLabel(store.retail_category)}</p>
					</div>
				{/if}
				{#if store.service_category}
					<div>
						<p class="text-xs text-muted-foreground">
							{t(locale, 'orgApp.stores.field.serviceCategory')}
						</p>
						<p class="font-medium">{serviceLabel(store.service_category)}</p>
					</div>
				{/if}
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'orgApp.stores.field.currency')}</p>
					<p class="font-medium">{store.currency_code}</p>
				</div>
				{#if store.goods_characteristics.length > 0}
					<div>
						<p class="mb-2 text-xs text-muted-foreground">
							{t(locale, 'orgApp.stores.field.goodsCharacteristics')}
						</p>
						<div class="flex flex-wrap gap-2">
							{#each store.goods_characteristics as characteristic (characteristic)}
								<Badge variant="outline">{goodsLabel(characteristic)}</Badge>
							{/each}
						</div>
					</div>
				{/if}
				{#if store.service_models.length > 0}
					<div>
						<p class="mb-2 text-xs text-muted-foreground">
							{t(locale, 'orgApp.stores.field.serviceModels')}
						</p>
						<div class="flex flex-wrap gap-2">
							{#each store.service_models as model (model)}
								<Badge variant="outline">{serviceModelLabel(model)}</Badge>
							{/each}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.stores.section.location')}</Card.Title>
				<Card.Description>{t(locale, 'orgApp.stores.detail.locationHint')}</Card.Description>
			</Card.Header>
			<Card.Content class="flex items-start gap-3 text-sm">
				<MapPinIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
				<div>
					<p class="font-medium">{store.address_line_1 || '—'}</p>
					{#if store.address_line_2}<p>{store.address_line_2}</p>{/if}
					<p>
						{[store.city, store.region, store.postal_code].filter(Boolean).join(', ') || '—'}
					</p>
					<p>{store.country_code || '—'}</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.stores.section.contact')}</Card.Title>
				<Card.Description>{t(locale, 'orgApp.stores.detail.contactHint')}</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-4 text-sm">
				<div class="flex items-center gap-3">
					<MailIcon class="size-4 text-muted-foreground" />
					<span class="break-all">{store.email || '—'}</span>
				</div>
				<div class="flex items-center gap-3">
					<PhoneIcon class="size-4 text-muted-foreground" />
					<span>{store.phone || '—'}</span>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.stores.detail.record')}</Card.Title>
				<Card.Description>{t(locale, 'orgApp.stores.detail.recordHint')}</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-3 text-sm sm:grid-cols-2">
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'orgApp.stores.detail.created')}</p>
					<p class="font-medium">
						{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
							new Date(store.created_at)
						)}
					</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'orgApp.stores.detail.updated')}</p>
					<p class="font-medium">
						{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
							new Date(store.changed_at)
						)}
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	{#if data.storeRequests.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.stores.detail.requestHistory')}</Card.Title>
				<Card.Description>
					{t(locale, 'orgApp.stores.detail.requestHistoryHint')}
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				{#each data.storeRequests as request (request.store_change_request_uuid)}
					<div
						class="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<div>
							<p class="text-sm font-medium">{t(locale, 'orgApp.stores.detail.updateRequest')}</p>
							<p class="text-xs text-muted-foreground">
								{new Intl.DateTimeFormat(undefined, {
									dateStyle: 'medium',
									timeStyle: 'short'
								}).format(new Date(request.created_at))}
							</p>
							{#if request.review_notes}
								<p class="mt-1 text-sm text-muted-foreground">{request.review_notes}</p>
							{/if}
						</div>
						<StatusBadge status={request.status} />
					</div>
				{/each}
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<StoreEditSheet bind:open={editOpen} {store} currencies={data.currencies} {isViewer} {locale} />
