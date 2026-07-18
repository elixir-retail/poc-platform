<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import AddressesSection from '$lib/components/onboarding/addresses-section.svelte';
	import BankSection from '$lib/components/onboarding/bank-section.svelte';
	import DetailHeader from '$lib/components/onboarding/detail-header.svelte';
	import DirectorsSection from '$lib/components/onboarding/directors-section.svelte';
	import DocumentsPanel from '$lib/components/onboarding/documents-panel.svelte';
	import LegalTaxSection from '$lib/components/onboarding/legal-tax-section.svelte';
	import OverviewSection from '$lib/components/onboarding/overview-section.svelte';
	import ReviewPanel from '$lib/components/onboarding/review-panel.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const steps = [
		'overview',
		'legal',
		'address',
		'directors',
		'bank',
		'documents',
		'review'
	] as const;
	type Step = (typeof steps)[number];

	const requestedStep = $derived(page.url.searchParams.get('step'));
	const activeStep = $derived(
		steps.includes(requestedStep as Step) ? (requestedStep as Step) : 'overview'
	);
	const isAdmin = $derived(data.profile?.role === 'platform_admin');
	const isOperator = $derived(data.profile?.role === 'platform_op');
	const locale = $derived(data.locale as Locale);

	function stepLabel(step: Step) {
		return t(locale, `onboarding.step.${step}` as MessageKey);
	}

	function selectStep(step: Step) {
		const href = resolve(`/onboarding/${data.organisation.org_code}` as '/onboarding/[orgCode]');
		goto(resolve(`${href}?step=${step}` as '/onboarding/[orgCode]'), {
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<div class="flex flex-col gap-5">
	<Breadcrumb.Root>
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/onboarding">{t(locale, 'onboarding.organisations')}</Breadcrumb.Link
				>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{data.organisation.org_code}</Breadcrumb.Page>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{stepLabel(activeStep)}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<DetailHeader
		organisation={data.organisation}
		{activeStep}
		{isAdmin}
		{locale}
		onSelectStep={selectStep}
	/>

	{#if form?.message}
		<div
			class="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm"
			role="status"
		>
			<CheckCircle2Icon class="size-4 text-primary" />
			{form.message}
		</div>
	{/if}

	{#if activeStep === 'overview'}
		<OverviewSection organisation={data.organisation} {isOperator} {locale} />
	{:else if activeStep === 'legal'}
		<LegalTaxSection organisation={data.organisation} {isOperator} {locale} />
	{:else if activeStep === 'address'}
		<AddressesSection organisation={data.organisation} {isOperator} {locale} />
	{:else if activeStep === 'directors'}
		<DirectorsSection organisation={data.organisation} {isOperator} {locale} />
	{:else if activeStep === 'bank'}
		<BankSection organisation={data.organisation} {isOperator} {locale} />
	{:else if activeStep === 'documents'}
		<DocumentsPanel
			organisation={data.organisation}
			documentUrls={data.documentUrls}
			{isAdmin}
			{isOperator}
			{locale}
		/>
	{:else if activeStep === 'review'}
		<ReviewPanel organisation={data.organisation} {isAdmin} {locale} />
	{/if}
</div>
