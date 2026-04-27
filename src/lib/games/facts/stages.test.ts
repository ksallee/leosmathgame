import { describe, it, expect } from 'vitest';
import { createState, applyUnlocks } from '$lib/curriculum/mastery';
import { stageForQuestion, evaluateLevelOutcome, getStageFor } from './stages';
import type { AnswerEvent, MasteryState, Question } from '$lib/curriculum/types';

function q(op: AnswerEvent['operation'], band: number, n = 1): Question {
	return {
		id: `${op}:b${band}:${n}`,
		template: `${op}:b${band}`,
		operation: op,
		band,
		prompt: `${n}+${n}`,
		operands: [n, n],
		answer: n + n
	};
}

function event(
	op: AnswerEvent['operation'],
	band: number,
	correct: boolean,
	timeMs = 3000
): AnswerEvent {
	return {
		questionId: `${op}:b${band}:test`,
		template: `${op}:b${band}`,
		operation: op,
		band,
		correct,
		timeMs,
		at: Date.now()
	};
}

function setup(): MasteryState {
	const s = createState();
	applyUnlocks(s, 1);
	return s;
}

describe('getStageFor', () => {
	it('defaults to choices_easy for fresh op', () => {
		const s = setup();
		expect(getStageFor(s.add)).toBe('choices_easy');
	});

	it('reads stored stage', () => {
		const s = setup();
		s.add.stage = 'numpad';
		expect(getStageFor(s.add)).toBe('numpad');
	});
});

describe('stageForQuestion', () => {
	it("uses the question's op stage", () => {
		const s = setup();
		s.add.stage = 'numpad';
		s.sub.stage = 'choices_easy';
		expect(stageForQuestion(s, q('add', 3))).toBe('numpad');
		expect(stageForQuestion(s, q('sub', 2))).toBe('choices_easy');
	});
});

describe('evaluateLevelOutcome', () => {
	it('advances choices_easy → choices_hard after 3 cumulative exposures', () => {
		const s = setup();
		const t1 = evaluateLevelOutcome(s, [event('add', 3, true), event('add', 3, true)]);
		expect(t1.length).toBe(0);
		expect(s.add.stage).toBe('choices_easy');
		expect(s.add.stageProgress).toBe(2);

		const t2 = evaluateLevelOutcome(s, [event('add', 3, false)]);
		expect(t2.length).toBe(1);
		expect(t2[0].to).toBe('choices_hard');
		expect(s.add.stage).toBe('choices_hard');
	});

	it('does NOT gate choices_easy advance on accuracy', () => {
		const s = setup();
		evaluateLevelOutcome(s, [
			event('add', 3, false),
			event('add', 3, false),
			event('add', 3, false)
		]);
		expect(s.add.stage).toBe('choices_hard');
	});

	it('advances choices_hard → numpad on ≥80% correct', () => {
		const s = setup();
		s.add.stage = 'choices_hard';
		const events = Array.from({ length: 10 }, (_, i) => event('add', 3, i < 8));
		const t = evaluateLevelOutcome(s, events);
		expect(t.length).toBe(1);
		expect(t[0]).toMatchObject({ op: 'add', from: 'choices_hard', to: 'numpad' });
		expect(s.add.stage).toBe('numpad');
	});

	it('keeps choices_hard when accuracy is below 80%', () => {
		const s = setup();
		s.add.stage = 'choices_hard';
		const events = Array.from({ length: 10 }, (_, i) => event('add', 3, i < 7));
		const t = evaluateLevelOutcome(s, events);
		expect(t.length).toBe(0);
		expect(s.add.stage).toBe('choices_hard');
	});

	it('numpad consolidation bumps band, resets stage to choices_easy', () => {
		const s = setup();
		s.add.stage = 'numpad';
		s.add.band = 3;
		const events = Array.from({ length: 10 }, (_, i) => event('add', 3, i < 9));
		const t = evaluateLevelOutcome(s, events);
		expect(t.length).toBe(1);
		expect(t[0].bandChanged).toEqual({ from: 3, to: 4 });
		expect(s.add.band).toBe(4);
		expect(s.add.stage).toBe('choices_easy');
	});

	it('demotes numpad → choices_hard on accuracy crash (<40%)', () => {
		const s = setup();
		s.add.stage = 'numpad';
		s.add.band = 3;
		const events = Array.from({ length: 10 }, (_, i) => event('add', 3, i < 3));
		const t = evaluateLevelOutcome(s, events);
		expect(t.length).toBe(1);
		expect(t[0].to).toBe('choices_hard');
		expect(s.add.band).toBe(3);
	});

	it('keeps numpad on weak-but-not-crashed accuracy', () => {
		const s = setup();
		s.add.stage = 'numpad';
		const events = Array.from({ length: 10 }, (_, i) => event('add', 3, i < 5));
		const t = evaluateLevelOutcome(s, events);
		expect(t.length).toBe(0);
		expect(s.add.stage).toBe('numpad');
	});

	it('evaluates each op independently in one level', () => {
		const s = setup();
		s.add.stage = 'choices_hard';
		s.sub.stage = 'numpad';
		s.sub.band = 2;
		const events = [
			...Array.from({ length: 5 }, () => event('add', 3, true)),
			...Array.from({ length: 5 }, () => event('sub', 2, false))
		];
		const t = evaluateLevelOutcome(s, events);
		expect(t.find((x) => x.op === 'add')?.to).toBe('numpad');
		expect(t.find((x) => x.op === 'sub')?.to).toBe('choices_hard');
		expect(s.sub.band).toBe(2);
	});
});
