import type { SeededRng, Question } from '$lib/curriculum/types';
import { makeQuestion, type OpGenerators } from './util';

const q = (rng: SeededRng, band: number, a: number, b: number): Question =>
	makeQuestion('div', band, [a, b], a / b, '÷');

/** B1: ÷1 */
function b1(rng: SeededRng) {
	const a = rng.int(1, 12);
	return q(rng, 1, a, 1);
}

/** B2: ÷10 (powers of 10) */
function b2(rng: SeededRng) {
	const k = rng.int(1, 9);
	return q(rng, 2, k * 10, 10);
}

/** B3: ÷2 exact */
function b3(rng: SeededRng) {
	const k = rng.int(2, 10);
	return q(rng, 3, k * 2, 2);
}

/** B4: ÷5 exact */
function b4(rng: SeededRng) {
	const k = rng.int(2, 10);
	return q(rng, 4, k * 5, 5);
}

/** B5: ÷3 / ÷4 exact */
function b5(rng: SeededRng) {
	const divisor = rng.pick([3, 4]);
	const k = rng.int(2, 10);
	return q(rng, 5, k * divisor, divisor);
}

/** B6: ÷6 / ÷7 / ÷8 / ÷9 exact */
function b6(rng: SeededRng) {
	const divisor = rng.pick([6, 7, 8, 9]);
	const k = rng.int(2, 10);
	return q(rng, 6, k * divisor, divisor);
}

export const divisionGen: OpGenerators = {
	maxBand: 6,
	bands: {
		1: b1,
		2: b2,
		3: b3,
		4: b4,
		5: b5,
		6: b6
	}
};
