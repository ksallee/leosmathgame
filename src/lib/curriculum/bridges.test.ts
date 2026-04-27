import { describe, it, expect } from 'vitest';
import { bridgesFor } from './bridges';

describe('bridgesFor', () => {
	it('emits the commutative swap for addition', () => {
		const out = bridgesFor('add', [3, 5], 8, 2);
		expect(out).toEqual([{ op: 'add', operands: [5, 3], answer: 8, band: 2 }]);
	});

	it('emits the commutative swap for multiplication', () => {
		const out = bridgesFor('mul', [4, 7], 28, 9);
		expect(out).toEqual([{ op: 'mul', operands: [7, 4], answer: 28, band: 9 }]);
	});

	it('emits no bridges for subtraction (not commutative)', () => {
		expect(bridgesFor('sub', [9, 4], 5, 3)).toEqual([]);
	});

	it('emits no bridges for division', () => {
		expect(bridgesFor('div', [12, 4], 3, 2)).toEqual([]);
	});

	it('emits nothing when operands are identical (3+3, 5×5)', () => {
		expect(bridgesFor('add', [3, 3], 6, 1)).toEqual([]);
		expect(bridgesFor('mul', [5, 5], 25, 3)).toEqual([]);
	});

	it('emits nothing for non-binary operands', () => {
		expect(bridgesFor('add', [3], 3, 1)).toEqual([]);
		expect(bridgesFor('add', [3, 4, 5], 12, 5)).toEqual([]);
	});
});
