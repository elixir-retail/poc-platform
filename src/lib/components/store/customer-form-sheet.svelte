<script lang="ts">
	import { enhance } from '$app/forms';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { t, type Locale } from '$lib/i18n';
	import type { StoreCustomer } from '$lib/types/platform';
	import type { ActionResult } from '@sveltejs/kit';

	let {
		open = $bindable(false),
		locale,
		customer = null,
		defaults = null,
		formId = 'create-customer-form',
		action = null,
		billUuid = null,
		onSubmitted = null
	}: {
		open?: boolean;
		locale: Locale;
		customer?: StoreCustomer | null;
		defaults?: { full_name?: string | null; phone?: string | null } | null;
		formId?: string;
		action?: string | null;
		billUuid?: string | null;
		onSubmitted?:
			| ((
					result: ActionResult,
					update: (opts?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>
			  ) => Promise<void>)
			| null;
	} = $props();

	const isEdit = $derived(customer !== null);
	const formAction = $derived(action ?? (isEdit ? '?/updateCustomer' : '?/createCustomer'));
	let fullName = $state('');
	let phone = $state('');
	let email = $state('');
	let addressLine1 = $state('');
	let addressLine2 = $state('');
	let city = $state('');
	let region = $state('');
	let postalCode = $state('');
	let country = $state('');
	let notes = $state('');
	let status = $state<'active' | 'inactive'>('active');

	$effect(() => {
		if (!open) return;
		fullName = customer?.full_name ?? defaults?.full_name ?? '';
		phone = customer?.phone ?? defaults?.phone ?? '';
		email = customer?.email ?? '';
		addressLine1 = customer?.address_line1 ?? '';
		addressLine2 = customer?.address_line2 ?? '';
		city = customer?.city ?? '';
		region = customer?.state ?? '';
		postalCode = customer?.postal_code ?? '';
		country = customer?.country ?? '';
		notes = customer?.notes ?? '';
		status = customer?.status ?? 'active';
	});
</script>

<EditSheet
	bind:open
	title={t(locale, isEdit ? 'storeApp.customers.editTitle' : 'storeApp.customers.addTitle')}
	description={t(
		locale,
		isEdit ? 'storeApp.customers.editDescription' : 'storeApp.customers.addDescription'
	)}
>
	<form
		id={formId}
		method="POST"
		action={formAction}
		class="grid gap-4"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (onSubmitted) {
					await onSubmitted(result, update);
					return;
				}
				await update();
				if (result.type === 'success') open = false;
			};
		}}
	>
		{#if isEdit && customer}
			<input type="hidden" name="store_customer_uuid" value={customer.store_customer_uuid} />
			<input type="hidden" name="status" value={status} />
		{/if}
		{#if billUuid}
			<input type="hidden" name="store_bill_uuid" value={billUuid} />
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="flex flex-col gap-2 sm:col-span-2">
				<Label for={`${formId}-name`}>{t(locale, 'storeApp.customers.fullName')}</Label>
				<Input id={`${formId}-name`} name="full_name" bind:value={fullName} maxlength={120} required />
			</div>
			<div class="flex flex-col gap-2">
				<Label for={`${formId}-phone`}>{t(locale, 'storeApp.customers.phone')}</Label>
				<Input
					id={`${formId}-phone`}
					name="phone"
					bind:value={phone}
					maxlength={40}
					required
					inputmode="tel"
				/>
				<p class="text-xs text-muted-foreground">{t(locale, 'storeApp.customers.phoneUnique')}</p>
			</div>
			<div class="flex flex-col gap-2">
				<Label for={`${formId}-email`}>{t(locale, 'storeApp.customers.email')}</Label>
				<Input id={`${formId}-email`} name="email" type="email" bind:value={email} maxlength={120} />
			</div>
			<div class="flex flex-col gap-2 sm:col-span-2">
				<Label for={`${formId}-address1`}>{t(locale, 'storeApp.customers.address1')}</Label>
				<Input
					id={`${formId}-address1`}
					name="address_line1"
					bind:value={addressLine1}
					maxlength={120}
				/>
			</div>
			<div class="flex flex-col gap-2 sm:col-span-2">
				<Label for={`${formId}-address2`}>{t(locale, 'storeApp.customers.address2')}</Label>
				<Input
					id={`${formId}-address2`}
					name="address_line2"
					bind:value={addressLine2}
					maxlength={120}
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for={`${formId}-city`}>{t(locale, 'storeApp.customers.city')}</Label>
				<Input id={`${formId}-city`} name="city" bind:value={city} maxlength={80} />
			</div>
			<div class="flex flex-col gap-2">
				<Label for={`${formId}-state`}>{t(locale, 'storeApp.customers.state')}</Label>
				<Input id={`${formId}-state`} name="state" bind:value={region} maxlength={80} />
			</div>
			<div class="flex flex-col gap-2">
				<Label for={`${formId}-postal`}>{t(locale, 'storeApp.customers.postalCode')}</Label>
				<Input id={`${formId}-postal`} name="postal_code" bind:value={postalCode} maxlength={20} />
			</div>
			<div class="flex flex-col gap-2">
				<Label for={`${formId}-country`}>{t(locale, 'storeApp.customers.country')}</Label>
				<Input id={`${formId}-country`} name="country" bind:value={country} maxlength={80} />
			</div>
			<div class="flex flex-col gap-2 sm:col-span-2">
				<Label for={`${formId}-notes`}>{t(locale, 'storeApp.customers.notes')}</Label>
				<Textarea id={`${formId}-notes`} name="notes" bind:value={notes} maxlength={500} />
			</div>
		</div>
	</form>

	{#snippet footer()}
		<div class="flex w-full justify-end gap-2">
			<Button type="button" variant="outline" onclick={() => (open = false)}>
				{t(locale, 'common.cancel')}
			</Button>
			<Button type="submit" form={formId}>
				{t(locale, isEdit ? 'common.save' : 'storeApp.customers.add')}
			</Button>
		</div>
	{/snippet}
</EditSheet>
