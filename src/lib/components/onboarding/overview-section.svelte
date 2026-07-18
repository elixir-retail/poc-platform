<script lang="ts">
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { t, type Locale } from '$lib/i18n';
	import type { OrganisationDetail } from '$lib/types/platform';
	import { untrack } from 'svelte';

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
	let overallStatus = $state(untrack(() => organisation.overall_status));
	let kycStatus = $state(untrack(() => organisation.kyc_status));
	let kybStatus = $state(untrack(() => organisation.kyb_status));
	let preferredLanguage = $state(untrack(() => organisation.preferred_language));

	const overallOptions = [
		'draft',
		'submitted',
		'in_review',
		'changes_requested',
		'partially_approved',
		'onboarded',
		'rejected',
		'suspended'
	] as const;
	const verificationOptions = ['not_started', 'pending', 'approved', 'rejected'] as const;

	function openEditor() {
		overallStatus = organisation.overall_status;
		kycStatus = organisation.kyc_status;
		kybStatus = organisation.kyb_status;
		preferredLanguage = organisation.preferred_language;
		open = true;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between gap-3">
		<div>
			<h2 class="text-lg font-semibold">{t(locale, 'onboarding.overview.title')}</h2>
			<p class="text-sm text-muted-foreground">{t(locale, 'onboarding.overview.description')}</p>
		</div>
		<Button variant="outline" onclick={openEditor}>
			<PencilIcon />
			{t(locale, 'common.edit')}
		</Button>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'onboarding.review.overall')}</Card.Description>
				<Card.Title><StatusBadge status={organisation.overall_status} /></Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'onboarding.column.language')}</Card.Description>
				<Card.Title class="uppercase">{organisation.preferred_language}</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'onboarding.verification.kyc')}</Card.Description>
				<Card.Title><StatusBadge status={organisation.kyc_status} /></Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'onboarding.verification.kyb')}</Card.Description>
				<Card.Title><StatusBadge status={organisation.kyb_status} /></Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'onboarding.column.country')}</Card.Description>
				<Card.Title>{organisation.country_code}</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'onboarding.legal.primaryCurrency')}</Card.Description>
				<Card.Title>{organisation.primary_currency_code}</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'onboarding.contact.email')}</Card.Description>
				<Card.Title class="truncate text-base">{organisation.contact_email}</Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'onboarding.contact.phone')}</Card.Description>
				<Card.Title>{organisation.contact_phone || '—'}</Card.Title>
			</Card.Header>
		</Card.Root>
	</div>
</div>

<EditSheet
	bind:open
	title={t(locale, 'onboarding.overview.editTitle')}
	description={isOperator
		? t(locale, 'onboarding.role.operator')
		: t(locale, 'onboarding.role.admin')}
>
	<form id="overview-form" method="POST" action="?/saveOverview" class="grid gap-4">
		<div class="flex flex-col gap-2">
			<Label>{t(locale, 'onboarding.review.overall')}</Label>
			<input type="hidden" name="overall_status" value={overallStatus} />
			<Select.Root type="single" bind:value={overallStatus}>
				<Select.Trigger class="w-full capitalize"
					>{overallStatus.replaceAll('_', ' ')}</Select.Trigger
				>
				<Select.Content>
					{#each overallOptions as option (option)}
						<Select.Item value={option} label={option.replaceAll('_', ' ')} class="capitalize" />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'onboarding.verification.kyc')}</Label>
				<input type="hidden" name="kyc_status" value={kycStatus} />
				<Select.Root type="single" bind:value={kycStatus}>
					<Select.Trigger class="w-full capitalize">{kycStatus.replaceAll('_', ' ')}</Select.Trigger
					>
					<Select.Content>
						{#each verificationOptions as option (option)}
							<Select.Item value={option} label={option.replaceAll('_', ' ')} class="capitalize" />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex flex-col gap-2">
				<Label>{t(locale, 'onboarding.verification.kyb')}</Label>
				<input type="hidden" name="kyb_status" value={kybStatus} />
				<Select.Root type="single" bind:value={kybStatus}>
					<Select.Trigger class="w-full capitalize">{kybStatus.replaceAll('_', ' ')}</Select.Trigger
					>
					<Select.Content>
						{#each verificationOptions as option (option)}
							<Select.Item value={option} label={option.replaceAll('_', ' ')} class="capitalize" />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<Label>{t(locale, 'onboarding.legal.preferredLanguage')}</Label>
			<input type="hidden" name="preferred_language" value={preferredLanguage} />
			<Select.Root type="single" bind:value={preferredLanguage}>
				<Select.Trigger class="w-full uppercase">{preferredLanguage}</Select.Trigger>
				<Select.Content>
					{#each ['en', 'hi', 'ta', 'te'] as option (option)}
						<Select.Item value={option} label={option.toUpperCase()} />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="flex flex-col gap-2">
				<Label for="overview_country">{t(locale, 'onboarding.legal.country')}</Label>
				<Input
					id="overview_country"
					name="country_code"
					value={organisation.country_code}
					maxlength={2}
					required
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="overview_currency">{t(locale, 'onboarding.legal.primaryCurrency')}</Label>
				<Input
					id="overview_currency"
					name="primary_currency_code"
					value={organisation.primary_currency_code}
					maxlength={3}
					required
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="overview_email">{t(locale, 'onboarding.contact.email')}</Label>
				<Input
					id="overview_email"
					name="contact_email"
					type="email"
					value={organisation.contact_email}
					required
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="overview_phone">{t(locale, 'onboarding.contact.phone')}</Label>
				<Input
					id="overview_phone"
					name="contact_phone"
					type="tel"
					value={organisation.contact_phone ?? ''}
				/>
			</div>
		</div>
	</form>
	{#snippet footer()}
		<Button type="button" variant="outline" onclick={() => (open = false)}>
			{t(locale, 'common.cancel')}
		</Button>
		<Button type="submit" form="overview-form">
			{isOperator ? t(locale, 'common.submitApproval') : t(locale, 'common.save')}
		</Button>
	{/snippet}
</EditSheet>
