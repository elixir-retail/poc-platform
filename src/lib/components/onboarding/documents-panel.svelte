<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- signed Storage URLs are external */
	import ArchiveIcon from '@lucide/svelte/icons/archive';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import EditSheet from '$lib/components/onboarding/edit-sheet.svelte';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { t, type Locale } from '$lib/i18n';
	import type { OrganisationDetail, OrganisationDocument } from '$lib/types/platform';

	let {
		organisation,
		documentUrls,
		isAdmin,
		isOperator,
		locale
	}: {
		organisation: OrganisationDetail;
		documentUrls: Record<string, string>;
		isAdmin: boolean;
		isOperator: boolean;
		locale: Locale;
	} = $props();

	let uploadOpen = $state(false);
	let editOpen = $state(false);
	let reviewOpen = $state(false);
	let activeDocument = $state<OrganisationDocument | null>(null);
	let documentType = $state('');
	let reviewNotes = $state('');

	function formatBytes(bytes: number | null) {
		if (!bytes) return '—';
		if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	function openEdit(document: OrganisationDocument) {
		activeDocument = document;
		documentType = document.document_type;
		editOpen = true;
	}

	function openReview(document: OrganisationDocument) {
		activeDocument = document;
		reviewNotes = '';
		reviewOpen = true;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-center justify-between gap-3">
		<div>
			<h2 class="text-lg font-semibold">{t(locale, 'onboarding.documents.title')}</h2>
			<p class="text-sm text-muted-foreground">
				{t(locale, 'onboarding.documents.files', {
					count: organisation.organisation_document.length
				})}
			</p>
		</div>
		<Button onclick={() => (uploadOpen = true)}>
			<PlusIcon />
			{t(locale, 'onboarding.documents.upload')}
		</Button>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		{#each organisation.organisation_document as document (document.organisation_document_uuid)}
			<Card.Root>
				<Card.Header>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<Card.Title class="flex items-center gap-2 truncate text-base">
								<FileTextIcon class="size-4 shrink-0 text-muted-foreground" />
								{#if documentUrls[document.organisation_document_uuid]}
									<!-- Signed Storage URLs are external and must not use SvelteKit resolve(). -->
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
									<a
										href={documentUrls[document.organisation_document_uuid]}
										target="_blank"
										rel="noreferrer"
										class="inline-flex min-w-0 items-center gap-1 truncate text-primary hover:underline"
									>
										<span class="truncate">{document.original_filename}</span>
										<ExternalLinkIcon class="size-3 shrink-0" />
									</a>
								{:else}
									<span class="truncate">{document.original_filename}</span>
								{/if}
							</Card.Title>
							<Card.Description class="capitalize">
								{document.document_type.replaceAll('_', ' ')}
							</Card.Description>
						</div>
						<StatusBadge status={document.status} />
					</div>
				</Card.Header>
				<Card.Content class="space-y-3">
					<p class="text-sm text-muted-foreground">
						{formatBytes(document.file_size_bytes)} ·
						{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
							new Date(document.created_at)
						)}
					</p>
					{#if document.review_notes}
						<p class="text-xs text-muted-foreground">{document.review_notes}</p>
					{/if}
					<div class="flex flex-wrap gap-2">
						<Button size="sm" variant="outline" onclick={() => openEdit(document)}>
							<PencilIcon />
							{t(locale, 'common.edit')}
						</Button>
						{#if isAdmin && document.status === 'pending'}
							<Button size="sm" onclick={() => openReview(document)}>
								{t(locale, 'onboarding.documents.review')}
							</Button>
						{/if}
						<form method="POST" action="?/saveDocumentMeta">
							<input type="hidden" name="record_uuid" value={document.organisation_document_uuid} />
							<input type="hidden" name="operation" value="archive" />
							<input type="hidden" name="document_type" value={document.document_type} />
							<Button size="sm" variant="ghost" type="submit">
								<ArchiveIcon />
								{t(locale, 'common.archive')}
							</Button>
						</form>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<p class="text-sm text-muted-foreground md:col-span-2">
				{t(locale, 'onboarding.documents.empty')}
			</p>
		{/each}
	</div>
</div>

<EditSheet
	bind:open={uploadOpen}
	title={t(locale, 'onboarding.documents.uploadTitle')}
	description={t(locale, 'onboarding.documents.uploadDescription')}
>
	<form
		id="upload-form"
		method="POST"
		action="?/uploadDocument"
		enctype="multipart/form-data"
		class="grid gap-4"
	>
		<div class="flex flex-col gap-2">
			<Label for="document_type">{t(locale, 'onboarding.documents.type')}</Label>
			<Input
				id="document_type"
				name="document_type"
				placeholder="gst_registration_certificate"
				required
			/>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="document">{t(locale, 'onboarding.documents.file')}</Label>
			<Input id="document" name="document" type="file" accept=".pdf,.png,.jpg,.jpeg" required />
		</div>
	</form>
	{#snippet footer()}
		<Button type="button" variant="outline" onclick={() => (uploadOpen = false)}>
			{t(locale, 'common.cancel')}
		</Button>
		<Button type="submit" form="upload-form">
			<UploadIcon />
			{t(locale, 'onboarding.documents.upload')}
		</Button>
	{/snippet}
</EditSheet>

{#if activeDocument}
	<EditSheet
		bind:open={editOpen}
		title={t(locale, 'onboarding.documents.editTitle')}
		description={isOperator
			? t(locale, 'onboarding.role.operator')
			: t(locale, 'onboarding.role.admin')}
	>
		<div class="grid gap-6">
			<form id="doc-meta-form" method="POST" action="?/saveDocumentMeta" class="grid gap-4">
				<input type="hidden" name="record_uuid" value={activeDocument.organisation_document_uuid} />
				<input type="hidden" name="operation" value="update" />
				<div class="flex flex-col gap-2">
					<Label for="edit_document_type">{t(locale, 'onboarding.documents.type')}</Label>
					<Input id="edit_document_type" name="document_type" bind:value={documentType} required />
				</div>
			</form>
			<form
				id="doc-replace-form"
				method="POST"
				action="?/replaceDocument"
				enctype="multipart/form-data"
				class="grid gap-4 border-t border-border pt-4"
			>
				<input type="hidden" name="record_uuid" value={activeDocument.organisation_document_uuid} />
				<input type="hidden" name="document_type" value={documentType} />
				<div class="flex flex-col gap-2">
					<Label for="replace_document">{t(locale, 'onboarding.documents.replace')}</Label>
					<Input
						id="replace_document"
						name="document"
						type="file"
						accept=".pdf,.png,.jpg,.jpeg"
						required
					/>
				</div>
			</form>
		</div>
		{#snippet footer()}
			<Button type="button" variant="outline" onclick={() => (editOpen = false)}>
				{t(locale, 'common.cancel')}
			</Button>
			<Button type="submit" form="doc-meta-form" variant="secondary">
				{isOperator ? t(locale, 'common.submitApproval') : t(locale, 'common.save')}
			</Button>
			<Button type="submit" form="doc-replace-form">
				{t(locale, 'onboarding.documents.replace')}
			</Button>
		{/snippet}
	</EditSheet>

	{#if isAdmin}
		<EditSheet
			bind:open={reviewOpen}
			title={t(locale, 'onboarding.documents.review')}
			description={activeDocument.original_filename}
		>
			<form id="doc-review-form" method="POST" action="?/reviewDocument" class="grid gap-4">
				<input
					type="hidden"
					name="document_uuid"
					value={activeDocument.organisation_document_uuid}
				/>
				<div class="flex flex-col gap-2">
					<Label for="doc_review_notes">{t(locale, 'onboarding.review.notes')}</Label>
					<Textarea
						id="doc_review_notes"
						name="review_notes"
						bind:value={reviewNotes}
						placeholder={t(locale, 'onboarding.review.notesPlaceholder')}
					/>
				</div>
			</form>
			{#snippet footer()}
				<Button
					type="submit"
					form="doc-review-form"
					name="decision"
					value="rejected"
					variant="destructive"
				>
					{t(locale, 'common.reject')}
				</Button>
				<Button type="submit" form="doc-review-form" name="decision" value="approved">
					{t(locale, 'common.approve')}
				</Button>
			{/snippet}
		</EditSheet>
	{/if}
{/if}
