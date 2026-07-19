<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import BanknoteIcon from '@lucide/svelte/icons/banknote';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import DeleteIcon from '@lucide/svelte/icons/delete';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import ScanLineIcon from '@lucide/svelte/icons/scan-line';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
	import TicketIcon from '@lucide/svelte/icons/ticket';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
	import PosScanMethodDialog from '$lib/components/store/pos-scan-method-dialog.svelte';
	import ProductBarcodeScanner from '$lib/components/store/product-barcode-scanner.svelte';
	import CustomerFormSheet from '$lib/components/store/customer-form-sheet.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { productCodeMatches } from '$lib/barcodes';
	import { billTotals } from '$lib/pos';
	import { PAYMENT_METHODS } from '$lib/schemas/pos-billing';
	import { t, type Locale, type MessageKey } from '$lib/i18n';
	import type {
		PosCatalogProduct,
		StoreBill,
		StoreBillPaymentMethod,
		StoreCustomer
	} from '$lib/types/platform';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locale = $derived(data.locale as Locale);
	const currencyCode = $derived(data.storeContext.store.currency_code);
	const storeName = $derived(data.storeContext.store.name);
	const counterLabel = $derived(data.activeCounter?.name ?? 'Counter');

	type CompletedBill = NonNullable<
		Extract<NonNullable<ActionData>, { completedBill: unknown }>['completedBill']
	>;

	let activeBillUuid = $state<string | null>(null);
	let searchQuery = $state('');
	let searchOpen = $state(false);
	let paymentMethod = $state<StoreBillPaymentMethod>('cash');
	let payInput = $state('');
	let payInputTouched = $state(false);
	let lastPaySyncKey: string | null = null;
	let searchInputEl = $state<HTMLInputElement | null>(null);
	let receiptOpen = $state(false);
	let completedBill = $state<CompletedBill | null>(null);
	let scanMethodOpen = $state(false);
	let cameraScannerOpen = $state(false);
	let scannerReady = $state(false);
	let scanFeedback = $state<string | null>(null);
	let pendingScanProductUuid = $state('');
	let cartBusy = $state(false);
	let paymentBusy = $state(false);
	let addingProductName = $state<string | null>(null);
	let customerQuery = $state('');
	let customerSearchOpen = $state(false);
	let customerHighlight = $state(-1);
	let searchHighlight = $state(-1);
	let customerCreateOpen = $state(false);
	let customerCreateDefaults = $state<{ full_name?: string | null; phone?: string | null } | null>(
		null
	);
	let productSearchRoot: HTMLDivElement | null = $state(null);
	let customerSearchRoot: HTMLDivElement | null = $state(null);
	let lastFormToastKey: string | null = null;
	let pendingLinkedCustomerName: string | null = null;
	let voidConfirmOpen = $state(false);

	const activeBill = $derived(
		data.bills.find((bill) => bill.store_bill_uuid === activeBillUuid) ?? data.bills[0] ?? null
	);

	const totals = $derived(
		activeBill
			? billTotals(activeBill)
			: { totalCents: 0, paidCents: 0, pendingCents: 0, changeCents: 0 }
	);

	const searchResults = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return data.catalog.slice(0, 8);
		return data.catalog
			.filter((product) =>
				[product.name, product.sku, product.gtin, product.brand]
					.filter(Boolean)
					.some((value) => value!.toLowerCase().includes(query))
			)
			.slice(0, 10);
	});

	const payAmountCents = $derived.by(() => {
		const normalized = payInput.replace(/[^\d.]/g, '');
		const raw = normalized ? Number(normalized) : totals.pendingCents / 100;
		if (!Number.isFinite(raw) || raw <= 0) return 0;
		let cents = Math.round(raw * 100);
		if (paymentMethod !== 'cash' && totals.pendingCents > 0) {
			cents = Math.min(cents, totals.pendingCents);
		}
		return cents;
	});

	const canTakePayment = $derived(
		!!activeBill &&
			!paymentBusy &&
			totals.totalCents > 0 &&
			totals.pendingCents > 0 &&
			payAmountCents > 0
	);
	const canComplete = $derived(
		!!activeBill &&
			!paymentBusy &&
			totals.totalCents > 0 &&
			totals.paidCents >= totals.totalCents
	);

	$effect(() => {
		if (form && 'activeBillUuid' in form) {
			activeBillUuid = form.activeBillUuid ?? null;
		}
		if (form && 'completedBill' in form && form.completedBill) {
			completedBill = form.completedBill;
			receiptOpen = true;
		}
	});

	$effect(() => {
		if (!form || !('message' in form) || typeof form.message !== 'string' || !form.message) return;
		const key = `${String(form.success)}:${form.message}`;
		if (key === lastFormToastKey) return;
		lastFormToastKey = key;
		if (form.success === false) toast.error(form.message);
		else toast.success(form.message);
	});

	$effect(() => {
		searchResults;
		searchHighlight = searchResults.length ? 0 : -1;
	});

	$effect(() => {
		if (!activeBillUuid && data.bills[0]) {
			activeBillUuid = data.bills[0].store_bill_uuid;
		} else if (
			activeBillUuid &&
			!data.bills.some((bill) => bill.store_bill_uuid === activeBillUuid)
		) {
			activeBillUuid = data.bills[0]?.store_bill_uuid ?? null;
		}
	});

	$effect(() => {
		const bill = activeBill;
		if (!bill) {
			lastPaySyncKey = null;
			payInputTouched = false;
			payInput = '';
			return;
		}
		const pending = billTotals(bill).pendingCents;
		const syncKey = `${bill.store_bill_uuid}:${pending}`;
		if (syncKey === lastPaySyncKey) return;
		lastPaySyncKey = syncKey;
		payInputTouched = false;
		payInput = pending > 0 ? (pending / 100).toFixed(2) : '';
	});

	function money(cents: number) {
		return new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: currencyCode
		}).format(cents / 100);
	}

	function methodLabel(method: StoreBillPaymentMethod) {
		return t(locale, `storeApp.pos.method.${method}` as MessageKey);
	}

	function appendPay(key: string) {
		if (key === 'C') {
			payInputTouched = true;
			payInput = '';
			return;
		}
		if (key === 'Backspace' || key === '⌫') {
			payInputTouched = true;
			payInput = payInput.slice(0, -1);
			return;
		}

		const digit = key === 'Decimal' || key === 'NumpadDecimal' ? '.' : key;
		if (!/^[0-9.]$/.test(digit)) return;

		// Prefill has two decimals — start a fresh amount on first digit/decimal.
		if (!payInputTouched) {
			payInputTouched = true;
			payInput = digit === '.' ? '0.' : digit;
			return;
		}

		if (digit === '.' && payInput.includes('.')) return;
		if (payInput.includes('.') && (payInput.split('.')[1]?.length ?? 0) >= 2) return;
		if (digit !== '.' && !payInput.includes('.') && payInput === '0') {
			payInput = digit;
			return;
		}
		payInput = `${payInput}${digit}`;
	}

	function fillRemaining() {
		payInputTouched = true;
		payInput = totals.pendingCents > 0 ? (totals.pendingCents / 100).toFixed(2) : '';
	}

	function fillHalf() {
		payInputTouched = true;
		if (totals.pendingCents <= 0) {
			payInput = '';
			return;
		}
		payInput = (Math.ceil(totals.pendingCents / 2) / 100).toFixed(2);
	}

	function formatReceiptDate(value: string | null | undefined) {
		if (!value) return '';
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function printReceipt() {
		if (!completedBill) return;
		queueMicrotask(() => window.print());
	}

	function selectBill(bill: StoreBill) {
		activeBillUuid = bill.store_bill_uuid;
		payInputTouched = false;
		payInput = '';
		lastPaySyncKey = null;
	}

	function focusSearch() {
		searchOpen = true;
		queueMicrotask(() => searchInputEl?.focus());
	}

	function exactProductMatch(query: string): PosCatalogProduct | null {
		const normalized = query.trim();
		if (!normalized) return null;
		return data.catalog.find((product) => productCodeMatches(normalized, product)) ?? null;
	}

	function submitProduct(product: PosCatalogProduct) {
		if (!activeBill) {
			scanFeedback = t(locale, 'storeApp.pos.scanNeedBill');
			return;
		}
		if (cartBusy) return;
		cartBusy = true;
		addingProductName = product.name;
		pendingScanProductUuid = product.store_product_uuid;
		queueMicrotask(() => {
			(document.getElementById('scan-add-line') as HTMLFormElement | null)?.requestSubmit();
		});
		searchQuery = '';
		searchOpen = false;
		scannerReady = false;
		scanFeedback = null;
	}

	async function refreshBillsAfterAction() {
		await invalidate('store:billing:bills');
	}

	async function refreshCustomersAfterAction() {
		await invalidate('store:billing:customers');
	}

	const customerMatches = $derived.by(() => {
		const query = customerQuery.trim().toLowerCase();
		const active = data.customers.filter((customer) => customer.status === 'active');
		if (!query) return active.slice(0, 8);
		return active
			.filter((customer) =>
				[customer.phone, customer.full_name, customer.email]
					.filter(Boolean)
					.some((value) => value!.toLowerCase().includes(query))
			)
			.slice(0, 8);
	});

	$effect(() => {
		customerMatches;
		customerHighlight = customerMatches.length ? 0 : -1;
	});

	function applyCustomerToBill(customer: StoreCustomer) {
		if (!activeBill) return;
		const formEl = document.getElementById('assign-customer-form') as HTMLFormElement | null;
		const nameInput = formEl?.querySelector(
			'input[name="customer_name"]'
		) as HTMLInputElement | null;
		const phoneInput = formEl?.querySelector(
			'input[name="customer_phone"]'
		) as HTMLInputElement | null;
		const idInput = formEl?.querySelector(
			'input[name="store_customer_uuid"]'
		) as HTMLInputElement | null;
		if (nameInput) nameInput.value = customer.full_name;
		if (phoneInput) phoneInput.value = customer.phone;
		if (idInput) idInput.value = customer.store_customer_uuid;
		pendingLinkedCustomerName = customer.full_name;
		formEl?.requestSubmit();
		customerQuery = '';
		customerSearchOpen = false;
	}

	function clearBillCustomer() {
		if (!activeBill) return;
		const formEl = document.getElementById('assign-customer-form') as HTMLFormElement | null;
		const nameInput = formEl?.querySelector(
			'input[name="customer_name"]'
		) as HTMLInputElement | null;
		const phoneInput = formEl?.querySelector(
			'input[name="customer_phone"]'
		) as HTMLInputElement | null;
		const idInput = formEl?.querySelector(
			'input[name="store_customer_uuid"]'
		) as HTMLInputElement | null;
		if (nameInput) nameInput.value = '';
		if (phoneInput) phoneInput.value = '';
		if (idInput) idInput.value = '';
		pendingLinkedCustomerName = null;
		formEl?.requestSubmit();
		customerQuery = '';
		customerSearchOpen = false;
	}

	function openAddCustomer() {
		customerCreateDefaults = {
			phone: customerQuery.trim() || activeBill?.customer_phone || '',
			full_name: activeBill?.customer_name || ''
		};
		customerCreateOpen = true;
		customerSearchOpen = false;
	}

	function addProductByCode(code: string) {
		const trimmed = code.trim();
		if (!trimmed) return;
		if (!activeBill) {
			scanFeedback = t(locale, 'storeApp.pos.scanNeedBill');
			return;
		}
		const product = exactProductMatch(trimmed);
		if (!product) {
			searchQuery = trimmed;
			searchOpen = true;
			scannerReady = false;
			scanFeedback = t(locale, 'storeApp.pos.scanNoMatch', { code: trimmed });
			focusSearch();
			return;
		}
		submitProduct(product);
	}

	function openScanMethods() {
		scanFeedback = null;
		scanMethodOpen = true;
	}

	function openCameraScanner() {
		cameraScannerOpen = true;
	}

	function armHandheldScanner() {
		scannerReady = true;
		scanFeedback = t(locale, 'storeApp.pos.scannerReady');
		focusSearch();
	}

	function onSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			if (!searchResults.length) return;
			event.preventDefault();
			searchOpen = true;
			searchHighlight = (searchHighlight + 1) % searchResults.length;
			return;
		}
		if (event.key === 'ArrowUp') {
			if (!searchResults.length) return;
			event.preventDefault();
			searchOpen = true;
			searchHighlight =
				searchHighlight <= 0 ? searchResults.length - 1 : searchHighlight - 1;
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			if (searchOpen && searchHighlight >= 0 && searchResults[searchHighlight] && activeBill) {
				submitProduct(searchResults[searchHighlight]);
				return;
			}
			const exact = exactProductMatch(searchQuery);
			const product = exact ?? (scannerReady ? null : searchResults[0]);
			if (exact) {
				submitProduct(exact);
				return;
			}
			if (scannerReady) {
				addProductByCode(searchQuery);
				return;
			}
			if (product && activeBill) {
				submitProduct(product);
			}
			return;
		}
		if (event.key === 'Escape') {
			searchOpen = false;
			searchQuery = '';
			scannerReady = false;
			scanFeedback = null;
		}
	}

	function onCustomerKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			if (!customerMatches.length) return;
			event.preventDefault();
			customerSearchOpen = true;
			customerHighlight = (customerHighlight + 1) % customerMatches.length;
			return;
		}
		if (event.key === 'ArrowUp') {
			if (!customerMatches.length) return;
			event.preventDefault();
			customerSearchOpen = true;
			customerHighlight =
				customerHighlight <= 0 ? customerMatches.length - 1 : customerHighlight - 1;
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			const customer = customerMatches[customerHighlight];
			if (customer) applyCustomerToBill(customer);
			return;
		}
		if (event.key === 'Escape') {
			customerSearchOpen = false;
			customerQuery = '';
		}
	}

	function voidActiveBill() {
		if (!activeBill) return;
		voidConfirmOpen = true;
	}

	function confirmVoidBill() {
		if (!activeBill) return;
		(
			document.getElementById(
				`void-bill-${activeBill.store_bill_uuid}`
			) as HTMLFormElement | null
		)?.requestSubmit();
	}

	$effect(() => {
		function onKeydown(event: KeyboardEvent) {
			const target = event.target as HTMLElement | null;
			const tag = target?.tagName;
			const typing =
				tag === 'INPUT' || tag === 'TEXTAREA' || Boolean(target?.isContentEditable);

			if (event.key === 'F1') {
				event.preventDefault();
				focusSearch();
				return;
			}
			if (event.key === 'F3') {
				event.preventDefault();
				openScanMethods();
				return;
			}
			if (event.key === 'F2') {
				event.preventDefault();
				(document.getElementById('create-bill-form') as HTMLFormElement | null)?.requestSubmit();
				return;
			}
			if (event.key === 'F4' && activeBill) {
				event.preventDefault();
				voidActiveBill();
				return;
			}
			if (event.key === 'F9' && activeBill) {
				event.preventDefault();
				(
					document.getElementById(
						`charge-bill-${activeBill.store_bill_uuid}`
					) as HTMLFormElement | null
				)?.requestSubmit();
				return;
			}
			if (event.key === 'F11') {
				event.preventDefault();
				focusSearch();
				return;
			}

			if (typing || receiptOpen || scanMethodOpen || cameraScannerOpen) return;

			if (event.key === 'Enter') {
				if (!canTakePayment || paymentBusy) return;
				event.preventDefault();
				(document.getElementById('add-payment-form') as HTMLFormElement | null)?.requestSubmit();
				return;
			}

			if (event.key === 'Backspace' || event.key === 'Delete') {
				event.preventDefault();
				appendPay('Backspace');
				return;
			}
			if (event.key === '.' || event.key === 'Decimal' || event.code === 'NumpadDecimal') {
				event.preventDefault();
				appendPay('.');
				return;
			}
			const digit =
				event.key >= '0' && event.key <= '9'
					? event.key
					: event.code.startsWith('Numpad') && event.code.length === 7
						? event.code.slice(-1)
						: null;
			if (digit && digit >= '0' && digit <= '9') {
				event.preventDefault();
				appendPay(digit);
			}
		}

		function onPointerDown(event: PointerEvent) {
			const target = event.target as Node | null;
			if (!target) return;
			if (searchOpen && productSearchRoot && !productSearchRoot.contains(target)) {
				searchOpen = false;
			}
			if (customerSearchOpen && customerSearchRoot && !customerSearchRoot.contains(target)) {
				customerSearchOpen = false;
			}
		}

		window.addEventListener('keydown', onKeydown);
		window.addEventListener('pointerdown', onPointerDown);
		return () => {
			window.removeEventListener('keydown', onKeydown);
			window.removeEventListener('pointerdown', onPointerDown);
		};
	});

	const keypad = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'] as const;
