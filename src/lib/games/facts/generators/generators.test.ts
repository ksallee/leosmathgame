import { describe, it, expect } from 'vitest';
import { generate, clampBand, maxBand } from './index';
import { makeRng } from '$lib/curriculum/rng';
import type { Operation } from '$lib/curriculum/types';

const SAMPLES = 80;

function applyOp(op: Operation, operands: number[]): number {
	const [a, b] = operands;
	switch (op) {
		case 'add':
			return a + b;
		case 'sub':
			return a - b;
		case 'mul':
			return a * b;
		case 'div':
			return a / b;
	}
}

describe('generators (math correctness)', () => {
	const ops: Operation[] = ['add', 'sub', 'mul', 'div'];
	for (const op of ops) {
		it(`${op}: every band's answer matches the operation`, () => {
			const rng = makeRng(7);
			for (let band = 1; band <= maxBand(op); band++) {
				for (let i = 0; i < SAMPLES; i++) {
					const q = generate(op, band, rng);
					expect(q.answer).toBe(applyOp(op, q.operands));
					expect(q.operation).toBe(op);
					expect(q.band).toBe(band);
				}
			}
		});
	}

	it('clampBand respects [1, maxBand]', () => {
		expect(clampBand('add', 0)).toBe(1);
		expect(clampBand('add', 100)).toBe(maxBand('add'));
		expect(clampBand('sub', 5)).toBe(5);
	});
});

describe('addition band shapes', () => {
	const rng = makeRng(11);

	it('B1: sum ≤ 5', () => {
		for (let i = 0; i < SAMPLES; i++) {
			const q = generate('add', 1, rng);
			expect(q.answer).toBeLessThanOrEqual(5);
		}
	});

	it('B3: sum exactly 10', () => {
		for (let i = 0; i < SAMPLES; i++) expect(generate('add', 3, rng).answer).toBe(10);
	});

	it('B4: sum in [11, 13]', () => {
		for (let i = 0; i < SAMPLES; i++) {
			const q = generate('add', 4, rng);
			expect(q.answer).toBeGreaterThanOrEqual(11);
			expect(q.answer).toBeLessThanOrEqual(13);
		}
	});

	it('B7: 2-digit + 1-digit with units carry', () => {
		for (let i = 0; i < SAMPLES; i++) {
			const q = generate('add', 7, rng);
			const [a, b] = q.operands;
			expect(a).toBeGreaterThanOrEqual(10);
			expect(b).toBeLessThanOrEqual(9);
			expect((a % 10) + b).toBeGreaterThanOrEqual(10);
		}
	});

	it('B8: 2-digit + 2-digit, no carry', () => {
		for (let i = 0; i < SAMPLES; i++) {
			const q = generate('add', 8, rng);
			const [a, b] = q.operands;
			expect((a % 10) + (b % 10)).toBeLessThan(10);
			expect(Math.floor(a / 10) + Math.floor(b / 10)).toBeLessThan(10);
		}
	});
});

describe('subtraction band shapes', () => {
	const rng = makeRng(13);

	it('B1: positive, no borrow, single digit', () => {
		for (let i = 0; i < SAMPLES; i++) {
			const q = generate('sub', 1, rng);
			expect(q.answer).toBeGreaterThanOrEqual(1);
			expect(q.operands[0]).toBeLessThanOrEqual(9);
		}
	});

	it('B3: minuend in [11, 18], result single-digit', () => {
		for (let i = 0; i < SAMPLES; i++) {
			const q = generate('sub', 3, rng);
			expect(q.operands[0]).toBeGreaterThanOrEqual(11);
			expect(q.operands[0]).toBeLessThanOrEqual(18);
			expect(q.answer).toBeGreaterThanOrEqual(2);
			expect(q.answer).toBeLessThanOrEqual(9);
		}
	});

	it('B8: 2-digit − 2-digit, with borrow on units', () => {
		for (let i = 0; i < SAMPLES; i++) {
			const q = generate('sub', 8, rng);
			const [a, b] = q.operands;
			expect(a % 10).toBeLessThan(b % 10);
		}
	});

	it('all bands: result ≥ 0', () => {
		for (let band = 1; band <= maxBand('sub'); band++) {
			for (let i = 0; i < SAMPLES; i++) {
				expect(generate('sub', band, rng).answer).toBeGreaterThanOrEqual(0);
			}
		}
	});
});

describe('multiplication band shapes', () => {
	const rng = makeRng(17);

	it('B1: includes a trivial factor (0, 1, or 10)', () => {
		for (let i = 0; i < SAMPLES; i++) {
			const q = generate('mul', 1, rng);
			expect(q.operands.some((n) => n === 0 || n === 1 || n === 10)).toBe(true);
		}
	});

	it('B2: one factor is 2', () => {
		for (let i = 0; i < SAMPLES; i++) {
			const q = generate('mul', 2, rng);
			expect(q.operands).toContain(2);
		}
	});

	it('B5: one factor is 4', () => {
		for (let i = 0; i < SAMPLES; i++) expect(generate('mul', 5, rng).operands).toContain(4);
	});

	it('B11: 2-digit × 1-digit with carry', () => {
		for (let i = 0; i < SAMPLES; i++) {
			const q = generate('mul', 11, rng);
			const [a, b] = q.operands;
			expect(a).toBeGreaterThanOrEqual(10);
			expect((a % 10) * b).toBeGreaterThanOrEqual(10);
		}
	});
});

describe('division band shapes', () => {
	const rng = makeRng(19);

	it('all bands: integer result', () => {
		for (let band = 1; band <= maxBand('div'); band++) {
			for (let i = 0; i < SAMPLES; i++) {
				const q = generate('div', band, rng);
				expect(Number.isInteger(q.answer)).toBe(true);
			}
		}
	});

	it('B1: divisor is 1', () => {
		for (let i = 0; i < SAMPLES; i++) expect(generate('div', 1, rng).operands[1]).toBe(1);
	});

	it('B2: divisor is 10, dividend is multiple of 10', () => {
		for (let i = 0; i < SAMPLES; i++) {
			const q = generate('div', 2, rng);
			expect(q.operands[1]).toBe(10);
			expect(q.operands[0] % 10).toBe(0);
		}
	});
});
