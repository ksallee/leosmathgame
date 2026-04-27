import { describe, it, expect } from 'vitest';
import {
	createState,
	applyUnlocks,
	getCalibration,
	nextProbeBand,
	evaluateCalibration,
	classifySpeed,
	recordAnswer
} from './mastery';
import type { AnswerEvent, MasteryState } from './types';
import { OP_UNLOCK_LEVEL, STARTING_PROBE_BAND } from './config';

function event(
	op: AnswerEvent['operation'],
	band: number,
	correct: boolean,
	timeMs = 3000
): AnswerEvent {
	return {
		questionId: `${op}:b${band}:test-${Math.random()}`,
		template: `${op}:b${band}`,
		operation: op,
		band,
		correct,
		timeMs,
		at: Date.now()
	};
}

describe('createState', () => {
	it('returns empty state', () => {
		const s = createState();
		expect(s.answered).toBe(0);
		expect(s.unlockedOps).toEqual([]);
		expect(s.calibrations).toEqual([]);
		expect(s.add.band).toBe(0);
	});
});

describe('applyUnlocks', () => {
	it('unlocks + and − at level 1 with calibration phases', () => {
		const s = createState();
		applyUnlocks(s, 1);
		expect(s.unlockedOps).toContain('add');
		expect(s.unlockedOps).toContain('sub');
		expect(s.calibrations.length).toBe(2);
		expect(s.calibrations.every((c) => !c.done)).toBe(true);
	});

	it('does not double-unlock when called repeatedly', () => {
		const s = createState();
		applyUnlocks(s, 1);
		applyUnlocks(s, 2);
		applyUnlocks(s, 5);
		expect(s.unlockedOps.length).toBe(2);
		expect(s.calibrations.length).toBe(2);
	});

	it('unlocks × at its configured level', () => {
		const s = createState();
		applyUnlocks(s, OP_UNLOCK_LEVEL.mul);
		expect(s.unlockedOps).toContain('mul');
	});
});

describe('nextProbeBand', () => {
	it('starts at the configured starting band', () => {
		expect(nextProbeBand('add', [])).toBe(STARTING_PROBE_BAND.add);
	});

	it('climbs on correct, drops on wrong', () => {
		expect(nextProbeBand('add', [{ band: 3, correct: true }])).toBe(4);
		expect(nextProbeBand('add', [{ band: 3, correct: false }])).toBe(2);
	});
});

describe('evaluateCalibration', () => {
	it('locks at finalBand when bracketed', () => {
		const phase = {
			op: 'add' as const,
			trials: [
				{ band: 3, correct: true },
				{ band: 4, correct: false },
				{ band: 3, correct: true },
				{ band: 4, correct: false }
			],
			done: false,
			finalBand: null as number | null
		};
		evaluateCalibration('add', phase);
		expect(phase.done).toBe(true);
		expect(phase.finalBand).toBe(3);
	});

	it('locks at 1 when 2 wrongs at floor', () => {
		const phase = {
			op: 'sub' as const,
			trials: [
				{ band: 1, correct: false },
				{ band: 1, correct: false }
			],
			done: false,
			finalBand: null as number | null
		};
		evaluateCalibration('sub', phase);
		expect(phase.done).toBe(true);
		expect(phase.finalBand).toBe(1);
	});

	it('locks at max band when ceiling hit', () => {
		const phase = {
			op: 'div' as const,
			trials: [
				{ band: 1, correct: true },
				{ band: 2, correct: true },
				{ band: 3, correct: true },
				{ band: 4, correct: true },
				{ band: 5, correct: true },
				{ band: 6, correct: true }
			],
			done: false,
			finalBand: null as number | null
		};
		evaluateCalibration('div', phase);
		expect(phase.done).toBe(true);
		expect(phase.finalBand).toBe(6);
	});
});

describe('classifySpeed', () => {
	it("returns 'normal' without history", () => {
		const om = {
			band: 0,
			confidence: 0,
			medianTimeByBand: {},
			recentByBand: {},
			stage: 'choices_easy' as const,
			stageProgress: 0
		};
		expect(classifySpeed(om, 3, 1000)).toBe('normal');
	});

	it('classifies vs median (fast/normal/slow)', () => {
		const om = {
			band: 0,
			confidence: 0,
			medianTimeByBand: { 3: 4000 },
			recentByBand: {},
			stage: 'choices_easy' as const,
			stageProgress: 0
		};
		expect(classifySpeed(om, 3, 2000)).toBe('fast');
		expect(classifySpeed(om, 3, 4000)).toBe('normal');
		expect(classifySpeed(om, 3, 6000)).toBe('slow');
	});
});

describe('recordAnswer — calibration phase', () => {
	function setup(): MasteryState {
		const s = createState();
		applyUnlocks(s, 1);
		return s;
	}

	it('walks calibration via recorded events and lands on a band', () => {
		const s = setup();
		recordAnswer(s, event('add', 3, true));
		recordAnswer(s, event('add', 4, true));
		recordAnswer(s, event('add', 5, false));
		recordAnswer(s, event('add', 4, false));
		const phase = s.calibrations.find((c) => c.op === 'add');
		expect(phase?.done).toBe(true);
		expect(s.add.band).toBe(phase!.finalBand);
	});
});

describe('recordAnswer — steady state', () => {
	function steady(): MasteryState {
		const s = createState();
		applyUnlocks(s, 1);
		const calib = getCalibration(s, 'add')!;
		calib.done = true;
		calib.finalBand = 5;
		s.add.band = 5;
		const calibSub = getCalibration(s, 'sub')!;
		calibSub.done = true;
		calibSub.finalBand = 4;
		s.sub.band = 4;
		return s;
	}

	it('does NOT auto-promote band on per-answer confidence (band only goes up via numpad consolidation in evaluateLevelOutcome)', () => {
		const s = steady();
		for (let i = 0; i < 10; i++) recordAnswer(s, event('add', 5, true, 100));
		expect(s.add.band).toBe(5);
	});

	it('demotes band after enough wrong answers', () => {
		const s = steady();
		for (let i = 0; i < 3; i++) recordAnswer(s, event('add', 5, false));
		expect(s.add.band).toBeLessThanOrEqual(4);
	});

	it('mid-level demote: 3 wrongs in last 5 at band triggers demote (R4)', () => {
		const s = steady();
		// Pad with 5 alternating non-fluent answers so confidence stays in range,
		// then a 3rd wrong inside the rolling window fires the burst guard.
		recordAnswer(s, event('add', 5, true, 5000));
		recordAnswer(s, event('add', 5, true, 5000));
		recordAnswer(s, event('add', 5, true, 5000));
		recordAnswer(s, event('add', 5, false));
		recordAnswer(s, event('add', 5, false));
		// Last 5 = [T, T, T, F, F]; confidence ≈ 1, no demote yet
		expect(s.add.band).toBe(5);
		recordAnswer(s, event('add', 5, false));
		// Last 5 = [T, T, F, F, F] — three wrongs → mid-level demote
		expect(s.add.band).toBe(4);
	});
});