</script>

<div class="pos-shell print:hidden -m-4 flex min-h-[calc(100svh-3.5rem)] flex-col bg-background md:-m-6">
	<form
		id="scan-add-line"
		method="POST"
		action="?/addLine"
		class="hidden"
		use:enhance={() => {
			cartBusy = true;
			const productName = addingProductName;
			return async ({ result, update }) => {
				try {
					await refreshBillsAfterAction();
					await update({ reset: false, invalidateAll: false });
					if (result.type === 'success') {
						toast.success(
							productName
								? t(locale, 'storeApp.pos.productAdded', { name: productName })
								: t(locale, 'storeApp.pos.productAddedGeneric')
						);
					} else if (result.type === 'failure') {
						const message =
							typeof result.data?.message === 'string'
								? result.data.message
								: t(locale, 'storeApp.pos.addFailed');
						toast.error(message);
					}
				} finally {
					cartBusy = false;
					addingProductName = null;
					pendingScanProductUuid = '';
				}
			};
		}}
	>
		{#if activeBill}
			<input type="hidden" name="store_bill_uuid" value={activeBill.store_bill_uuid} />
		{/if}
		<input type="hidden" name="store_product_uuid" value={pendingScanProductUuid} />
		<input type="hidden" name="quantity" value="1" />
	</form>
	<header
		class="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
	>
		<div class="min-w-0">
			<p class="text-xs tracking-[0.18em] text-muted-foreground uppercase">
				{t(locale, 'storeApp.pos.workspace')}
			</p>
			<div class="mt-1 flex flex-wrap items-center gap-2">
				<h1 class="text-lg font-semibold tracking-tight">
					{#if activeBill}
						{t(locale, 'storeApp.pos.activeBill', { number: activeBill.bill_number })}
					{:else}
						{t(locale, 'storeApp.pos.title')}
					{/if}
				</h1>
				<Badge variant="secondary">{counterLabel}</Badge>
				<Badge variant="outline">{data.storeContext.membership.display_name}</Badge>
			</div>
		</div>

		<div class="flex w-full max-w-xl items-center gap-2">
			<div class="relative min-w-0 flex-1" bind:this={productSearchRoot}>
				<SearchIcon
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:ref={searchInputEl}
					bind:value={searchQuery}
					class="h-11 ps-9 font-mono {scannerReady ? 'ring-2 ring-primary' : ''}"
					placeholder={t(locale, 'storeApp.pos.searchPlaceholder')}
					onfocus={() => (searchOpen = true)}
					onkeydown={onSearchKeydown}
				/>
				{#if searchOpen}
					<div
						class="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-border bg-popover p-2 shadow-lg"
						role="listbox"
						aria-label={t(locale, 'storeApp.pos.searchPlaceholder')}
					>
						{#each searchResults as product, index (product.store_product_uuid)}
							<button
								type="button"
								role="option"
								aria-selected={searchHighlight === index}
								class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start hover:bg-muted disabled:pointer-events-none disabled:opacity-50 {searchHighlight ===
								index
									? 'bg-muted'
									: ''}"
								disabled={!activeBill}
								onmousedown={(event) => event.preventDefault()}
								onmouseenter={() => (searchHighlight = index)}
								onclick={() => submitProduct(product)}
							>
								<span class="min-w-0">
									<span class="block truncate text-sm font-medium">{product.name}</span>
									<span class="block font-mono text-xs text-muted-foreground">
										{product.sku}
										{#if product.gtin}
											· {product.gtin}
										{/if}
									</span>
								</span>
								<span class="shrink-0 text-sm font-semibold">{money(product.price_cents)}</span>
							</button>
						{:else}
							<p class="px-3 py-6 text-center text-sm text-muted-foreground">
								{t(locale, 'storeApp.pos.noProducts')}
							</p>
						{/each}
					</div>
				{/if}
			</div>
			<Button
				type="button"
				variant="outline"
				class="h-11 shrink-0 gap-2"
				onclick={openScanMethods}
				disabled={!activeBill}
			>
				<ScanLineIcon class="size-4" />
				<span class="hidden sm:inline">{t(locale, 'storeApp.pos.scan')}</span>
			</Button>
		</div>

		<div class="hidden items-center gap-2 text-xs text-muted-foreground xl:flex">
			<span class="rounded-md border border-border px-2 py-1"
				>F1 {t(locale, 'storeApp.pos.shortcutSearch')}</span
			>
			<span class="rounded-md border border-border px-2 py-1"
				>F3 {t(locale, 'storeApp.pos.scan')}</span
			>
			<span class="rounded-md border border-border px-2 py-1"
				>F2 {t(locale, 'storeApp.pos.shortcutNew')}</span
			>
			<span class="rounded-md border border-border px-2 py-1"
				>F4 {t(locale, 'storeApp.pos.shortcutVoid')}</span
			>
			<span class="rounded-md border border-border px-2 py-1"
				>F9 {t(locale, 'storeApp.pos.shortcutCharge')}</span
			>
		</div>
	</header>

	{#if scanFeedback}
		<div class="border-b border-border bg-primary/5 px-4 py-2 text-sm text-foreground" role="status">
			{scanFeedback}
		</div>
	{/if}

	<div
		class="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(280px,1.1fr)_minmax(320px,1.2fr)_minmax(260px,0.9fr)]"
	>
		<section class="flex min-h-0 flex-col border-b border-border xl:border-r xl:border-b-0">
			<div class="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
				<div class="min-w-0">
					<p class="text-sm font-semibold">
						{activeBill?.customer_name || t(locale, 'storeApp.pos.walkIn')}
					</p>
					<p class="text-xs text-muted-foreground">
						{activeBill?.customer_phone || t(locale, 'storeApp.pos.noPhone')}
					</p>
				</div>
				<form id="create-bill-form" method="POST" action="?/createBill" use:enhance>
					<Button type="submit" size="sm" variant="outline">
						<PlusIcon class="size-4" />
						{t(locale, 'storeApp.pos.newBill')}
					</Button>
				</form>
			</div>

			{#if activeBill}
				<form
					id="assign-customer-form"
					method="POST"
					action="?/updateCustomer"
					class="hidden"
					use:enhance={() => {
						return async ({ result, update }) => {
							await refreshBillsAfterAction();
							await update({ reset: false, invalidateAll: false });
							if (result.type === 'success' && pendingLinkedCustomerName) {
								toast.success(
									t(locale, 'storeApp.pos.customerLinked', {
										name: pendingLinkedCustomerName
									})
								);
							} else if (result.type === 'failure') {
								toast.error(
									typeof result.data?.message === 'string'
										? result.data.message
										: t(locale, 'storeApp.customers.saveFailed')
								);
							}
							pendingLinkedCustomerName = null;
						};
					}}
				>
					<input type="hidden" name="store_bill_uuid" value={activeBill.store_bill_uuid} />
					<input type="hidden" name="customer_name" value={activeBill.customer_name ?? ''} />
					<input type="hidden" name="customer_phone" value={activeBill.customer_phone ?? ''} />
					<input
						type="hidden"
						name="store_customer_uuid"
						value={activeBill.store_customer_uuid ?? ''}
					/>
				</form>

				<div class="border-b border-border px-4 py-3">
					<p class="mb-2 text-xs font-medium text-muted-foreground">
						{t(locale, 'storeApp.pos.customerSearch')}
					</p>
					<div class="relative" bind:this={customerSearchRoot}>
						<SearchIcon
							class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							bind:value={customerQuery}
							class="h-10 ps-9"
							placeholder={t(locale, 'storeApp.pos.customerSearchPlaceholder')}
							onfocus={() => (customerSearchOpen = true)}
							oninput={() => (customerSearchOpen = true)}
							onkeydown={onCustomerKeydown}
						/>
						{#if customerSearchOpen}
							<div
								class="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-border bg-popover p-2 shadow-lg"
								role="listbox"
							>
								{#each customerMatches as customer, index (customer.store_customer_uuid)}
									<button
										type="button"
										role="option"
										aria-selected={customerHighlight === index}
										class="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-start hover:bg-muted {customerHighlight ===
										index
											? 'bg-muted'
											: ''}"
										onmousedown={(event) => event.preventDefault()}
										onmouseenter={() => (customerHighlight = index)}
										onclick={() => applyCustomerToBill(customer)}
									>
										<span class="text-sm font-medium">{customer.full_name}</span>
										<span class="font-mono text-xs text-muted-foreground">{customer.phone}</span>
									</button>
								{:else}
									<p class="px-3 py-4 text-center text-sm text-muted-foreground">
										{t(locale, 'storeApp.pos.customerNoMatch')}
									</p>
								{/each}
								<div class="mt-1 grid gap-1 border-t border-border pt-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										class="justify-start"
										onclick={openAddCustomer}
									>
										<PlusIcon class="size-4" />
										{t(locale, 'storeApp.pos.addCustomer')}
									</Button>
									{#if activeBill.customer_phone || activeBill.store_customer_uuid}
										<Button
											type="button"
											variant="ghost"
											size="sm"
											class="justify-start"
											onclick={clearBillCustomer}
										>
											{t(locale, 'storeApp.pos.clearCustomer')}
										</Button>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<div class="relative min-h-0 flex-1 overflow-auto">
				{#if cartBusy}
					<div
						class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-[1px]"
						role="status"
						aria-live="polite"
					>
						<Loader2Icon class="size-6 animate-spin text-primary" />
						<p class="px-4 text-center text-sm text-muted-foreground">
							{#if addingProductName}
								{t(locale, 'storeApp.pos.addingProduct', { name: addingProductName })}
							{:else}
								{t(locale, 'storeApp.pos.updatingCart')}
							{/if}
						</p>
					</div>
				{/if}
				{#if activeBill}
					<ul class="divide-y divide-border" class:opacity-60={cartBusy}>
						{#each activeBill.lines as line (line.store_bill_line_uuid)}
							<li class="flex items-start gap-3 px-4 py-3">
								<div
									class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold"
								>
									{line.quantity}
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">{line.product_name}</p>
									<p class="font-mono text-xs text-muted-foreground">{line.sku}</p>
									<div class="mt-2 flex items-center gap-2">
										<form method="POST" action="?/updateLine" use:enhance>
											<input
												type="hidden"
												name="store_bill_line_uuid"
												value={line.store_bill_line_uuid}
											/>
											<input type="hidden" name="quantity" value={Math.max(line.quantity - 1, 1)} />
											<Button
												type="submit"
												size="icon"
												variant="outline"
												class="size-7"
												disabled={line.quantity <= 1}
											>
												<MinusIcon class="size-3.5" />
											</Button>
										</form>
										<form method="POST" action="?/updateLine" use:enhance>
											<input
												type="hidden"
												name="store_bill_line_uuid"
												value={line.store_bill_line_uuid}
											/>
											<input type="hidden" name="quantity" value={line.quantity + 1} />
											<Button type="submit" size="icon" variant="outline" class="size-7">
												<PlusIcon class="size-3.5" />
											</Button>
										</form>
										<form method="POST" action="?/removeLine" use:enhance>
											<input
												type="hidden"
												name="store_bill_line_uuid"
												value={line.store_bill_line_uuid}
											/>
											<Button type="submit" size="icon" variant="ghost" class="size-7">
												<Trash2Icon class="size-3.5" />
											</Button>
										</form>
									</div>
								</div>
								<p class="shrink-0 text-sm font-semibold">{money(line.line_total_cents)}</p>
							</li>
						{:else}
							<li class="px-4 py-16 text-center text-sm text-muted-foreground">
								{t(locale, 'storeApp.pos.emptyCart')}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="px-4 py-16 text-center text-sm text-muted-foreground">
						{t(locale, 'storeApp.pos.noBill')}
					</p>
				{/if}
			</div>

			<div class="grid grid-cols-3 gap-2 border-t border-border bg-muted/30 px-4 py-3 text-sm">
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'storeApp.pos.paid')}</p>
					<p class="font-semibold">{money(totals.paidCents)}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'storeApp.pos.pending')}</p>
					<p class="font-semibold">{money(totals.pendingCents)}</p>
				</div>
				<div>
					<p class="text-xs text-muted-foreground">{t(locale, 'storeApp.pos.total')}</p>
					<p class="text-base font-bold">{money(totals.totalCents)}</p>
				</div>
			</div>
		</section>

		<section class="relative flex min-h-0 flex-col border-b border-border xl:border-r xl:border-b-0">
			{#if paymentBusy}
				<div
					class="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/70 backdrop-blur-[1px]"
					role="status"
					aria-live="polite"
				>
					<Loader2Icon class="size-6 animate-spin text-primary" />
					<p class="px-4 text-center text-sm text-muted-foreground">
						{t(locale, 'storeApp.pos.recordingPayment')}
					</p>
				</div>
			{/if}
			<div class="border-b border-border px-4 py-3">
				<p class="text-xs tracking-[0.16em] text-muted-foreground uppercase">
					{t(locale, 'storeApp.pos.checkout')}
				</p>
				<p class="mt-1 text-2xl font-semibold tracking-tight">{money(totals.totalCents)}</p>
			</div>

			<div class="grid grid-cols-3 gap-2 px-4 py-3">
				<div class="rounded-lg border border-border p-3">
					<p class="text-[11px] text-muted-foreground">{t(locale, 'storeApp.pos.pending')}</p>
					<p class="mt-1 text-lg font-semibold">{money(totals.pendingCents)}</p>
				</div>
				<div class="rounded-lg border border-primary bg-primary/5 p-3 ring-1 ring-primary/30">
					<p class="text-[11px] text-muted-foreground">{t(locale, 'storeApp.pos.toPay')}</p>
					<p class="mt-1 text-lg font-semibold tabular-nums">
						{#if payInputTouched && payInput !== ''}
							{money(payAmountCents)}
						{:else if payInputTouched && payInput === ''}
							{money(0)}
						{:else}
							{money(payAmountCents || totals.pendingCents)}
						{/if}
					</p>
					{#if payInputTouched}
						<p class="mt-0.5 font-mono text-[11px] text-muted-foreground">
							{payInput || '0'}
						</p>
					{/if}
				</div>
				<div class="rounded-lg border border-border p-3">
					<p class="text-[11px] text-muted-foreground">{t(locale, 'storeApp.pos.return')}</p>
					<p class="mt-1 text-lg font-semibold">{money(totals.changeCents)}</p>
				</div>
			</div>

			<div class="flex flex-wrap gap-2 px-4 pt-2">
				<Button type="button" size="sm" variant="outline" onclick={fillRemaining} disabled={totals.pendingCents <= 0}>
					{t(locale, 'storeApp.pos.payRemaining')}
				</Button>
				<Button type="button" size="sm" variant="outline" onclick={fillHalf} disabled={totals.pendingCents <= 0}>
					{t(locale, 'storeApp.pos.payHalf')}
				</Button>
			</div>

			<div class="grid gap-4 px-4 pb-4 lg:grid-cols-[1fr_12rem]">
				<div class="flex flex-col gap-2">
					<p class="text-xs font-medium text-muted-foreground">
						{t(locale, 'storeApp.pos.paymentMethod')}
					</p>
					{#each PAYMENT_METHODS as method (method)}
						<button
							type="button"
							class="flex items-center gap-3 rounded-xl border px-3 py-3 text-start transition-colors {paymentMethod ===
							method
								? 'border-primary bg-primary/5'
								: 'border-border'}"
							onclick={() => (paymentMethod = method)}
						>
							{#if method === 'cash'}
								<BanknoteIcon class="size-4" />
							{:else if method === 'card'}
								<CreditCardIcon class="size-4" />
							{:else if method === 'upi'}
								<SmartphoneIcon class="size-4" />
							{:else}
								<TicketIcon class="size-4" />
							{/if}
							<span class="text-sm font-medium">{methodLabel(method)}</span>
						</button>
					{/each}
				</div>

				<div class="grid grid-cols-3 gap-2">
					{#each keypad as key (key)}
						<Button
							type="button"
							variant={key === '⌫' ? 'secondary' : 'outline'}
							class="h-12 text-base"
							onclick={() => appendPay(key)}
						>
							{#if key === '⌫'}
								<DeleteIcon class="size-4" />
							{:else}
								{key}
							{/if}
						</Button>
					{/each}
					<Button
						type="button"
						variant="secondary"
						class="col-span-3 h-11"
						onclick={() => appendPay('C')}
					>
						{t(locale, 'storeApp.pos.clearAmount')}
					</Button>
				</div>
			</div>

			<div class="mt-auto flex flex-col gap-2 border-t border-border p-4">
				{#if activeBill}
					<form
						id="add-payment-form"
						method="POST"
						action="?/addPayment"
						use:enhance={() => {
							if (paymentBusy) return async () => undefined;
							paymentBusy = true;
							const amountLabel = money(payAmountCents);
							const method = methodLabel(paymentMethod);
							return async ({ result, update }) => {
								try {
									await refreshBillsAfterAction();
									await update({ reset: false, invalidateAll: false });
									if (result.type === 'success') {
										payInputTouched = false;
										lastPaySyncKey = null;
										toast.success(
											t(locale, 'storeApp.pos.paymentRecorded', {
												method,
												amount: amountLabel
											})
										);
										paymentMethod =
											paymentMethod === 'cash'
												? 'card'
												: paymentMethod === 'card'
													? 'upi'
													: paymentMethod;
									} else if (result.type === 'failure') {
										toast.error(
											typeof result.data?.message === 'string'
												? result.data.message
												: t(locale, 'storeApp.pos.paymentFailed')
										);
									}
								} finally {
									paymentBusy = false;
								}
							};
						}}
						class="grid gap-2"
					>
						<input type="hidden" name="store_bill_uuid" value={activeBill.store_bill_uuid} />
						<input type="hidden" name="payment_method" value={paymentMethod} />
						<input type="hidden" name="amount" value={(payAmountCents / 100).toFixed(2)} />
						<Button type="submit" class="h-12 w-full text-base" disabled={!canTakePayment}>
							{#if paymentBusy}
								<Loader2Icon class="size-4 animate-spin" />
							{/if}
							{t(locale, 'storeApp.pos.addSplitPayment', {
								method: methodLabel(paymentMethod),
								amount: money(payAmountCents)
							})}
						</Button>
					</form>

					{#if canComplete}
						<p class="text-center text-xs text-muted-foreground">
							{t(locale, 'storeApp.pos.readyToComplete')}
						</p>
					{:else if totals.paidCents > 0}
						<p class="text-center text-xs text-muted-foreground">
							{t(locale, 'storeApp.pos.splitProgress', {
								paid: money(totals.paidCents),
								pending: money(totals.pendingCents)
							})}
						</p>
					{/if}

					<div class="grid grid-cols-2 gap-2">
						<form
							id={`hold-bill-${activeBill.store_bill_uuid}`}
							method="POST"
							action="?/holdBill"
							use:enhance
						>
							<input type="hidden" name="store_bill_uuid" value={activeBill.store_bill_uuid} />
							<Button type="submit" variant="outline" class="w-full">
								{t(locale, 'storeApp.pos.hold')}
							</Button>
						</form>
						<form
							id={`charge-bill-${activeBill.store_bill_uuid}`}
							method="POST"
							action="?/chargeBill"
							use:enhance={() => {
								return async ({ result, update }) => {
									await update();
									payInput = '';
									if (result.type === 'success' && result.data && 'completedBill' in result.data) {
										completedBill = result.data.completedBill as CompletedBill;
										receiptOpen = true;
									}
								};
							}}
						>
							<input type="hidden" name="store_bill_uuid" value={activeBill.store_bill_uuid} />
							<Button type="submit" class="w-full" disabled={!canComplete}>
								{t(locale, 'storeApp.pos.charge', { number: activeBill.bill_number })}
							</Button>
						</form>
					</div>
				{/if}
			</div>
		</section>

		<section class="flex min-h-0 flex-col">
			<div class="border-b border-border px-4 py-3">
				<p class="text-sm font-semibold">{t(locale, 'storeApp.pos.payments')}</p>
				<p class="text-xs text-muted-foreground">{t(locale, 'storeApp.pos.paymentsHint')}</p>
			</div>
			<div class="min-h-0 flex-1 overflow-auto">
				{#if activeBill?.payments.length}
					<ul class="divide-y divide-border">
						{#each activeBill.payments as payment (payment.store_bill_payment_uuid)}
							<li class="flex items-center justify-between gap-3 px-4 py-3">
								<div>
									<p class="text-sm font-medium">{methodLabel(payment.payment_method)}</p>
									<p class="text-xs text-muted-foreground">
										{new Intl.DateTimeFormat(undefined, {
											timeStyle: 'short'
										}).format(new Date(payment.created_at))}
									</p>
								</div>
								<p class="font-semibold">{money(payment.amount_cents)}</p>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="px-4 py-16 text-center text-sm text-muted-foreground">
						{t(locale, 'storeApp.pos.noPayments')}
					</p>
				{/if}
			</div>
			{#if activeBill}
				<div class="grid gap-2 border-t border-border p-4">
					<form method="POST" action="?/clearPayments" use:enhance>
						<input type="hidden" name="store_bill_uuid" value={activeBill.store_bill_uuid} />
						<Button
							type="submit"
							variant="outline"
							class="w-full"
							disabled={!activeBill.payments.length}
						>
							{t(locale, 'storeApp.pos.clearPayments')}
						</Button>
					</form>
					<form
						id={`void-bill-${activeBill.store_bill_uuid}`}
						method="POST"
						action="?/voidBill"
						use:enhance
					>
						<input type="hidden" name="store_bill_uuid" value={activeBill.store_bill_uuid} />
						<Button
							type="button"
							variant="ghost"
							class="w-full text-destructive"
							onclick={() => (voidConfirmOpen = true)}
						>
							{t(locale, 'storeApp.pos.voidBill')}
						</Button>
					</form>
				</div>
			{/if}
		</section>
	</div>

	<footer
		class="flex items-center gap-2 overflow-x-auto border-t border-border bg-muted/20 px-3 py-2"
	>
		{#each data.bills as bill (bill.store_bill_uuid)}
			<button
				type="button"
				class="shrink-0 rounded-lg border px-3 py-2 text-start transition-colors {activeBill?.store_bill_uuid ===
				bill.store_bill_uuid
					? 'border-primary bg-primary/10'
					: 'border-border'}"
				onclick={() => selectBill(bill)}
			>
				<p class="text-xs font-semibold">
					{t(locale, 'storeApp.pos.billTab', { number: bill.bill_number })}
					{#if bill.status === 'held'}
						<span class="text-muted-foreground">· {t(locale, 'storeApp.pos.held')}</span>
					{/if}
				</p>
				<p class="text-[11px] text-muted-foreground">
					{money(billTotals(bill).totalCents)} · {bill.lines.length}
					{t(locale, 'storeApp.pos.items')}
				</p>
			</button>
		{/each}
		<form method="POST" action="?/createBill" use:enhance>
			<Button type="submit" variant="outline" size="sm" class="shrink-0">
				<PlusIcon class="size-4" />
				{t(locale, 'storeApp.pos.addBill')}
			</Button>
		</form>
	</footer>
</div>

<ConfirmDialog
	bind:open={voidConfirmOpen}
	title={t(locale, 'storeApp.pos.voidTitle')}
	description={t(locale, 'storeApp.pos.voidConfirm')}
	confirmLabel={t(locale, 'storeApp.pos.voidBill')}
	cancelLabel={t(locale, 'common.cancel')}
	onConfirm={confirmVoidBill}
/>

<PosScanMethodDialog
	bind:open={scanMethodOpen}
	{locale}
	onCamera={openCameraScanner}
	onScanner={armHandheldScanner}
/>

<ProductBarcodeScanner
	bind:open={cameraScannerOpen}
	{locale}
	readerId="pos-billing-barcode-reader"
	title={t(locale, 'storeApp.pos.scanCameraTitle')}
	description={t(locale, 'storeApp.pos.scanCameraDescription')}
	onScan={addProductByCode}
/>

{#if activeBill}
	<CustomerFormSheet
		bind:open={customerCreateOpen}
		{locale}
		defaults={customerCreateDefaults}
		formId="billing-create-customer-form"
		action="?/createCustomer"
		billUuid={activeBill.store_bill_uuid}
		onSubmitted={async (result, update) => {
			await refreshCustomersAfterAction();
			await refreshBillsAfterAction();
			await update({ reset: false, invalidateAll: false });
			if (result.type === 'success') {
				customerCreateOpen = false;
			}
		}}
	/>
{/if}

{#if completedBill}
	<div class="print:hidden">
		<Dialog.Root bind:open={receiptOpen}>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>
						{t(locale, 'storeApp.pos.receiptTitle', { number: completedBill.bill_number })}
					</Dialog.Title>
					<Dialog.Description>{t(locale, 'storeApp.pos.receiptDescription')}</Dialog.Description>
				</Dialog.Header>

				<div class="rounded-lg border border-border bg-muted/20 p-4 text-sm">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="font-semibold">
								{completedBill.customer_name || t(locale, 'storeApp.pos.walkIn')}
							</p>
							{#if completedBill.customer_phone}
								<p class="text-xs text-muted-foreground">{completedBill.customer_phone}</p>
							{/if}
						</div>
						<p class="text-lg font-bold">{money(completedBill.total_cents)}</p>
					</div>
					<p class="mt-2 text-xs text-muted-foreground">
						{completedBill.payments
							.map((payment) => `${methodLabel(payment.payment_method)} ${money(payment.amount_cents)}`)
							.join(' · ')}
					</p>
				</div>

				<div class="grid gap-2">
					<Button type="button" class="w-full" onclick={printReceipt}>
						<PrinterIcon class="size-4" />
						{t(locale, 'storeApp.pos.printReceipt')}
					</Button>
					<Button type="button" variant="secondary" onclick={() => (receiptOpen = false)}>
						{t(locale, 'storeApp.pos.receiptDone')}
					</Button>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<div id="pos-receipt-print" class="hidden print:block" aria-hidden="true">
		<div class="pos-receipt-sheet">
			<p class="pos-receipt-store">{storeName}</p>
			<p class="pos-receipt-meta">{counterLabel}</p>
			<p class="pos-receipt-title">{t(locale, 'storeApp.pos.receiptInvoice')}</p>

			<div class="pos-receipt-meta-block">
				<p>
					{t(locale, 'storeApp.pos.receiptBillNo', { number: completedBill.bill_number })}
				</p>
				<p>{formatReceiptDate(completedBill.completed_at)}</p>
				<p>
					{t(locale, 'storeApp.pos.receiptCustomer')}:
					{completedBill.customer_name || t(locale, 'storeApp.pos.walkIn')}
				</p>
				{#if completedBill.customer_phone}
					<p>{completedBill.customer_phone}</p>
				{/if}
			</div>

			<div class="pos-receipt-rule"></div>

			<div class="pos-receipt-row pos-receipt-head">
				<span>{t(locale, 'storeApp.pos.receiptItem')}</span>
				<span>{t(locale, 'storeApp.pos.receiptAmount')}</span>
			</div>

			{#each completedBill.lines as line, index (index)}
				<div class="pos-receipt-item">
					<p class="pos-receipt-item-name">{line.product_name}</p>
					{#if line.sku}
						<p class="pos-receipt-sku">{line.sku}</p>
					{/if}
					<div class="pos-receipt-row">
						<span>
							{line.quantity} × {money(line.unit_price_cents)}
						</span>
						<span>{money(line.line_total_cents)}</span>
					</div>
				</div>
			{/each}

			<div class="pos-receipt-rule"></div>

			<div class="pos-receipt-row pos-receipt-total">
				<span>{t(locale, 'storeApp.pos.total')}</span>
				<span>{money(completedBill.total_cents)}</span>
			</div>

			<div class="pos-receipt-rule"></div>

			<p class="pos-receipt-section">{t(locale, 'storeApp.pos.payments')}</p>
			{#each completedBill.payments as payment, index (index)}
				<div class="pos-receipt-row">
					<span>{methodLabel(payment.payment_method)}</span>
					<span>{money(payment.amount_cents)}</span>
				</div>
			{/each}

			{#if completedBill.change_cents > 0}
				<div class="pos-receipt-row">
					<span>{t(locale, 'storeApp.pos.return')}</span>
					<span>{money(completedBill.change_cents)}</span>
				</div>
			{/if}

			<div class="pos-receipt-rule"></div>

			<p class="pos-receipt-thanks">{t(locale, 'storeApp.pos.receiptThanks')}</p>
			<p class="pos-receipt-meta">{t(locale, 'storeApp.pos.receiptFooter')}</p>
		</div>
	</div>
{/if}

<style>
	@media print {
		@page {
			size: 80mm auto;
			margin: 0;
		}

		:global(body *) {
			visibility: hidden !important;
		}

		:global(#pos-receipt-print),
		:global(#pos-receipt-print *) {
			visibility: visible !important;
		}

		:global(#pos-receipt-print) {
			display: block !important;
			position: absolute;
			inset: 0;
			width: 80mm;
			background: white;
			color: black;
		}

		.pos-receipt-sheet {
			width: 72mm;
			margin: 0 auto;
			padding: 3mm 2mm;
			font-family: 'Courier New', Courier, monospace;
			font-size: 11px;
			line-height: 1.35;
			color: #000;
		}

		.pos-receipt-store {
			margin: 0;
			text-align: center;
			font-size: 14px;
			font-weight: 700;
			text-transform: uppercase;
		}

		.pos-receipt-title {
			margin: 6px 0 8px;
			text-align: center;
			font-size: 12px;
			font-weight: 700;
			letter-spacing: 0.08em;
		}

		.pos-receipt-meta,
		.pos-receipt-sku,
		.pos-receipt-thanks {
			margin: 0;
			text-align: center;
		}

		.pos-receipt-meta-block {
			margin-bottom: 6px;
		}

		.pos-receipt-meta-block p {
			margin: 0;
		}

		.pos-receipt-rule {
			border-top: 1px dashed #000;
			margin: 6px 0;
		}

		.pos-receipt-row {
			display: flex;
			justify-content: space-between;
			gap: 8px;
		}

		.pos-receipt-head {
			font-weight: 700;
		}

		.pos-receipt-item {
			margin-bottom: 6px;
		}

		.pos-receipt-item-name {
			margin: 0;
			font-weight: 600;
		}

		.pos-receipt-total {
			font-size: 13px;
			font-weight: 700;
		}

		.pos-receipt-section {
			margin: 0 0 4px;
			font-weight: 700;
		}

		.pos-receipt-thanks {
			margin-top: 8px;
			font-weight: 700;
		}
	}
</style>
