<script lang="ts">
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import {
		GOODS_CHARACTERISTICS,
		RETAIL_CATEGORIES,
		SERVICE_CATEGORIES,
		SERVICE_MODELS
	} from '$lib/schemas/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type {
		GoodsCharacteristic,
		RetailCategory,
		ServiceCategory,
		ServiceModel,
		Store,
		StoreBusinessMode
	} from '$lib/types/platform';
	import { untrack } from 'svelte';

	let {
		open = $bindable(false),
		store,
		currencies,
		isViewer,
		locale
	}: {
		open?: boolean;
		store: Store;
		currencies: Array<{ currency_code: string; is_primary: boolean }>;
		isViewer: boolean;
		locale: Locale;
	} = $props();

	let businessMode = $state<StoreBusinessMode>(untrack(() => store.business_mode));
	let retailCategory = $state<RetailCategory>(
		untrack(() => store.retail_category ?? 'general_merchandise')
	);
	let serviceCategory = $state<ServiceCategory>(
		untrack(() => store.service_category ?? 'salon_beauty')
	);
	let goodsCharacteristics = $state<GoodsCharacteristic[]>(
		untrack(() => [...store.goods_characteristics])
	);
	let serviceModels = $state<ServiceModel[]>(untrack(() => [...store.service_models]));
	let currency = $state(untrack(() => store.currency_code));
	let status = $state<'active' | 'inactive'>(untrack(() => store.status));

	$effect(() => {
		if (open) {
			businessMode = store.business_mode;
			retailCategory = store.retail_category ?? 'general_merchandise';
			serviceCategory = store.service_category ?? 'salon_beauty';
			goodsCharacteristics = [...store.goods_characteristics];
			serviceModels = [...store.service_models];
			currency = store.currency_code;
			status = store.status;
		}
	});

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
</script>

<EditSheet
	bind:open
	title={t(locale, 'orgApp.stores.detail.editTitle')}
	description={isViewer
		? t(locale, 'orgApp.stores.detail.viewerEditDescription')
		: t(locale, 'orgApp.stores.detail.editDescription')}
>
	<form id="edit-store-form" method="POST" action="?/updateStore" class="grid gap-6">
		<section class="grid gap-4">
			<h3 class="text-sm font-semibold">{t(locale, 'orgApp.stores.section.identity')}</h3>
			<div class="flex flex-col gap-2">
				<Label for="edit_store_name">{t(locale, 'orgApp.stores.field.name')}</Label>
				<Input id="edit_store_name" name="name" value={store.name} required />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="edit_store_description">{t(locale, 'orgApp.stores.field.description')}</Label>
				<Textarea
					id="edit_store_description"
					name="description"
					value={store.description ?? ''}
					rows={3}
				/>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label>{t(locale, 'orgApp.stores.column.status')}</Label>
					<input type="hidden" name="status" value={status} />
					<Select.Root type="single" bind:value={status}>
						<Select.Trigger class="w-full">
							{t(locale, `orgApp.stores.status.${status}` as MessageKey)}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="active" label={t(locale, 'orgApp.stores.status.active')} />
							<Select.Item value="inactive" label={t(locale, 'orgApp.stores.status.inactive')} />
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex flex-col gap-2">
					<Label>{t(locale, 'orgApp.stores.field.currency')}</Label>
					<input type="hidden" name="currency_code" value={currency} />
					<Select.Root type="single" bind:value={currency}>
						<Select.Trigger class="w-full">{currency}</Select.Trigger>
						<Select.Content>
							{#each currencies as item (item.currency_code)}
								<Select.Item value={item.currency_code} label={item.currency_code} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</section>

		<section class="grid gap-4 border-t border-border pt-5">
			<h3 class="text-sm font-semibold">{t(locale, 'orgApp.stores.section.classification')}</h3>
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
				<Label for="edit_address_line_1">{t(locale, 'orgApp.stores.field.address1')}</Label>
				<Input
					id="edit_address_line_1"
					name="address_line_1"
					value={store.address_line_1 ?? ''}
					required
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="edit_address_line_2">{t(locale, 'orgApp.stores.field.address2')}</Label>
				<Input id="edit_address_line_2" name="address_line_2" value={store.address_line_2 ?? ''} />
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label for="edit_city">{t(locale, 'orgApp.stores.field.city')}</Label>
					<Input id="edit_city" name="city" value={store.city ?? ''} required />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="edit_region">{t(locale, 'orgApp.stores.field.region')}</Label>
					<Input id="edit_region" name="region" value={store.region ?? ''} />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="edit_postal_code">{t(locale, 'orgApp.stores.field.postalCode')}</Label>
					<Input id="edit_postal_code" name="postal_code" value={store.postal_code ?? ''} />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="edit_country_code">{t(locale, 'orgApp.stores.field.country')}</Label>
					<Input
						id="edit_country_code"
						name="country_code"
						value={store.country_code ?? ''}
						maxlength={2}
						required
					/>
				</div>
			</div>
		</section>

		<section class="grid gap-4 border-t border-border pt-5">
			<h3 class="text-sm font-semibold">{t(locale, 'orgApp.stores.section.contact')}</h3>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="flex flex-col gap-2">
					<Label for="edit_store_email">{t(locale, 'orgApp.stores.field.email')}</Label>
					<Input id="edit_store_email" name="email" type="email" value={store.email ?? ''} />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="edit_store_phone">{t(locale, 'orgApp.stores.field.phone')}</Label>
					<Input id="edit_store_phone" name="phone" type="tel" value={store.phone ?? ''} />
				</div>
			</div>
		</section>
	</form>

	{#snippet footer()}
		<Button type="button" variant="outline" onclick={() => (open = false)}>
			{t(locale, 'common.cancel')}
		</Button>
		<Button type="submit" form="edit-store-form">
			{isViewer ? t(locale, 'common.submitApproval') : t(locale, 'common.save')}
		</Button>
	{/snippet}
</EditSheet>
