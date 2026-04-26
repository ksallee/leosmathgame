import { describe, it, expect } from 'vitest';
import { makeRng } from './rng';

describe('makeRng', () => {
	it('is deterministic with the same seed', () => {
		const a = makeRng(42);
		const b = makeRng(42);
		for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
	});

	it('int returns values in [min, max] inclusive', () => {
		const rng = makeRng(1);
		for (let i = 0; i < 200; i++) {
			const v = rng.int(3, 7);
			expect(v).toBeGreaterThanOrEqual(3);
			expect(v).toBeLessThanOrEqual(7);
		}
	});

	it('pick selects from the array', () => {
		const rng = makeRng(2);
		const arr = ['a', 'b', 'c'];
		for (let i = 0; i < 50; i++) expect(arr).toContain(rng.pick(arr));
	});

	it('chance with p=0 is always false, p=1 always true', () => {
		const rng = makeRng(3);
		for (let i = 0; i < 20; i++) {
			expect(rng.chance(0)).toBe(false);
			expect(rng.chance(1)).toBe(true);
		}
	});
});
