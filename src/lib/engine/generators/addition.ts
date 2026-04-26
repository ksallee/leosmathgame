import type { SeededRng, Question } from '../types';
import { makeQuestion, type OpGenerators } from './util';

const q = (rng: SeededRng, band: number, a: number, b: number): Question =>
	makeQuestion('add', band, [a, b], a + b, '+');

/** B1: tiny single-digit, sum ≤ 5 (1+1, 2+3, 4+1, …) */
function b1(rng: SeededRng) {
	const a = rng.int(1, 4);
	const b = rng.int(1, 5 - a);
	return q(rng, 1, a, b);
}

/** B2: single-digit, sum 6-9, no carry (4+5, 6+2, …) */
function b2(rng: SeededRng) {
	while (true) {
		const a = rng.int(1, 8);
		const b = rng.int(1, 9 - a);
		const sum = a + b;
		if (sum >= 6 && sum <= 9) return q(rng, 2, a, b);
	}
}

/** B3: making 10 (sum exactly 10): 7+3, 6+4, 8+2, … */
function b3(rng: SeededRng) {
	const a = rng.int(1, 9);
	return q(rng, 3, a, 10 - a);
}

/** B4: single-digit with carry, sum 11-13 (5+6, 4+7, 6+7, …) */
function b4(rng: SeededRng) {
	while (true) {
		const a = rng.int(2, 9);
		const b = rng.int(2, 9);
		const sum = a + b;
		if (sum >= 11 && sum <= 13) return q(rng, 4, a, b);
	}
}

/** B5: single-digit with carry, sum 14-18 (8+7, 9+6, 9+9, …) */
function b5(rng: SeededRng) {
	while (true) {
		const a = rng.int(5, 9);
		const b = rng.int(5, 9);
		const sum = a + b;
		if (sum >= 14 && sum <= 18) return q(rng, 5, a, b);
	}
}

/** B6: 2-digit + 1-digit, no carry (23+5, 41+8, …) */
function b6(rng: SeededRng) {
	while (true) {
		const a = rng.int(11, 99);
		const b = rng.int(1, 9);
		if ((a % 10) + b < 10) return q(rng, 6, a, b);
	}
}

/** B7: 2-digit + 1-digit, with carry (27+5, 48+6, …) */
function b7(rng: SeededRng) {
	while (true) {
		const a = rng.int(11, 99);
		const b = rng.int(2, 9);
		if ((a % 10) + b >= 10) return q(rng, 7, a, b);
	}
}

/** B8: 2-digit + 2-digit, no carry (23+45, 31+27, …) */
function b8(rng: SeededRng) {
	const tensA = rng.int(1, 8);
	const tensB = rng.int(1, 9 - tensA);
	const unitsA = rng.int(0, 9);
	const unitsB = rng.int(0, 9 - unitsA);
	return q(rng, 8, tensA * 10 + unitsA, tensB * 10 + unitsB);
}

/** B9: 2-digit + 2-digit, units carry only (27+38, 45+19, …) */
function b9(rng: SeededRng) {
	const tensA = rng.int(1, 7);
	const tensB = rng.int(1, 8 - tensA);
	const unitsA = rng.int(1, 9);
	const unitsB = rng.int(10 - unitsA, 9);
	return q(rng, 9, tensA * 10 + unitsA, tensB * 10 + unitsB);
}

/** B10: 2-digit + 2-digit, tens carry only (75+62, 83+41, …) */
function b10(rng: SeededRng) {
	const tensA = rng.int(2, 9);
	const tensB = rng.int(10 - tensA, 9);
	const unitsA = rng.int(0, 9);
	const unitsB = rng.int(0, 9 - unitsA);
	return q(rng, 10, tensA * 10 + unitsA, tensB * 10 + unitsB);
}

/** B11: 2-digit + 2-digit, both carries (75+38, 89+47, …) */
function b11(rng: SeededRng) {
	while (true) {
		const a = rng.int(20, 89);
		const b = rng.int(20, 89);
		const carryUnits = (a % 10) + (b % 10) >= 10;
		const tensSum = Math.floor(a / 10) + Math.floor(b / 10) + 1;
		if (carryUnits && tensSum >= 10) return q(rng, 11, a, b);
	}
}

/** B12: 3-digit + 2-digit, mixed (148+27, 256+89, …) */
function b12(rng: SeededRng) {
	const a = rng.int(100, 899);
	const b = rng.int(10, 99);
	return q(rng, 12, a, b);
}

export const additionGen: OpGenerators = {
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
