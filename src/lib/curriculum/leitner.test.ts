import { describe, it, expect } from 'vitest';
import { createState, applyUnlocks } from './mastery';
import { recordForLeitner, dueEntries } from './leitner';
import type { AnswerEvent, MasteryState } from './types';
import { LEITNER_GRANULARITY, LEITNER_INTERVALS, LEITNER_WALL_FLOORS_MS } from './config';

const T0 = 1_700_000_000_000;

const FAST = 1500;
const SLOW = 5000;

function event(
	op: AnswerEvent['operation'],
	band: number,
	correct: boolean,
	id?: string,
	at: number = T0,
	timeMs: number = FAST
): AnswerEvent {
	return {
		questionId: id ?? `${op}:b${band}:7+8`,
		template: `${op}:b${band}`,
		operation: op,
		band,
		correct,
		timeMs,
		at
	};
}

function fastCorrects(s: MasteryState, op: AnswerEvent['operation'], id: string, n: number) {
	for (let i = 0; i < n; i++) {
		s.answered += 1;
		recordForLeitner(s, event(op, 4, true, id, T0 + 60_000 * (i + 1), FAST));
	}
}

function setup(): MasteryState {
	const s = createState();
	applyUnlocks(s, 1);
	applyUnlocks(s, 20);
	return s;
}

describe('Leitner', () => {
	it('granularity is per-instance for all ops', () => {
		expect(LEITNER_GRANULARITY.add).toBe('instance');
		expect(LEITNER_GRANULARITY.sub).toBe('instance');
		expect(LEITNER_GRANULARITY.mul).toBe('instance');
		expect(LEITNER_GRANULARITY.div).toBe('instance');
	});

	it('wrong answer creates a bucket-0 entry due soon (both gates)', () => {
		const s = setup();
		s.answered = 5;
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7'));
		expect(s.leitner.length).toBe(1);
		const entry = s.leitner[0];
		expect(entry.bucket).toBe(0);
		expect(entry.dueAtAnswerCount).toBe(5 + LEITNER_INTERVALS[0]);
		expect(entry.dueAtWallMs).toBe(T0 + LEITNER_WALL_FLOORS_MS[0]);
	});

	it('promotion requires a fast-correct streak (retrieval gate)', () => {
		const s = setup();
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7'));
		// Two fast-correct: still bucket 0
		fastCorrects(s, 'mul', 'mul:b4:3×7', 2);
		expect(s.leitner[0].bucket).toBe(0);
		// Third fast-correct flips to bucket 1
		fastCorrects(s, 'mul', 'mul:b4:3×7', 1);
		expect(s.leitner[0].bucket).toBe(1);
	});

	it('slow-correct does not advance the bucket and resets the streak', () => {
		const s = setup();
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7'));
		fastCorrects(s, 'mul', 'mul:b4:3×7', 2);
		// One slow-correct: streak resets, bucket stays
		recordForLeitner(s, event('mul', 4, true, 'mul:b4:3×7', T0 + 200_000, SLOW));
		expect(s.leitner[0].bucket).toBe(0);
		// Need 3 more fast-correct to actually promote
		fastCorrects(s, 'mul', 'mul:b4:3×7', 2);
		expect(s.leitner[0].bucket).toBe(0);
		fastCorrects(s, 'mul', 'mul:b4:3×7', 1);
		expect(s.leitner[0].bucket).toBe(1);
	});

	it('correct answer maxes out at bucket 3', () => {
		const s = setup();
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7'));
		for (let i = 0; i < 30; i++) {
			fastCorrects(s, 'mul', 'mul:b4:3×7', 1);
		}
		expect(s.leitner[0].bucket).toBe(3);
	});

	it('wrong answer demotes one bucket, not back to zero', () => {
		const s = setup();
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7'));
		fastCorrects(s, 'mul', 'mul:b4:3×7', 3);
		expect(s.leitner[0].bucket).toBe(1);
		s.answered = 100;
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7', T0 + 86_400_000));
		expect(s.leitner[0].bucket).toBe(0);
	});

	it('wrong answer resets the fast-correct streak', () => {
		const s = setup();
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7'));
		fastCorrects(s, 'mul', 'mul:b4:3×7', 2);
		expect(s.fastCorrectStreaks['mul:b4:3×7']).toBe(2);
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7', T0 + 999));
		expect(s.fastCorrectStreaks['mul:b4:3×7']).toBe(0);
	});

	it('correct answer for un-tracked question is a no-op', () => {
		const s = setup();
		recordForLeitner(s, event('mul', 4, true, 'mul:b4:8×9'));
		expect(s.leitner.length).toBe(0);
	});

	it('addition uses instance keys (per-fact tracking)', () => {
		const s = setup();
		recordForLeitner(s, event('add', 4, false, 'add:b4:7+5'));
		recordForLeitner(s, event('add', 4, false, 'add:b4:8+6'));
		expect(s.leitner.length).toBe(2);
		expect(s.leitner.map((e) => e.key).sort()).toEqual(['add:b4:7+5', 'add:b4:8+6']);
	});

	it('dueEntries gates on both wall-clock and answer-count', () => {
		const s = setup();
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7', T0));
		expect(dueEntries(s, T0).length).toBe(0);
		s.answered = 100;
		expect(dueEntries(s, T0).length).toBe(0);
		expect(dueEntries(s, T0 + LEITNER_WALL_FLOORS_MS[0]).length).toBe(1);
	});

	it('dueEntries respects unlocked ops only', () => {
		const s = createState();
		applyUnlocks(s, 1);
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7'));
		expect(s.leitner.length).toBe(1);
		expect(dueEntries(s, T0 + 86_400_000).length).toBe(0);
		applyUnlocks(s, 20);
		s.answered = 100;
		expect(dueEntries(s, T0 + 86_400_000).length).toBe(1);
	});
});
