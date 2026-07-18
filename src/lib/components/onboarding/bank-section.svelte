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
	import type { OrganisationBankAccount, OrganisationDetail } from '$lib/types/platform';

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
	let bankName = $state('');
	let accountHolderName = $state('');
	let maskedAccountNumber = $state('');
	let routingCode = $state('');
	let currencyCode = $state('INR');
	let isPrimary = $state(false);
	let verificationStatus = $state('pending');

	function openCreate() {
		operation = 'create';
		recordUuid = '';
		bankName = '';
		accountHolderName = '';
		maskedAccountNumber = '';
		routingCode = '';
		currencyCode = organisation.primary_currency_code;
		isPrimary = organisation.organisation_bank_account.length === 0;
		verificationStatus = 'pending';
		open = true;
	}

	function openEdit(bank: OrganisationBankAccount) {
		operation = 'update';
		recordUuid = bank.organisation_bank_account_uuid;
		bankName = bank.bank_name;
		accountHolderName = bank.account_holder_name;
		maskedAccountNumber = bank.masked_account_number;
		routingCode = bank.routing_code ?? '';
		currencyCode = bank.currency_code;
		isPrimary = bank.is_primary;
		verificationStatus = bank.verification_status;
		open = true;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between gap-3">
		<div>
			<h2 class="text-lg font-semibold">{t(locale, 'onboarding.bank.title')}</h2>
			<p class="text-sm text-muted-foreground">{t(locale, 'onboarding.bank.description')}</p>
		</div>
		<Button onclick={openCreate}>
			<PlusIcon />
			{t(locale, 'common.add')}
		</Button>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		{#each organisation.organisation_bank_account as bank (bank.organisation_bank_account_uuid)}
			<Card.Root>
				<Card.Header>
					<div class="flex items-start justify-between gap-3">
						<div>
							<Card.Title>{bank.bank_name}</Card.Title>
							<Card.Description>{bank.account_holder_name}</Card.Description>
						</div>
						<div class="flex items-center gap-1">
							{#if bank.is_primary}<StatusBadge status="primary" />{/if}
							<StatusBadge status={bank.verification_status} />
							<Button size="icon-sm" variant="outline" onclick={() => openEdit(bank)}>
								<PencilIcon />
							</Button>
							<form method="POST" action="?/saveBank">
								<input type="hidden" name="operation" value="delete" />
								<input
									type="hidden"
									name="record_uuid"
									value={bank.organisation_bank_account_uuid}
								/>
								<input type="hidden" name="bank_name" value={bank.bank_name} />
								<input type="hidden" name="account_holder_name" value={bank.account_holder_name} />
								<input
									type="hidden"
									name="masked_account_number"
									value={bank.masked_account_number}
								/>
								<input type="hidden" name="currency_code" value={bank.currency_code} />
								<input type="hidden" name="is_primary" value={String(bank.is_primary)} />
								<input type="hidden" name="verification_status" value={bank.verification_status} />
								<Button size="icon-sm" variant="ghost" type="submit">
									<Trash2Icon />
								</Button>
							</form>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="space-y-1 text-sm text-muted-foreground">
					<p>{bank.masked_account_number} · {bank.currency_code}</p>
					<p>
						{t(locale, 'onboarding.bank.routing')}: {bank.routing_code ?? '—'}
					</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<p class="text-sm text-muted-foreground md:col-span-2">
				{t(locale, 'onboarding.bank.empty')}
			</p>
		{/each}
	</div>
</div>

<EditSheet
	bind:open
	title={operation === 'create'
		? t(locale, 'onboarding.bank.addTitle')
		: t(locale, 'onboarding.bank.editTitle')}
	description={t(locale, 'onboarding.bank.maskHint')}
>
	<form id="bank-form" method="POST" action="?/saveBank" class="grid gap-4">
		<input type="hidden" name="operation" value={operation} />
		<input type="hidden" name="record_uuid" value={recordUuid} />
		<div class="flex flex-col gap-2">
			<Label for="bank_name">{t(locale, 'onboarding.bank.bankName')}</Label>
			<Input id="bank_name" name="bank_name" bind:value={bankName} required />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="account_holder_name">{t(locale, 'onboarding.bank.holder')}</Label>
			<Input
				id="account_holder_name"
				name="account_holder_name"
				bind:value={accountHolderName}
				required
			/>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="masked_account_number">{t(locale, 'onboarding.bank.masked')}</Label>
			<Input
				id="masked_account_number"
				name="masked_account_number"
				bind:value={maskedAccountNumber}
				placeholder="XXXXXX1234"
				required
			/>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="flex flex-col gap-2">
				<Label for="routing_code">{t(locale, 'onboarding.bank.routing')}</Label>
				<Input id="routing_code" name="routing_code" bind:value={routingCode} />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="currency_code">{t(locale, 'onboarding.column.currency')}</Label>
				<Input
					id="currency_code"
					name="currency_code"
					bind:value={currencyCode}
					maxlength={3}
					required
				/>
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<Label>{t(locale, 'onboarding.documents.status')}</Label>
			<input type="hidden" name="verification_status" value={verificationStatus} />
			<Select.Root type="single" bind:value={verificationStatus}>
				<Select.Trigger class="w-full capitalize">{verificationStatus}</Select.Trigger>
				<Select.Content>
					{#each ['pending', 'verified', 'rejected'] as option (option)}
						<Select.Item value={option} label={option} class="capitalize" />
					{/each}
				</Select.Content>
			</Select.Root>
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
		<Button type="submit" form="bank-form">
			{isOperator ? t(locale, 'common.submitApproval') : t(locale, 'common.save')}
		</Button>
	{/snippet}
</EditSheet>
