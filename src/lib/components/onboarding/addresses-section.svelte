<script lang="ts">
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { t, type Locale } from '$lib/i18n';
	import type { OrganisationAddress, OrganisationDetail } from '$lib/types/platform';

	let {
		organisation,
		isOperator,
		locale
	}: {
		organisation: OrganisationDetail;
		isOperator: boolean;
		locale: Locale;
	} = $props();

	let open = $state(false);
	let operation = $state<'create' | 'update' | 'delete'>('create');
	let recordUuid = $state('');
	let addressType = $state('registered');
	let line1 = $state('');
	let line2 = $state('');
	let city = $state('');
	let region = $state('');
	let postalCode = $state('');
	let countryCode = $state('IN');
	let isPrimary = $state(false);

	function blankForm() {
		operation = 'create';
		recordUuid = '';
		addressType = 'registered';
		line1 = '';
		line2 = '';
		city = '';
		region = '';
		postalCode = '';
		countryCode = organisation.country_code;
		isPrimary = organisation.organisation_address.length === 0;
	}

	function openCreate() {
		blankForm();
		open = true;
	}

	function openEdit(address: OrganisationAddress) {
		operation = 'update';
		recordUuid = address.organisation_address_uuid;
		addressType = address.address_type;
		line1 = address.line_1;
		line2 = address.line_2 ?? '';
		city = address.city;
		region = address.region ?? '';
		postalCode = address.postal_code ?? '';
		countryCode = address.country_code;
		isPrimary = address.is_primary;
		open = true;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between gap-3">
		<div>
			<h2 class="text-lg font-semibold">{t(locale, 'onboarding.address.title')}</h2>
			<p class="text-sm text-muted-foreground">{t(locale, 'onboarding.address.description')}</p>
		</div>
		<Button onclick={openCreate}>
			<PlusIcon />
			{t(locale, 'common.add')}
		</Button>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		{#each organisation.organisation_address as address (address.organisation_address_uuid)}
			<Card.Root>
				<Card.Header>
					<div class="flex items-start justify-between gap-3">
						<div>
							<Card.Title class="capitalize">{address.address_type}</Card.Title>
							{#if address.is_primary}
								<Card.Description><StatusBadge status="primary" /></Card.Description>
							{/if}
						</div>
						<div class="flex gap-1">
							<Button size="icon-sm" variant="outline" onclick={() => openEdit(address)}>
								<PencilIcon />
							</Button>
							<form method="POST" action="?/saveAddress">
								<input type="hidden" name="operation" value="delete" />
								<input type="hidden" name="record_uuid" value={address.organisation_address_uuid} />
								<input type="hidden" name="address_type" value={address.address_type} />
								<input type="hidden" name="line_1" value={address.line_1} />
								<input type="hidden" name="city" value={address.city} />
								<input type="hidden" name="country_code" value={address.country_code} />
								<input type="hidden" name="is_primary" value={String(address.is_primary)} />
								<Button size="icon-sm" variant="ghost" type="submit">
									<Trash2Icon />
								</Button>
							</form>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<address class="text-sm text-muted-foreground not-italic">
						{address.line_1}<br />
						{#if address.line_2}{address.line_2}<br />{/if}
						{address.city}{address.region ? `, ${address.region}` : ''}
						{address.postal_code ?? ''}<br />
						{address.country_code}
					</address>
				</Card.Content>
			</Card.Root>
		{:else}
			<p class="text-sm text-muted-foreground md:col-span-2">
				{t(locale, 'onboarding.address.empty')}
			</p>
		{/each}
	</div>
</div>

<EditSheet
	bind:open
	title={operation === 'create'
		? t(locale, 'onboarding.address.addTitle')
		: t(locale, 'onboarding.address.editTitle')}
	description={isOperator
		? t(locale, 'onboarding.role.operator')
		: t(locale, 'onboarding.role.admin')}
>
	<form id="address-form" method="POST" action="?/saveAddress" class="grid gap-4">
		<input type="hidden" name="operation" value={operation} />
		<input type="hidden" name="record_uuid" value={recordUuid} />
		<div class="flex flex-col gap-2">
			<Label>{t(locale, 'onboarding.address.type')}</Label>
			<input type="hidden" name="address_type" value={addressType} />
			<Select.Root type="single" bind:value={addressType}>
				<Select.Trigger class="w-full capitalize">{addressType}</Select.Trigger>
				<Select.Content>
					{#each ['registered', 'business', 'billing'] as option (option)}
						<Select.Item value={option} label={option} class="capitalize" />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="line_1">{t(locale, 'onboarding.address.line1')}</Label>
			<Input id="line_1" name="line_1" bind:value={line1} required />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="line_2">{t(locale, 'onboarding.address.line2')}</Label>
			<Input id="line_2" name="line_2" bind:value={line2} />
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="flex flex-col gap-2">
				<Label for="city">{t(locale, 'onboarding.address.city')}</Label>
				<Input id="city" name="city" bind:value={city} required />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="region">{t(locale, 'onboarding.address.region')}</Label>
				<Input id="region" name="region" bind:value={region} />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="postal_code">{t(locale, 'onboarding.address.postal')}</Label>
				<Input id="postal_code" name="postal_code" bind:value={postalCode} />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="country_code">{t(locale, 'onboarding.column.country')}</Label>
				<Input
					id="country_code"
					name="country_code"
					bind:value={countryCode}
					maxlength={2}
					required
				/>
			</div>
		</div>
		<label class="flex items-center gap-2 text-sm">
			<input type="hidden" name="is_primary" value={isPrimary ? 'true' : 'false'} />
			<input type="checkbox" bind:checked={isPrimary} />
			{t(locale, 'status.primary')}
		</label>
	</form>
	{#snippet footer()}
		<Button type="button" variant="outline" onclick={() => (open = false)}>
			{t(locale, 'common.cancel')}
		</Button>
		<Button type="submit" form="address-form">
			{isOperator ? t(locale, 'common.submitApproval') : t(locale, 'common.save')}
		</Button>
	{/snippet}
</EditSheet>
