<script lang="ts">
	import Clock3Icon from '@lucide/svelte/icons/clock-3';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import StatusBadge from '$lib/components/onboarding/status-badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { t, type Locale } from '$lib/i18n';
	import type {
		MutationPayload,
		OrganisationChangeRequest,
		OrganisationDetail
	} from '$lib/types/platform';

	let {
		organisation,
		isAdmin,
		locale
	}: {
		organisation: OrganisationDetail;
		isAdmin: boolean;
		locale: Locale;
	} = $props();

	const pendingRequests = $derived(
		organisation.organisation_change_request
			.filter((request) => request.status === 'pending')
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
	);

	const historyRequests = $derived(
		organisation.organisation_change_request
			.filter((request) => request.status !== 'pending')
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
	);

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
		if (typeof value === 'boolean') return value ? 'Yes' : 'No';
		if (Array.isArray(value)) {
			return value
				.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
				.join(', ');
		}
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	function fieldEntries(payload: MutationPayload) {
		return Object.entries(payload.values ?? {});
	}
</script>

<div class="flex flex-col gap-4">
	<div class="grid gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'onboarding.review.overall')}</Card.Description>
				<Card.Title><StatusBadge status={organisation.overall_status} /></Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'onboarding.review.kyc')}</Card.Description>
				<Card.Title><StatusBadge status={organisation.kyc_status} /></Card.Title>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header class="pb-2">
				<Card.Description>{t(locale, 'onboarding.review.kyb')}</Card.Description>
				<Card.Title><StatusBadge status={organisation.kyb_status} /></Card.Title>
			</Card.Header>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>{t(locale, 'onboarding.review.queue')}</Card.Title>
			<Card.Description>
				{t(locale, 'onboarding.review.pending', { count: pendingRequests.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			{#each pendingRequests as request (request.organisation_change_request_uuid)}
				{@const payload = asPayload(request)}
				<div class="flex flex-col gap-4 rounded-lg border border-border p-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div>
							<div class="flex items-center gap-2">
								<Clock3Icon class="size-4 text-muted-foreground" />
								<h3 class="font-medium capitalize">
									{request.section} · {payload.operation}
								</h3>
							</div>
							<p class="mt-1 text-xs text-muted-foreground">
								{new Intl.DateTimeFormat(undefined, {
									dateStyle: 'medium',
									timeStyle: 'short'
								}).format(new Date(request.created_at))}
								{#if payload.record_uuid}
									· {payload.record_uuid.slice(0, 8)}…
								{/if}
							</p>
						</div>
						<StatusBadge status={request.status} />
					</div>

					<div class="overflow-x-auto rounded-md border border-border">
						<table class="w-full text-sm">
							<thead class="bg-muted text-left text-xs text-muted-foreground">
								<tr>
									<th class="px-3 py-2 font-medium">{t(locale, 'onboarding.review.field')}</th>
									<th class="px-3 py-2 font-medium">{t(locale, 'onboarding.review.proposed')}</th>
								</tr>
							</thead>
							<tbody>
								{#each fieldEntries(payload) as [key, value] (key)}
									<tr class="border-t border-border">
										<td class="px-3 py-2 text-muted-foreground capitalize">
											{key.replaceAll('_', ' ')}
										</td>
										<td class="px-3 py-2 font-medium break-all">{formatValue(value)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					{#if isAdmin}
						<form method="POST" action="?/reviewChange" class="flex flex-col gap-3">
							<input
								type="hidden"
								name="request_uuid"
								value={request.organisation_change_request_uuid}
							/>
							<div class="flex flex-col gap-2">
								<Label for="review_notes_{request.organisation_change_request_uuid}">
									{t(locale, 'onboarding.review.notes')}
								</Label>
								<Textarea
									id="review_notes_{request.organisation_change_request_uuid}"
									name="review_notes"
									placeholder={t(locale, 'onboarding.review.notesPlaceholder')}
								/>
							</div>
							<div class="flex justify-end gap-2">
								<Button type="submit" name="decision" value="rejected" variant="destructive">
									{t(locale, 'common.reject')}
								</Button>
								<Button type="submit" name="decision" value="approved">
									{t(locale, 'onboarding.review.approveApply')}
								</Button>
							</div>
						</form>
					{:else}
						<p class="text-sm text-muted-foreground">{t(locale, 'onboarding.review.waiting')}</p>
					{/if}
				</div>
			{:else}
				<div class="py-8 text-center text-sm text-muted-foreground">
					{t(locale, 'onboarding.review.empty')}
				</div>
			{/each}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<HistoryIcon class="size-4" />
				{t(locale, 'onboarding.review.history')}
			</Card.Title>
			<Card.Description>
				{t(locale, 'onboarding.review.historyCount', { count: historyRequests.length })}
			</Card.Description>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			{#each historyRequests as request (request.organisation_change_request_uuid)}
				{@const payload = asPayload(request)}
				<div class="rounded-lg border border-border p-3">
					<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
						<p class="text-sm font-medium capitalize">
							{request.section} · {payload.operation}
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
					<details class="text-sm">
						<summary class="cursor-pointer text-muted-foreground">
							{t(locale, 'onboarding.review.viewDiff')}
						</summary>
						<dl class="mt-2 grid gap-2 sm:grid-cols-2">
							{#each fieldEntries(payload) as [key, value] (key)}
								<div>
									<dt class="text-xs text-muted-foreground capitalize">
										{key.replaceAll('_', ' ')}
									</dt>
									<dd class="font-medium break-all">{formatValue(value)}</dd>
								</div>
							{/each}
						</dl>
					</details>
				</div>
			{:else}
				<p class="py-4 text-center text-sm text-muted-foreground">
					{t(locale, 'onboarding.review.historyEmpty')}
				</p>
			{/each}
		</Card.Content>
	</Card.Root>
</div>
