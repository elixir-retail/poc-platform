export type BarcodeFormat = 'CODE128' | 'EAN13' | 'EAN8' | 'CODE39' | 'UPC';

function onlyDigits(value: string) {
	return value.replace(/\D/g, '');
}

/** GS1 mod-10 check digit for EAN-13 (12 data digits). */
export function ean13CheckDigit(body12: string): number {
	const digits = body12.split('').map(Number);
	let sum = 0;
	for (let index = 0; index < 12; index += 1) {
		sum += digits[index]! * (index % 2 === 0 ? 1 : 3);
	}
	return (10 - (sum % 10)) % 10;
}

/** GS1 mod-10 check digit for EAN-8 (7 data digits). */
export function ean8CheckDigit(body7: string): number {
	const digits = body7.split('').map(Number);
	let sum = 0;
	for (let index = 0; index < 7; index += 1) {
		sum += digits[index]! * (index % 2 === 0 ? 3 : 1);
	}
	return (10 - (sum % 10)) % 10;
}

/** GS1 mod-10 check digit for UPC-A (11 data digits). */
export function upcCheckDigit(body11: string): number {
	const digits = body11.split('').map(Number);
	let sum = 0;
	for (let index = 0; index < 11; index += 1) {
		sum += digits[index]! * (index % 2 === 0 ? 3 : 1);
	}
	return (10 - (sum % 10)) % 10;
}

export type NormalizedBarcode = {
	value: string;
	corrected: boolean;
	error: string | null;
};

/**
 * EAN/UPC require a valid check digit. Accept shorter bodies and
 * append the check digit, or repair an incorrect final digit.
 */
export function normalizeBarcodeValue(raw: string, format: BarcodeFormat): NormalizedBarcode {
	const trimmed = raw.trim();
	if (!trimmed) {
		return { value: '', corrected: false, error: null };
	}

	if (format === 'CODE128' || format === 'CODE39') {
		return { value: trimmed, corrected: false, error: null };
	}

	const digits = onlyDigits(trimmed);

	if (format === 'EAN13') {
		if (digits.length === 12) {
			return {
				value: `${digits}${ean13CheckDigit(digits)}`,
				corrected: true,
				error: null
			};
		}
		if (digits.length === 13) {
			const expected = ean13CheckDigit(digits.slice(0, 12));
			const next = `${digits.slice(0, 12)}${expected}`;
			return {
				value: next,
				corrected: next !== digits,
				error: null
			};
		}
		return {
			value: trimmed,
			corrected: false,
			error: 'EAN-13 needs 12 or 13 digits (check digit is added or corrected automatically).'
		};
	}

	if (format === 'EAN8') {
		if (digits.length === 7) {
			return {
				value: `${digits}${ean8CheckDigit(digits)}`,
				corrected: true,
				error: null
			};
		}
		if (digits.length === 8) {
			const expected = ean8CheckDigit(digits.slice(0, 7));
			const next = `${digits.slice(0, 7)}${expected}`;
			return {
				value: next,
				corrected: next !== digits,
				error: null
			};
		}
		return {
			value: trimmed,
			corrected: false,
			error: 'EAN-8 needs 7 or 8 digits (check digit is added or corrected automatically).'
		};
	}

	if (format === 'UPC') {
		if (digits.length === 11) {
			return {
				value: `${digits}${upcCheckDigit(digits)}`,
				corrected: true,
				error: null
			};
		}
		if (digits.length === 12) {
			const expected = upcCheckDigit(digits.slice(0, 11));
			const next = `${digits.slice(0, 11)}${expected}`;
			return {
				value: next,
				corrected: next !== digits,
				error: null
			};
		}
		return {
			value: trimmed,
			corrected: false,
			error: 'UPC-A needs 11 or 12 digits (check digit is added or corrected automatically).'
		};
	}

	return { value: trimmed, corrected: false, error: null };
}
