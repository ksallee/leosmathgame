import { describe, it, expect } from 'vitest';
import { createState, applyUnlocks } from './mastery';
import { recordForLeitner, dueEntries } from './leitner';
import type { AnswerEvent, MasteryState } from './types';
import { LEITNER_GRANULARITY } from './config';

function event(
	op: AnswerEvent['operation'],
	band: number,
	correct: boolean,
	id?: string
): AnswerEvent {
	return {
		questionId: id ?? `${op}:b${band}:7+8`,
		template: `${op}:b${band}`,
		operation: op,
		band,
		correct,
		timeMs: 3000,
		at: Date.now()
	};
}

function setup(): MasteryState {
	const s = createState();
	applyUnlocks(s, 1);
	applyUnlocks(s, 20);
	return s;
}

describe('Leitner', () => {
	it('granularity matches config', () => {
		expect(LEITNER_GRANULARITY.mul).toBe('instance');
		expect(LEITNER_GRANULARITY.add).toBe('template');
	});

	it('wrong answer creates a bucket-0 entry due soon', () => {
		const s = setup();
		s.answered = 5;
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7'));
		expect(s.leitner.length).toBe(1);
		const entry = s.leitner[0];
		expect(entry.bucket).toBe(0);
		expect(entry.dueAtAnswerCount).toBe(7);
	});

	it('correct answer for existing entry advances bucket', () => {
		const s = setup();
		s.answered = 0;
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7'));
		s.answered = 10;
		recordForLeitner(s, event('mul', 4, true, 'mul:b4:3×7'));
		expect(s.leitner[0].bucket).toBe(1);
	});

	it('correct answer for un-tracked question is a no-op', () => {
		const s = setup();
		recordForLeitner(s, event('mul', 4, true, 'mul:b4:8×9'));
		expect(s.leitner.length).toBe(0);
	});

	it('addition uses template-level keys', () => {
		const s = setup();
		recordForLeitner(s, event('add', 4, false, 'add:b4:7+5'));
		recordForLeitner(s, event('add', 4, false, 'add:b4:8+6'));
		expect(s.leitner.length).toBe(1);
		expect(s.leitner[0].key).toBe('add:b4');
	});

	it('dueEntries respects unlocked ops only', () => {
		const s = createState();
		applyUnlocks(s, 1);
		recordForLeitner(s, event('mul', 4, false, 'mul:b4:3×7'));
		expect(s.leitner.length).toBe(1);
		expect(dueEntries(s).length).toBe(0);
		applyUnlocks(s, 20);
		s.answered = 100;
		expect(dueEntries(s).length).toBe(1);
	});
});
