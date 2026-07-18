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
	import type { OrganisationDetail, OrganisationDirector } from '$lib/types/platform';

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
	let fullName = $state('');
	let designation = $state('');
	let nationalityCode = $state('');
	let ownershipPercent = $state(0);
	let kycStatus = $state('not_started');

	function openCreate() {
		operation = 'create';
		recordUuid = '';
		fullName = '';
		designation = '';
		nationalityCode = organisation.country_code;
		ownershipPercent = 0;
		kycStatus = 'not_started';
		open = true;
	}

	function openEdit(director: OrganisationDirector) {
		operation = 'update';
		recordUuid = director.organisation_director_uuid;
		fullName = director.full_name;
		designation = director.designation ?? '';
		nationalityCode = director.nationality_code ?? '';
		ownershipPercent = director.ownership_percent ?? 0;
		kycStatus = director.kyc_status;
		open = true;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between gap-3">
		<div>
			<h2 class="text-lg font-semibold">{t(locale, 'onboarding.directors.title')}</h2>
			<p class="text-sm text-muted-foreground">{t(locale, 'onboarding.directors.description')}</p>
		</div>
		<Button onclick={openCreate}>
			<PlusIcon />
			{t(locale, 'common.add')}
		</Button>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		{#each organisation.organisation_director as director (director.organisation_director_uuid)}
			<Card.Root>
				<Card.Header>
					<div class="flex items-start justify-between gap-3">
						<div>
							<Card.Title>{director.full_name}</Card.Title>
							<Card.Description>{director.designation ?? 'Director'}</Card.Description>
						</div>
						<div class="flex items-center gap-1">
							<StatusBadge status={director.kyc_status} />
							<Button size="icon-sm" variant="outline" onclick={() => openEdit(director)}>
								<PencilIcon />
							</Button>
							<form method="POST" action="?/saveDirector">
								<input type="hidden" name="operation" value="delete" />
								<input
									type="hidden"
									name="record_uuid"
									value={director.organisation_director_uuid}
								/>
								<input type="hidden" name="full_name" value={director.full_name} />
								<input type="hidden" name="kyc_status" value={director.kyc_status} />
								<Button size="icon-sm" variant="ghost" type="submit">
									<Trash2Icon />
								</Button>
							</form>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="space-y-1 text-sm text-muted-foreground">
					<p>{t(locale, 'onboarding.directors.nationality')}: {director.nationality_code ?? '—'}</p>
					<p>
						{t(locale, 'onboarding.directors.ownership')}: {director.ownership_percent ?? 0}%
					</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<p class="text-sm text-muted-foreground md:col-span-2">
				{t(locale, 'onboarding.directors.empty')}
			</p>
		{/each}
	</div>
</div>

<EditSheet
	bind:open
	title={operation === 'create'
		? t(locale, 'onboarding.directors.addTitle')
		: t(locale, 'onboarding.directors.editTitle')}
	description={isOperator
		? t(locale, 'onboarding.role.operator')
		: t(locale, 'onboarding.role.admin')}
>
	<form id="director-form" method="POST" action="?/saveDirector" class="grid gap-4">
		<input type="hidden" name="operation" value={operation} />
		<input type="hidden" name="record_uuid" value={recordUuid} />
		<div class="flex flex-col gap-2">
			<Label for="full_name">{t(locale, 'onboarding.directors.fullName')}</Label>
			<Input id="full_name" name="full_name" bind:value={fullName} required />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="designation">{t(locale, 'onboarding.directors.designation')}</Label>
			<Input id="designation" name="designation" bind:value={designation} />
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="flex flex-col gap-2">
				<Label for="nationality_code">{t(locale, 'onboarding.directors.nationality')}</Label>
				<Input
					id="nationality_code"
					name="nationality_code"
					bind:value={nationalityCode}
					maxlength={2}
				/>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="ownership_percent">{t(locale, 'onboarding.directors.ownership')}</Label>
				<Input
					id="ownership_percent"
					name="ownership_percent"
					type="number"
					min="0"
					max="100"
					step="0.01"
					bind:value={ownershipPercent}
				/>
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<Label>{t(locale, 'onboarding.verification.kyc')}</Label>
			<input type="hidden" name="kyc_status" value={kycStatus} />
			<Select.Root type="single" bind:value={kycStatus}>
				<Select.Trigger class="w-full capitalize">{kycStatus.replaceAll('_', ' ')}</Select.Trigger>
				<Select.Content>
					{#each ['not_started', 'pending', 'approved', 'rejected'] as option (option)}
						<Select.Item value={option} label={option.replaceAll('_', ' ')} class="capitalize" />
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</form>
	{#snippet footer()}
		<Button type="button" variant="outline" onclick={() => (open = false)}>
			{t(locale, 'common.cancel')}
		</Button>
		<Button type="submit" form="director-form">
			{isOperator ? t(locale, 'common.submitApproval') : t(locale, 'common.save')}
		</Button>
	{/snippet}
</EditSheet>
