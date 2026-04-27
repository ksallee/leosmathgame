import { describe, it, expect } from 'vitest';
import { generateLevel } from './sampler';
import { createState, recordAnswer } from '$lib/curriculum/mastery';
import type { Question, MasteryState } from '$lib/curriculum/types';
import { QUESTIONS_PER_LEVEL } from './config';
import { OP_UNLOCK_LEVEL } from '$lib/curriculum/config';

function answerAll(state: MasteryState, qs: Question[], correct: boolean) {
	for (const q of qs) {
		recordAnswer(state, {
			questionId: q.id,
			template: q.template,
			operation: q.operation,
			band: q.band,
			correct,
			timeMs: 3000,
			at: Date.now()
		});
	}
}

describe('generateLevel — level 1 calibration', () => {
	it('produces QUESTIONS_PER_LEVEL questions', () => {
		const s = createState();
		const qs = generateLevel(s, 1, { seed: 42 });
		expect(qs.length).toBe(QUESTIONS_PER_LEVEL);
	});

	it('contains only add and sub at level 1', () => {
		const s = createState();
		const qs = generateLevel(s, 1, { seed: 42 });
		for (const q of qs) expect(['add', 'sub']).toContain(q.operation);
	});

	it('alternates between calibrating ops', () => {
		const s = createState();
		const qs = generateLevel(s, 1, { seed: 100 });
		const ops = qs.map((q) => q.operation);
		expect(new Set(ops).size).toBeGreaterThanOrEqual(2);
	});
});

describe('generateLevel — multiplication unlock', () => {
	it('introduces × at level 20 with calibration', () => {
		const s = createState();
		for (let level = 1; level < OP_UNLOCK_LEVEL.mul; level++) {
			const qs = generateLevel(s, level, { seed: level });
			answerAll(s, qs, true);
		}
		const qs = generateLevel(s, OP_UNLOCK_LEVEL.mul, { seed: 9999 });
		expect(qs.some((q) => q.operation === 'mul')).toBe(true);
	});
});

describe('generateLevel — steady state', () => {
	it('mostly samples around current band per op', () => {
		const s = createState();
		answerAll(s, generateLevel(s, 1, { seed: 1 }), true);
		answerAll(s, generateLevel(s, 2, { seed: 2 }), true);

		const lvl3 = generateLevel(s, 3, { seed: 3 });
		const targets = [s.add.band, s.sub.band].filter((b) => b > 0);
		const inWindow = lvl3.filter((q) => targets.some((t) => Math.abs(q.band - t) <= 1)).length;
		expect(inWindow).toBeGreaterThanOrEqual(QUESTIONS_PER_LEVEL - 2);
	});
});

describe('generateLevel — replay mode', () => {
	it('uses bandFor and forceUnlockedOps without calibration', () => {
		const s = createState();
		// Don't even call applyUnlocks first; replay forces op set
		const qs = generateLevel(s, 3, {
			seed: 7,
			forceUnlockedOps: ['add'],
			bandFor: () => 4
		});
		expect(qs.length).toBe(QUESTIONS_PER_LEVEL);
		for (const q of qs) {
			expect(q.operation).toBe('add');
			expect(Math.abs(q.band - 4)).toBeLessThanOrEqual(1);
		}
	});

	it('respects forceUnlockedOps even when × is normally unlocked', () => {
		const s = createState();
		// progress so × is unlocked
		for (let level = 1; level <= OP_UNLOCK_LEVEL.mul + 2; level++) {
			answerAll(s, generateLevel(s, level, { seed: level }), true);
		}
		const replay = generateLevel(s, 3, {
			seed: 1,
			forceUnlockedOps: ['add', 'sub'],
			bandFor: () => 3
		});
		for (const q of replay) {
			expect(['add', 'sub']).toContain(q.operation);
		}
	});
});
