import type {
	Operation,
	Band,
	OpMastery,
	MasteryState,
	Speed,
	AnswerEvent,
	CalibrationPhase
} from './types';
import {
	OP_UNLOCK_LEVEL,
	STARTING_PROBE_BAND,
	RECENT_WINDOW,
	CALIBRATION_WRONG_TO_LOCK,
	CALIBRATION_MAX_TRIALS,
	MID_LEVEL_DEMOTE_WRONGS_OF_5
} from './config';
import { clampBand, maxBand } from './generators';

const ALL_OPS: readonly Operation[] = ['add', 'sub', 'mul', 'div'];

/** Ops that would have been unlocked at the given level number (historical view). */
export function opsUnlockedAt(level: number): Operation[] {
	return ALL_OPS.filter((op) => OP_UNLOCK_LEVEL[op] <= level);
}

function emptyOpMastery(): OpMastery {
	return {
		band: 0,
		confidence: 0,
		medianTimeByBand: {},
		recentByBand: {},
		stage: 'choices_easy',
		stageProgress: 0
	};
}

export function createState(): MasteryState {
	return {
		add: emptyOpMastery(),
		sub: emptyOpMastery(),
		mul: emptyOpMastery(),
		div: emptyOpMastery(),
		answered: 0,
		leitner: [],
		calibrations: [],
		unlockedOps: [],
		fastCorrectStreaks: {},
		pendingBridges: []
	};
}

/** Reconcile unlocks for the given level: unlocks any op whose unlock-level
 *  has been reached, and starts a calibration phase for newly-unlocked ops. */
export function applyUnlocks(state: MasteryState, level: number): void {
	for (const op of ALL_OPS) {
		const unlockAt = OP_UNLOCK_LEVEL[op];
		if (level >= unlockAt && !state.unlockedOps.includes(op)) {
			state.unlockedOps.push(op);
			state.calibrations.push({
				op,
				trials: [],
				done: false,
				finalBand: null
			});
		}
	}
}

export function getCalibration(state: MasteryState, op: Operation): CalibrationPhase | undefined {
	return state.calibrations.find((c) => c.op === op && !c.done);
}

/** Pick the next probe band given trials so far. */
export function nextProbeBand(op: Operation, trials: CalibrationPhase['trials']): Band {
	if (trials.length === 0) return STARTING_PROBE_BAND[op];
	const last = trials[trials.length - 1];
	if (last.correct) return clampBand(op, last.band + 1);
	return clampBand(op, last.band - 1);
}

/** Decide whether calibration is locked, and if so set finalBand. */
export function evaluateCalibration(op: Operation, phase: CalibrationPhase): void {
	if (phase.done) return;
	const trials = phase.trials;
	if (trials.length === 0) return;

	const correctBands = trials.filter((t) => t.correct).map((t) => t.band);
	const wrongBands = trials.filter((t) => !t.correct).map((t) => t.band);
	const maxCorrect = correctBands.length ? Math.max(...correctBands) : 0;

	// Hit ceiling at max band
	if (maxCorrect >= maxBand(op)) {
		phase.done = true;
		phase.finalBand = maxBand(op);
		return;
	}

	// Wrong twice at the floor — lock at band 1
	const wrongAtFloor = wrongBands.filter((b) => b === 1).length;
	if (wrongAtFloor >= CALIBRATION_WRONG_TO_LOCK) {
		phase.done = true;
		phase.finalBand = 1;
		return;
	}

	// Bracketed: there is a correct at C and ≥WRONG_TO_LOCK wrongs strictly above C
	for (let c = maxCorrect; c >= 1; c--) {
		const wrongsAbove = wrongBands.filter((b) => b > c).length;
		if (correctBands.includes(c) && wrongsAbove >= CALIBRATION_WRONG_TO_LOCK) {
			phase.done = true;
			phase.finalBand = c;
			return;
		}
	}

	// Single wrong followed by drop-and-correct also locks
	if (trials.length >= 3) {
		const last = trials[trials.length - 1];
		const prev = trials[trials.length - 2];
		if (last.correct && !prev.correct && prev.band === last.band + 1) {
			phase.done = true;
			phase.finalBand = last.band;
			return;
		}
	}

	// Too many trials: settle on best correct band, or the starting band
	if (trials.length >= CALIBRATION_MAX_TRIALS) {
		phase.done = true;
		phase.finalBand = maxCorrect || STARTING_PROBE_BAND[op];
	}
}

export function classifySpeed(om: OpMastery, band: Band, timeMs: number): Speed {
	const median = om.medianTimeByBand[band];
	if (!median || median <= 0) return 'normal';
	if (timeMs < median * 0.7) return 'fast';
	if (timeMs > median * 1.3) return 'slow';
	return 'normal';
}

function pushRecent(om: OpMastery, band: Band, correct: boolean) {
	const arr = om.recentByBand[band] ?? [];
	arr.push(correct);
	while (arr.length > RECENT_WINDOW) arr.shift();
	om.recentByBand[band] = arr;
}

function updateMedianTime(om: OpMastery, band: Band, timeMs: number) {
	const prev = om.medianTimeByBand[band];
	om.medianTimeByBand[band] = prev ? prev * 0.7 + timeMs * 0.3 : timeMs;
}

/** Adjust confidence based on a steady-state answer.
 *  Band PROMOTION no longer happens here — bands only advance via numpad
 *  consolidation in `evaluateLevelOutcome` (per the user's "stay on the same
 *  band, level up your input method, then bump the band" model).
 *  Band DEMOTION still happens here, both via the confidence floor and the
 *  mid-level error-burst guard, since these are weakness signals that
 *  shouldn't wait for level-end. On any demote, the stage also resets to
 *  choices_easy — kid needs the scaffolding back. */
function applySteadyState(
	om: OpMastery,
	op: Operation,
	band: Band,
	correct: boolean,
	speed: Speed
) {
	if (correct) {
		om.confidence += speed === 'fast' ? 2 : 1;
	} else {
		om.confidence -= 2;
	}
	let demoted = false;
	if (om.confidence <= -3) {
		const newBand = clampBand(op, om.band - 1);
		if (newBand !== om.band) {
			om.band = newBand;
			om.stage = 'choices_easy';
			om.stageProgress = 0;
			demoted = true;
		}
		om.confidence = 0;
	}

	if (!demoted) {
		const recent = om.recentByBand[band] ?? [];
		if (recent.length >= 5 && recent.filter((v) => !v).length >= MID_LEVEL_DEMOTE_WRONGS_OF_5) {
			const newBand = clampBand(op, om.band - 1);
			if (newBand !== om.band) {
				om.band = newBand;
				om.stage = 'choices_easy';
				om.stageProgress = 0;
				om.confidence = 0;
				om.recentByBand[band] = [];
			}
		}
	}
}

/** Record an answer event. Mutates state. */
export function recordAnswer(state: MasteryState, ev: AnswerEvent): void {
	state.answered += 1;
	const om = state[ev.operation];
	updateMedianTime(om, ev.band, ev.timeMs);
	pushRecent(om, ev.band, ev.correct);

	const phase = getCalibration(state, ev.operation);
	if (phase) {
		phase.trials.push({ band: ev.band, correct: ev.correct });
		evaluateCalibration(ev.operation, phase);
		if (phase.done && phase.finalBand !== null) {
			om.band = phase.finalBand;
			om.confidence = 0;
		}
		return;
	}

	const speed = classifySpeed(om, ev.band, ev.timeMs);
	if (om.band === 0) {
		om.band = clampBand(ev.operation, ev.band);
	}
	applySteadyState(om, ev.operation, ev.band, ev.correct, speed);
}
