<script lang="ts">
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { t, type Locale } from '$lib/i18n';
	import type {
		MutationPayload,
		OrganisationChangeRequest,
		VerificationStatus
	} from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const profile = $derived(data.profile);
	const canEdit = $derived(
		data.organisationContext.membership.role === 'root' ||
			data.organisationContext.membership.role === 'admin'
	);

	const pendingProfileRequests = $derived(
		profile.organisation_change_request
			.filter((request) => request.section === 'tenant_profile' && request.status === 'pending')
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
	);

	const profileRequestHistory = $derived(
		profile.organisation_change_request
			.filter((request) => request.section === 'tenant_profile' && request.status !== 'pending')
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
	);

	const activeDocuments = $derived(
		profile.organisation_document.filter((document) => !document.archived_at)
	);

	let editOpen = $state(false);
	let legalName = $state('');
	let tradeName = $state('');
	let entityType = $state('');
	let contactEmail = $state('');
	let contactPhone = $state('');
	let countryCode = $state('');
	let preferredLanguage = $state<'en' | 'hi' | 'ta' | 'te'>('en');
	let primaryCurrency = $state('');

	$effect(() => {
		if (form?.success) editOpen = false;
	});

	function openEditor() {
		legalName = profile.legal_name;
		tradeName = profile.trade_name ?? '';
		entityType = profile.entity_type;
		contactEmail = profile.contact_email;
		contactPhone = profile.contact_phone ?? '';
		countryCode = profile.country_code;
		preferredLanguage = (['en', 'hi', 'ta', 'te'].includes(profile.preferred_language)
			? profile.preferred_language
			: 'en') as 'en' | 'hi' | 'ta' | 'te';
		primaryCurrency = profile.primary_currency_code;
		editOpen = true;
	}

	function asPayload(request: OrganisationChangeRequest): MutationPayload {
		const changes = request.proposed_changes;
		if (
			changes &&
			typeof changes === 'object' &&
			'operation' in changes &&
			'values' in changes &&
			typeof (changes as MutationPayload).values === 'object'
		) {
			return changes as MutationPayload;
		}
		return {
			operation: 'update',
			record_uuid: null,
			values: (changes as Record<string, unknown>) ?? {}
		};
	}

	function formatValue(value: unknown): string {
		if (value === null || value === undefined || value === '') return '—';
		return String(value);
	}

	function languageLabel(code: string) {
		return code.toUpperCase();
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2">
				<Building2Icon class="size-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold tracking-tight text-foreground">
					{t(locale, 'orgApp.profile.title')}
				</h1>
			</div>
			<p class="text-sm text-muted-foreground">{t(locale, 'orgApp.profile.description')}</p>
			<p class="text-sm text-muted-foreground">
				{profile.trade_name ?? profile.legal_name} · {profile.org_code}
			</p>
			{#if !canEdit}
				<p class="text-xs text-muted-foreground">{t(locale, 'orgApp.profile.adminOnly')}</p>
			{/if}
		</div>
		{#if canEdit}
			<Button onclick={openEditor} disabled={pendingProfileRequests.length > 0}>
				<PencilIcon />
				{t(locale, 'orgApp.profile.edit')}
			</Button>
		{/if}
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

	{#if pendingProfileRequests.length > 0}
		<div
			class="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
			role="status"
		>
			{t(locale, 'orgApp.profile.pendingNotice')}
		</div>
	{/if}

	<div class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.profile.identity')}</Card.Title>
				<Card.Description>{t(locale, 'orgApp.profile.identityHint')}</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-3 text-sm sm:grid-cols-2">
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'billing.column.orgId')}</p>
					<p class="font-medium">{profile.org_code}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.legal.legalName')}</p>
					<p class="font-medium">{profile.legal_name}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.legal.tradeName')}</p>
					<p class="font-medium">{profile.trade_name || '—'}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.legal.entityType')}</p>
					<p class="font-medium">{profile.entity_type}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.legal.country')}</p>
					<p class="font-medium">{profile.country_code}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">
						{t(locale, 'onboarding.legal.preferredLanguage')}
					</p>
					<p class="font-medium">{languageLabel(profile.preferred_language)}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.contact.email')}</p>
					<p class="font-medium break-all">{profile.contact_email}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'onboarding.contact.phone')}</p>
					<p class="font-medium">{profile.contact_phone || '—'}</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.profile.status')}</Card.Title>
				<Card.Description>{t(locale, 'orgApp.profile.statusHint')}</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-3 text-sm">
				<div>
					<p class="mb-1 text-xs text-muted-foreground">{t(locale, 'billing.column.onboarding')}</p>
					<StatusBadge status={profile.overall_status} />
				</div>
				<div class="flex flex-wrap gap-2">
					<StatusBadge status={profile.kyc_status as VerificationStatus} />
					<StatusBadge status={profile.kyb_status as VerificationStatus} />
				</div>
				<div>
					<p class="text-xs text-muted-foreground">
						{t(locale, 'onboarding.legal.primaryCurrency')}
					</p>
					<p class="font-medium">{profile.primary_currency_code}</p>
				</div>
				<div>
					<p class="mb-2 text-xs text-muted-foreground">
						{t(locale, 'onboarding.legal.currencyList')}
					</p>
					<div class="flex flex-wrap gap-2">
						{#each profile.organisation_currency as currency (currency.currency_code)}
							<Badge variant={currency.is_primary ? 'default' : 'secondary'}>
								{currency.currency_code}
								{#if currency.is_primary}
									· {t(locale, 'orgApp.profile.primary')}
								{/if}
							</Badge>
						{:else}
							<span class="text-sm text-muted-foreground">
								{t(locale, 'onboarding.legal.noCurrencies')}
							</span>
						{/each}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.profile.taxIds')}</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3 text-sm">
				{#each profile.organisation_tax_id as tax (tax.organisation_tax_id_uuid ?? tax.tax_value)}
					<div class="rounded-lg border border-border p-3">
						<p class="font-medium uppercase">{tax.tax_type}</p>
						<p class="mt-1 break-all">{tax.tax_value}</p>
						<p class="mt-1 text-xs text-muted-foreground capitalize">{tax.verification_status}</p>
					</div>
				{:else}
					<p class="text-muted-foreground">{t(locale, 'orgApp.profile.emptySection')}</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.profile.addresses')}</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3 text-sm">
				{#each profile.organisation_address as address (address.organisation_address_uuid)}
					<div class="rounded-lg border border-border p-3">
						<p class="font-medium capitalize">
							{address.address_type}
							{#if address.is_primary}
								<span class="text-xs text-muted-foreground"
									>· {t(locale, 'orgApp.profile.primary')}</span
								>
							{/if}
						</p>
						<p class="mt-1">
							{address.line_1}{address.line_2 ? `, ${address.line_2}` : ''}
						</p>
						<p>
							{[address.city, address.region, address.postal_code]
								.filter(Boolean)
								.join(', ')}
						</p>
						<p>{address.country_code}</p>
					</div>
				{:else}
					<p class="text-muted-foreground">{t(locale, 'orgApp.profile.emptySection')}</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.profile.directors')}</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3 text-sm">
				{#each profile.organisation_director as director (director.organisation_director_uuid)}
					<div class="rounded-lg border border-border p-3">
						<p class="font-medium">{director.full_name}</p>
						<p class="text-muted-foreground">{director.designation || '—'}</p>
						<div class="mt-2">
							<StatusBadge status={director.kyc_status} />
						</div>
					</div>
				{:else}
					<p class="text-muted-foreground">{t(locale, 'orgApp.profile.emptySection')}</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.profile.bankAccounts')}</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3 text-sm">
				{#each profile.organisation_bank_account as account (account.organisation_bank_account_uuid)}
					<div class="rounded-lg border border-border p-3">
						<p class="font-medium">{account.bank_name}</p>
						<p>{account.account_holder_name}</p>
						<p class="font-mono text-xs">{account.masked_account_number}</p>
						<p class="mt-1 text-xs text-muted-foreground capitalize">
							{account.currency_code} · {account.verification_status}
						</p>
					</div>
				{:else}
					<p class="text-muted-foreground">{t(locale, 'orgApp.profile.emptySection')}</p>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root class="lg:col-span-2">
			<Card.Header>
				<Card.Title>{t(locale, 'orgApp.profile.documents')}</Card.Title>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3 text-sm">
				{#each activeDocuments as document (document.organisation_document_uuid)}
					<div
						class="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<div>
							<p class="font-medium capitalize">{document.document_type.replaceAll('_', ' ')}</p>
							<p class="text-muted-foreground">{document.original_filename}</p>
						</div>
						<StatusBadge status={document.status} />
					</div>
				{:else}
					<p class="text-muted-foreground">{t(locale, 'orgApp.profile.emptySection')}</p>
				{/each}
			</Card.Content>
		</Card.Root>

		{#if pendingProfileRequests.length > 0 || profileRequestHistory.length > 0}
			<Card.Root class="lg:col-span-2">
				<Card.Header>
					<Card.Title>{t(locale, 'orgApp.profile.requests')}</Card.Title>
					<Card.Description>{t(locale, 'orgApp.profile.requestsHint')}</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					{#each [...pendingProfileRequests, ...profileRequestHistory] as request (request.organisation_change_request_uuid)}
						{@const payload = asPayload(request)}
						<div class="rounded-lg border border-border p-3">
							<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
								<p class="text-sm font-medium">
									{t(locale, 'orgApp.profile.requestItem')}
								</p>
								<StatusBadge status={request.status} />
							</div>
							<p class="mb-2 text-xs text-muted-foreground">
								{new Intl.DateTimeFormat(undefined, {
									dateStyle: 'medium',
									timeStyle: 'short'
								}).format(new Date(request.reviewed_at ?? request.created_at))}
							</p>
							{#if request.review_notes}
								<p class="mb-2 text-sm text-muted-foreground">{request.review_notes}</p>
							{/if}
							<dl class="grid gap-2 sm:grid-cols-2">
								{#each Object.entries(payload.values ?? {}) as [key, value] (key)}
									<div>
										<dt class="text-xs text-muted-foreground capitalize">
											{key.replaceAll('_', ' ')}
										</dt>
										<dd class="font-medium break-all">{formatValue(value)}</dd>
									</div>
								{/each}
							</dl>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>

<EditSheet
	bind:open={editOpen}
	title={t(locale, 'orgApp.profile.editTitle')}
	description={t(locale, 'orgApp.profile.editDescription')}
>
	<form method="POST" action="?/submitProfile" class="flex flex-col gap-4">
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="flex flex-col gap-2">
				<Label for="legal_name">{t(locale, 'onboarding.legal.legalName')}</Label>
				<Input id="legal_name" name="legal_name" bind:value={legalName} required />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="trade_name">{t(locale, 'onboarding.legal.tradeName')}</Label>
				<Input id="trade_name" name="trade_name" bind:value={tradeName} />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="entity_type">{t(locale, 'onboarding.legal.entityType')}</Label>
				<Input id="entity_type" name="entity_type" bind:value={entityType} required />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="country_code">{t(locale, 'onboarding.legal.country')}</Label>
				<Input
					id="country_code"
					name="country_code"
					bind:value={countryCode}
					maxlength={2}
					required
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="contact_email">{t(locale, 'onboarding.contact.email')}</Label>
				<Input
					id="contact_email"
					name="contact_email"
					type="email"
					bind:value={contactEmail}
					required
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="contact_phone">{t(locale, 'onboarding.contact.phone')}</Label>
				<Input id="contact_phone" name="contact_phone" bind:value={contactPhone} />
			</div>
			<div class="flex flex-col gap-2">
				<Label for="preferred_language">{t(locale, 'onboarding.legal.preferredLanguage')}</Label>
				<input type="hidden" name="preferred_language" value={preferredLanguage} />
				<Select.Root type="single" bind:value={preferredLanguage}>
					<Select.Trigger id="preferred_language" class="w-full">
						{languageLabel(preferredLanguage)}
					</Select.Trigger>
					<Select.Content>
						{#each ['en', 'hi', 'ta', 'te'] as code (code)}
							<Select.Item value={code} label={languageLabel(code)}>
								{languageLabel(code)}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="primary_currency_code"
					>{t(locale, 'onboarding.legal.primaryCurrency')}</Label
				>
				{#if profile.organisation_currency.length > 0}
					<input type="hidden" name="primary_currency_code" value={primaryCurrency} />
					<Select.Root type="single" bind:value={primaryCurrency}>
						<Select.Trigger id="primary_currency_code" class="w-full">
							{primaryCurrency}
						</Select.Trigger>
						<Select.Content>
							{#each profile.organisation_currency as currency (currency.currency_code)}
								<Select.Item value={currency.currency_code} label={currency.currency_code}>
									{currency.currency_code}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{:else}
					<Input
						id="primary_currency_code"
						name="primary_currency_code"
						bind:value={primaryCurrency}
						maxlength={3}
						required
					/>
				{/if}
			</div>
		</div>
		<div class="flex justify-end gap-2">
			<Button type="button" variant="outline" onclick={() => (editOpen = false)}>
				{t(locale, 'common.cancel')}
			</Button>
			<Button type="submit">{t(locale, 'common.submitApproval')}</Button>
		</div>
	</form>
</EditSheet>
