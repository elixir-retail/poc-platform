<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import StoreIcon from '@lucide/svelte/icons/store';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import {
		GOODS_CHARACTERISTICS,
		RETAIL_CATEGORIES,
		SERVICE_CATEGORIES,
		SERVICE_MODELS
	} from '$lib/schemas/stores';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Textarea } from '$lib/components/ui/textarea';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type {
		GoodsCharacteristic,
		RetailCategory,
		ServiceCategory,
		ServiceModel,
		StoreBusinessMode
	} from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';
	import { untrack } from 'svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const canManage = $derived(
		data.organisationContext.membership.role === 'root' ||
			data.organisationContext.membership.role === 'admin'
	);
	const isViewer = $derived(data.organisationContext.membership.role === 'viewer');

	let createOpen = $state(false);
	let businessMode = $state<StoreBusinessMode>('retail');
	let retailCategory = $state<RetailCategory>('general_merchandise');
	let serviceCategory = $state<ServiceCategory>('salon_beauty');
	let goodsCharacteristics = $state<GoodsCharacteristic[]>(['shelf_stable']);
	let serviceModels = $state<ServiceModel[]>(['walk_in']);
	let storeCurrency = $state(
		untrack(
			() =>
				data.currencies.find((currency) => currency.is_primary)?.currency_code ??
				data.organisationContext.organisation.primary_currency_code
		)
	);

	$effect(() => {
		if (businessMode === 'retail') {
			serviceModels = [];
		} else if (serviceModels.length === 0) {
			serviceModels = ['walk_in'];
		}

		if (businessMode === 'service') {
			goodsCharacteristics = [];
		} else if (goodsCharacteristics.length === 0) {
			goodsCharacteristics = ['shelf_stable'];
		}
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

	function requestedStoreName(proposedData: Record<string, unknown>) {
		return typeof proposedData.name === 'string' ? proposedData.name : '—';
	}

	function requesterName(organisationUserUuid: string) {
		return (
			data.organisationUsers.find((user) => user.organisation_user_uuid === organisationUserUuid)
				?.display_name ?? '—'
		);
	}

	function openStore(storeCode: string) {
		goto(resolve('/org/stores/[storeCode]', { storeCode }));
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<StoreIcon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">
					{t(locale, 'orgApp.stores.title')}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground">{t(locale, 'orgApp.stores.description')}</p>
			{#if isViewer}
				<p class="text-xs text-muted-foreground">{t(locale, 'orgApp.stores.viewerHint')}</p>
			{/if}
		</div>
		<Button onclick={() => (createOpen = true)}>
			<PlusIcon />
			{isViewer ? t(locale, 'orgApp.stores.request') : t(locale, 'orgApp.stores.add')}
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

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'orgApp.stores.requests.title')}</Card.Title>
			<Card.Description>
				{t(locale, 'orgApp.stores.requests.description')}
				· {t(locale, 'orgApp.stores.requests.records', { count: data.storeRequests.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'orgApp.stores.column.store')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.stores.requests.submittedBy')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.stores.requests.submittedAt')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.stores.requests.status')}</Table.Head>
							{#if canManage}
								<Table.Head>{t(locale, 'orgApp.stores.requests.actions')}</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.storeRequests as request (request.store_change_request_uuid)}
							<Table.Row>
								<Table.Cell class="ps-6 font-medium">
									{requestedStoreName(request.proposed_data)}
								</Table.Cell>
								<Table.Cell>{requesterName(request.submitted_by_organisation_user_uuid)}</Table.Cell
								>
								<Table.Cell class="text-sm whitespace-nowrap text-muted-foreground">
									{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
										new Date(request.created_at)
									)}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={request.status === 'pending' ? 'secondary' : 'outline'}>
										{t(locale, `orgApp.stores.requests.${request.status}` as MessageKey)}
									</Badge>
								</Table.Cell>
								{#if canManage}
									<Table.Cell>
										{#if request.status === 'pending'}
											<div class="flex items-center gap-2">
												<form method="POST" action="?/reviewStore">
													<input
														type="hidden"
														name="store_change_request_uuid"
														value={request.store_change_request_uuid}
													/>
													<input type="hidden" name="decision" value="approved" />
													<Button type="submit" size="sm">
														{t(locale, 'orgApp.stores.requests.approve')}
													</Button>
												</form>
												<form method="POST" action="?/reviewStore">
													<input
														type="hidden"
														name="store_change_request_uuid"
														value={request.store_change_request_uuid}
													/>
													<input type="hidden" name="decision" value="rejected" />
													<Button type="submit" size="sm" variant="outline">
														{t(locale, 'orgApp.stores.requests.reject')}
													</Button>
												</form>
											</div>
										{:else}
											—
										{/if}
									</Table.Cell>
								{/if}
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell
									colspan={canManage ? 5 : 4}
									class="h-24 text-center text-muted-foreground"
								>
									{t(locale, 'orgApp.stores.requests.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'orgApp.stores.listTitle')}</Card.Title>
			<Card.Description>
				{t(locale, 'orgApp.stores.records', { count: data.stores.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="px-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="ps-6">{t(locale, 'orgApp.stores.column.code')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.stores.column.store')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.stores.column.mode')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.stores.column.currency')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.stores.column.category')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.stores.column.location')}</Table.Head>
							<Table.Head>{t(locale, 'orgApp.stores.column.status')}</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.stores as store (store.store_uuid)}
							<Table.Row
								class="cursor-pointer"
								tabindex={0}
								role="link"
								onclick={() => openStore(store.store_code)}
								onkeydown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										openStore(store.store_code);
									}
								}}
							>
								<Table.Cell class="ps-6 font-mono text-xs font-medium">
									{store.store_code}
								</Table.Cell>
								<Table.Cell>
									<div class="flex min-w-44 flex-col">
										<span class="font-medium">{store.name}</span>
										{#if store.description}
											<span class="line-clamp-1 max-w-64 text-xs text-muted-foreground">
												{store.description}
											</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={store.business_mode === 'hybrid' ? 'default' : 'secondary'}>
										{modeLabel(store.business_mode)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="font-medium">{store.currency_code}</Table.Cell>
								<Table.Cell>
									<div class="flex min-w-48 flex-col gap-1">
										{#if store.retail_category}
											<span class="text-sm">{retailLabel(store.retail_category)}</span>
										{/if}
										{#if store.service_category}
											<span class="text-sm">{serviceLabel(store.service_category)}</span>
										{/if}
										<div class="flex flex-wrap gap-1">
											{#each store.goods_characteristics.slice(0, 2) as characteristic (characteristic)}
												<Badge variant="outline">{goodsLabel(characteristic)}</Badge>
											{/each}
											{#each store.service_models.slice(0, 2) as model (model)}
												<Badge variant="outline">{serviceModelLabel(model)}</Badge>
											{/each}
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex min-w-40 items-start gap-2">
										<MapPinIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
										<div class="flex flex-col text-sm">
											<span>{store.city}{store.region ? `, ${store.region}` : ''}</span>
											<span class="text-xs text-muted-foreground">{store.country_code}</span>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={store.status === 'active' ? 'secondary' : 'outline'}>
										{t(locale, `orgApp.stores.status.${store.status}` as MessageKey)}
									</Badge>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={7} class="h-32 text-center text-muted-foreground">
									{t(locale, 'orgApp.stores.empty')}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

{#if canManage || isViewer}
	<EditSheet
		bind:open={createOpen}
		title={t(locale, 'orgApp.stores.create.title')}
		description={t(locale, 'orgApp.stores.create.description')}
	>
		<form id="create-store-form" method="POST" action="?/createStore" class="grid gap-6">
			<section class="grid gap-4">
				<h3 class="text-sm font-semibold">{t(locale, 'orgApp.stores.section.identity')}</h3>
				<div class="flex flex-col gap-2">
					<Label for="store_name">{t(locale, 'orgApp.stores.field.name')}</Label>
					<Input id="store_name" name="name" required />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="store_description">{t(locale, 'orgApp.stores.field.description')}</Label>
					<Textarea id="store_description" name="description" rows={3} />
				</div>
				<div class="flex flex-col gap-2">
					<Label>{t(locale, 'orgApp.stores.field.currency')}</Label>
					<input type="hidden" name="currency_code" value={storeCurrency} />
					{#if data.currencies.length > 1}
						<Select.Root type="single" bind:value={storeCurrency}>
							<Select.Trigger class="w-full">{storeCurrency}</Select.Trigger>
							<Select.Content>
								{#each data.currencies as currency (currency.currency_code)}
									<Select.Item value={currency.currency_code} label={currency.currency_code} />
								{/each}
							</Select.Content>
						</Select.Root>
					{:else}
						<div class="flex h-9 items-center rounded-md border border-input px-3 text-sm">
							{storeCurrency}
						</div>
						<p class="text-xs text-muted-foreground">
							{t(locale, 'orgApp.stores.currencyHint')}
						</p>
					{/if}
				</div>
			</section>

			<section class="grid gap-4 border-t border-border pt-5">
				<h3 class="text-sm font-semibold">
					{t(locale, 'orgApp.stores.section.classification')}
				</h3>
				<div class="flex flex-col gap-2">
					<Label>{t(locale, 'orgApp.stores.field.businessMode')}</Label>
					<input type="hidden" name="business_mode" value={businessMode} />
					<Select.Root type="single" bind:value={businessMode}>
						<Select.Trigger class="w-full">{modeLabel(businessMode)}</Select.Trigger>
						<Select.Content>
							<Select.Item value="retail" label={modeLabel('retail')} />
							<Select.Item value="service" label={modeLabel('service')} />
							<Select.Item value="hybrid" label={modeLabel('hybrid')} />
						</Select.Content>
					</Select.Root>
				</div>

				{#if businessMode !== 'service'}
					<div class="flex flex-col gap-2">
						<Label>{t(locale, 'orgApp.stores.field.retailCategory')}</Label>
						<input type="hidden" name="retail_category" value={retailCategory} />
						<Select.Root type="single" bind:value={retailCategory}>
							<Select.Trigger class="w-full">{retailLabel(retailCategory)}</Select.Trigger>
							<Select.Content>
								{#each RETAIL_CATEGORIES as category (category)}
									<Select.Item value={category} label={retailLabel(category)} />
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}

				{#if businessMode !== 'retail'}
					<div class="flex flex-col gap-2">
						<Label>{t(locale, 'orgApp.stores.field.serviceCategory')}</Label>
						<input type="hidden" name="service_category" value={serviceCategory} />
						<Select.Root type="single" bind:value={serviceCategory}>
							<Select.Trigger class="w-full">{serviceLabel(serviceCategory)}</Select.Trigger>
							<Select.Content>
								{#each SERVICE_CATEGORIES as category (category)}
									<Select.Item value={category} label={serviceLabel(category)} />
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
			</section>

			{#if businessMode !== 'service'}
				<section class="grid gap-4 border-t border-border pt-5">
					<h3 class="text-sm font-semibold">{t(locale, 'orgApp.stores.section.goods')}</h3>
					<div class="flex flex-col gap-2">
						<Label>{t(locale, 'orgApp.stores.field.goodsCharacteristics')}</Label>
						{#each goodsCharacteristics as characteristic (characteristic)}
							<input type="hidden" name="goods_characteristics" value={characteristic} />
						{/each}
						<Select.Root type="multiple" bind:value={goodsCharacteristics}>
							<Select.Trigger class="w-full">
								{t(locale, 'orgApp.stores.selected', { count: goodsCharacteristics.length })}
							</Select.Trigger>
							<Select.Content>
								{#each GOODS_CHARACTERISTICS as characteristic (characteristic)}
									<Select.Item value={characteristic} label={goodsLabel(characteristic)} />
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</section>
			{/if}

			{#if businessMode !== 'retail'}
				<section class="grid gap-4 border-t border-border pt-5">
					<h3 class="text-sm font-semibold">{t(locale, 'orgApp.stores.section.services')}</h3>
					<div class="flex flex-col gap-2">
						<Label>{t(locale, 'orgApp.stores.field.serviceModels')}</Label>
						{#each serviceModels as model (model)}
							<input type="hidden" name="service_models" value={model} />
						{/each}
						<Select.Root type="multiple" bind:value={serviceModels}>
							<Select.Trigger class="w-full">
								{t(locale, 'orgApp.stores.selected', { count: serviceModels.length })}
							</Select.Trigger>
							<Select.Content>
								{#each SERVICE_MODELS as model (model)}
									<Select.Item value={model} label={serviceModelLabel(model)} />
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</section>
			{/if}

			<section class="grid gap-4 border-t border-border pt-5">
				<h3 class="text-sm font-semibold">{t(locale, 'orgApp.stores.section.location')}</h3>
				<div class="flex flex-col gap-2">
					<Label for="address_line_1">{t(locale, 'orgApp.stores.field.address1')}</Label>
					<Input id="address_line_1" name="address_line_1" required />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="address_line_2">{t(locale, 'orgApp.stores.field.address2')}</Label>
					<Input id="address_line_2" name="address_line_2" />
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-2">
						<Label for="city">{t(locale, 'orgApp.stores.field.city')}</Label>
						<Input id="city" name="city" required />
					</div>
					<div class="flex flex-col gap-2">
						<Label for="region">{t(locale, 'orgApp.stores.field.region')}</Label>
						<Input id="region" name="region" />
					</div>
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-2">
						<Label for="postal_code">{t(locale, 'orgApp.stores.field.postalCode')}</Label>
						<Input id="postal_code" name="postal_code" />
					</div>
					<div class="flex flex-col gap-2">
						<Label for="country_code">{t(locale, 'orgApp.stores.field.country')}</Label>
						<Input
							id="country_code"
							name="country_code"
							maxlength={2}
							value={data.organisationContext.organisation.country_code}
							required
						/>
					</div>
				</div>
			</section>

			<section class="grid gap-4 border-t border-border pt-5">
				<h3 class="text-sm font-semibold">{t(locale, 'orgApp.stores.section.contact')}</h3>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="flex flex-col gap-2">
						<Label for="store_email">{t(locale, 'orgApp.stores.field.email')}</Label>
						<Input id="store_email" name="email" type="email" />
					</div>
					<div class="flex flex-col gap-2">
						<Label for="store_phone">{t(locale, 'orgApp.stores.field.phone')}</Label>
						<Input id="store_phone" name="phone" type="tel" />
					</div>
				</div>
			</section>

			{#if canManage}
				<section class="grid gap-4 border-t border-border pt-5">
					<div>
						<h3 class="text-sm font-semibold">{t(locale, 'orgApp.stores.section.rootUser')}</h3>
						<p class="mt-1 text-xs text-muted-foreground">
							{t(locale, 'orgApp.stores.rootUserHint')}
						</p>
					</div>
					<div class="flex flex-col gap-2">
						<Label for="root_display_name">{t(locale, 'orgApp.stores.field.rootName')}</Label>
						<Input id="root_display_name" name="root_display_name" required />
					</div>
					<div class="flex flex-col gap-2">
						<Label for="root_email">{t(locale, 'orgApp.stores.field.rootEmail')}</Label>
						<Input id="root_email" name="root_email" type="email" required />
					</div>
					<div class="flex flex-col gap-2">
						<Label for="root_temporary_password">
							{t(locale, 'orgApp.stores.field.rootPassword')}
						</Label>
						<Input
							id="root_temporary_password"
							name="root_temporary_password"
							type="password"
							minlength={8}
							autocomplete="new-password"
							required
						/>
						<p class="text-xs text-muted-foreground">
							{t(locale, 'orgApp.stores.rootPasswordHint')}
						</p>
					</div>
				</section>
			{/if}
		</form>
		{#snippet footer()}
			<Button type="button" variant="outline" onclick={() => (createOpen = false)}>
				{t(locale, 'common.cancel')}
			</Button>
			<Button type="submit" form="create-store-form">
				{isViewer
					? t(locale, 'orgApp.stores.create.submitRequest')
					: t(locale, 'orgApp.stores.create.submit')}
			</Button>
		{/snippet}
	</EditSheet>
{/if}
