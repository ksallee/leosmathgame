import { describe, it, expect } from 'vitest';
import { generateChoices } from './choices';

describe('generateChoices', () => {
	it('always includes the correct answer', () => {
		for (let answer = 0; answer < 50; answer++) {
			const choices = generateChoices(answer, `q-${answer}`);
			expect(choices).toContain(answer);
		}
	});

	it('returns 4 unique non-negative integers', () => {
		const choices = generateChoices(8, 'add:b1:3+5');
		expect(choices.length).toBe(4);
		expect(new Set(choices).size).toBe(4);
		for (const c of choices) {
			expect(c).toBeGreaterThanOrEqual(0);
			expect(Number.isInteger(c)).toBe(true);
		}
	});

	it('is deterministic per seed', () => {
		const a = generateChoices(12, 'seed-x');
		const b = generateChoices(12, 'seed-x');
		expect(a).toEqual(b);
	});

	it('different seeds produce different choices', () => {
		const a = generateChoices(10, 'seed-1');
		const b = generateChoices(10, 'seed-2');
		expect(a).not.toEqual(b);
	});

	it('handles answer = 0', () => {
		const choices = generateChoices(0, 'sub:b1:5-5');
		expect(choices).toContain(0);
		expect(choices.length).toBe(4);
	});

	it('hard difficulty picks closer distractors than easy', () => {
		const easy = generateChoices(50, 'q', 'easy');
		const hard = generateChoices(50, 'q', 'hard');
		const easyMaxDelta = Math.max(...easy.map((c) => Math.abs(c - 50)));
		const hardMaxDelta = Math.max(...hard.map((c) => Math.abs(c - 50)));
		expect(hardMaxDelta).toBeLessThanOrEqual(easyMaxDelta);
	});
});
