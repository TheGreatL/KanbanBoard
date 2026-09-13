import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';

/**
 * Checks if a value is a valid fractional-indexing key.
 */
export function isValidOrderKey(key: unknown): boolean {
	if (typeof key !== 'string' || !key) return false;
	try {
		generateKeyBetween(key, null);
		return true;
	} catch {
		return false;
	}
}

/**
 * Safely generates a fractional index key between two bounds.
 * Handles:
 * - null / undefined / empty string / non-string / invalid head characters
 * - inverted bounds (a >= b)
 * - any thrown exception from fractional-indexing
 *
 * GUARANTEED to never throw.
 */
export function safeGenerateKeyBetween(
	a: string | null | undefined,
	b: string | null | undefined
): string {
	const validA = a && isValidOrderKey(a) ? a : null;
	const validB = b && isValidOrderKey(b) ? b : null;

	if (validA && validB && validA >= validB) {
		try {
			return generateKeyBetween(validA, null);
		} catch {
			// fallback below
		}
	}

	try {
		return generateKeyBetween(validA, validB);
	} catch {
		try {
			if (validA) return generateKeyBetween(validA, null);
		} catch {
			// ignore
		}
		try {
			if (validB) return generateKeyBetween(null, validB);
		} catch {
			// ignore
		}
		try {
			return generateKeyBetween(null, null);
		} catch {
			return 'a0';
		}
	}
}

/**
 * Safely generates N keys between two bounds.
 */
export function safeGenerateNKeysBetween(
	a: string | null | undefined,
	b: string | null | undefined,
	n: number
): string[] {
	if (n <= 0) return [];
	const validA = a && isValidOrderKey(a) ? a : null;
	const validB = b && isValidOrderKey(b) ? b : null;

	if (validA && validB && validA < validB) {
		try {
			return generateNKeysBetween(validA, validB, n);
		} catch {
			// fallback below
		}
	}

	try {
		return generateNKeysBetween(validA, null, n);
	} catch {
		try {
			return generateNKeysBetween(null, null, n);
		} catch {
			const keys: string[] = [];
			let last: string | null = null;
			for (let i = 0; i < n; i++) {
				last = safeGenerateKeyBetween(last, null);
				keys.push(last);
			}
			return keys;
		}
	}
}

