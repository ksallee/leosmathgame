import type { SeededRng, Question } from '$lib/curriculum/types';
import { makeQuestion, type OpGenerators } from './util';

const q = (rng: SeededRng, band: number, a: number, b: number): Question =>
	makeQuestion('sub', band, [a, b], a - b, '−');

/** B1: tiny, no-borrow, result ≥ 1 (5−3, 7−2, …) */
function b1(rng: SeededRng) {
	const a = rng.int(2, 9);
	const b = rng.int(1, a - 1);
	return q(rng, 1, a, b);
}

/** B2: single-digit no-borrow, harder (9−2, 8−6, includes 0/self for 0-results) */
function b2(rng: SeededRng) {
	const a = rng.int(5, 9);
	const b = rng.int(0, a);
	return q(rng, 2, a, b);
}

/** B3: crossing 10 from a teen (12−5, 14−8, 17−9) — borrow concept intro */
function b3(rng: SeededRng) {
	const a = rng.int(11, 18);
	const b = rng.int(a - 9, 9);
	return q(rng, 3, a, b);
}

/** B4: subtracting from 20 / 10s (20−7, 30−4, 50−9) */
function b4(rng: SeededRng) {
	const tens = rng.int(2, 9);
	const a = tens * 10;
	const b = rng.int(1, 9);
	return q(rng, 4, a, b);
}

/** B5: 2-digit minus 1-digit, no borrow (45−3, 78−5, …) */
function b5(rng: SeededRng) {
	while (true) {
		const a = rng.int(10, 99);
		const b = rng.int(1, 9);
		if (a % 10 >= b) return q(rng, 5, a, b);
	}
}

/** B6: 2-digit minus 1-digit, with borrow (42−5, 71−8, …) */
function b6(rng: SeededRng) {
	while (true) {
		const a = rng.int(10, 99);
		const b = rng.int(2, 9);
		if (a % 10 < b && a > b) return q(rng, 6, a, b);
	}
}

/** B7: 2-digit minus 2-digit, no borrow (47−23, 89−45, …) */
function b7(rng: SeededRng) {
	while (true) {
		const a = rng.int(20, 99);
		const b = rng.int(10, a);
		if (a % 10 >= b % 10) return q(rng, 7, a, b);
	}
}

/** B8: 2-digit minus 2-digit, with borrow (52−27, 81−39, …) */
function b8(rng: SeededRng) {
	while (true) {
		const a = rng.int(20, 99);
		const b = rng.int(11, a - 1);
		if (a % 10 < b % 10 && Math.floor(a / 10) > Math.floor(b / 10)) return q(rng, 8, a, b);
	}
}

/** B9: borrow with zero in minuend units (50−27, 80−43, …) */
function b9(rng: SeededRng) {
	const tensA = rng.int(2, 9);
	const a = tensA * 10;
	const b = rng.int(11, a - 1);
	return q(rng, 9, a, b);
}

/** B10: 3-digit minus 2-digit, mixed borrows (143−27, 256−89, …) */
function b10(rng: SeededRng) {
	const a = rng.int(100, 899);
	const b = rng.int(10, 99);
	return q(rng, 10, a, b);
}

/** B11: 3-digit minus 3-digit, no chained borrow (456−123, 789−234, …) */
function b11(rng: SeededRng) {
	while (true) {
		const a = rng.int(200, 899);
		const b = rng.int(100, a);
		if (a % 10 >= b % 10 && Math.floor(a / 10) % 10 >= Math.floor(b / 10) % 10) {
			return q(rng, 11, a, b);
		}
	}
}

/** B12: 3-digit minus 3-digit with borrow chain (300−147, 502−289, …) */
function b12(rng: SeededRng) {
	while (true) {
		const a = rng.int(200, 999);
		const b = rng.int(100, a - 1);
		if (a % 10 < b % 10 || Math.floor(a / 10) % 10 < Math.floor(b / 10) % 10) {
			return q(rng, 12, a, b);
		}
	}
}

export const subtractionGen: OpGenerators = {
	maxBand: 12,
	bands: {
		1: b1,
		2: b2,
		3: b3,
		4: b4,
		5: b5,
		6: b6,
		7: b7,
		8: b8,
		9: b9,
		10: b10,
		11: b11,
		12: b12
	}
};
