import type { SeededRng, Question } from '../types';
import { makeQuestion, type OpGenerators } from './util';

const q = (rng: SeededRng, band: number, a: number, b: number): Question =>
	makeQuestion('mul', band, [a, b], a * b, '×');

function pickFactor(rng: SeededRng, factors: readonly number[]) {
	return rng.pick(factors);
}

function shuffle(rng: SeededRng, a: number, b: number): [number, number] {
	return rng.chance(0.5) ? [a, b] : [b, a];
}

/** B1: trivial — ×0, ×1, ×10. Other side any single digit. */
function b1(rng: SeededRng) {
	const trivial = pickFactor(rng, [0, 1, 10]);
	const other = rng.int(0, 9);
	const [a, b] = shuffle(rng, trivial, other);
	return q(rng, 1, a, b);
}

/** B2: ×2 (skip-counting by 2) */
function b2(rng: SeededRng) {
	const other = rng.int(2, 9);
	const [a, b] = shuffle(rng, 2, other);
	return q(rng, 2, a, b);
}

/** B3: ×5 (skip-counting by 5) */
function b3(rng: SeededRng) {
	const other = rng.int(2, 9);
	const [a, b] = shuffle(rng, 5, other);
	return q(rng, 3, a, b);
}

/** B4: ×3 */
function b4(rng: SeededRng) {
	const other = rng.int(2, 9);
	const [a, b] = shuffle(rng, 3, other);
	return q(rng, 4, a, b);
}

/** B5: ×4 */
function b5(rng: SeededRng) {
	const other = rng.int(2, 9);
	const [a, b] = shuffle(rng, 4, other);
	return q(rng, 5, a, b);
}

/** B6: ×9 (has finger trick) */
function b6(rng: SeededRng) {
	const other = rng.int(2, 9);
	const [a, b] = shuffle(rng, 9, other);
	return q(rng, 6, a, b);
}

/** B7: ×6 */
function b7(rng: SeededRng) {
	const other = rng.int(2, 9);
	const [a, b] = shuffle(rng, 6, other);
	return q(rng, 7, a, b);
}

/** B8: ×8 */
function b8(rng: SeededRng) {
	const other = rng.int(2, 9);
	const [a, b] = shuffle(rng, 8, other);
	return q(rng, 8, a, b);
}

/** B9: ×7 */
function b9(rng: SeededRng) {
	const other = rng.int(2, 9);
	const [a, b] = shuffle(rng, 7, other);
	return q(rng, 9, a, b);
}

/** B10: 2-digit × 1-digit, no carry (12×3, 21×4, …) */
function b10(rng: SeededRng) {
	const b = rng.int(2, 4);
	const maxDigit = Math.floor(9 / b);
	const tensA = rng.int(1, maxDigit);
	const unitsA = rng.int(0, maxDigit);
	return q(rng, 10, tensA * 10 + unitsA, b);
}

/** B11: 2-digit × 1-digit, with carry (27×3, 48×7, …) */
function b11(rng: SeededRng) {
	while (true) {
		const a = rng.int(13, 99);
		const b = rng.int(2, 9);
		if ((a % 10) * b >= 10) return q(rng, 11, a, b);
	}
}

export const multiplicationGen: OpGenerators = {
	maxBand: 11,
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
		11: b11
	}
};
