import type { Operation, Band, LeitnerBucket } from './types';

export const QUESTIONS_PER_LEVEL = 10;

export const OP_UNLOCK_LEVEL: Record<Operation, number> = {
	add: 1,
	sub: 1,
	mul: 20,
	div: 40
};

export const STARTING_PROBE_BAND: Record<Operation, Band> = {
	add: 3,
	sub: 2,
	mul: 2,
	div: 1
};

export const STEADY_AT_BAND_WEIGHT = 0.6;
export const STEADY_BELOW_BAND_WEIGHT = 0.25;
export const STEADY_ABOVE_BAND_WEIGHT = 0.15;

export const REVIEW_FRACTION = 0.3;

export const PROMOTE_FAST_CORRECT_THRESHOLD = 1;
export const DEMOTE_WRONG_STREAK = 2;

export const LEITNER_INTERVALS: Record<LeitnerBucket, number> = {
	0: 2,
	1: 12,
	2: 40
};

export const RECENT_WINDOW = 5;

/** Per-op granularity of Leitner tracking.
 *  - 'instance': track each specific question (good for memorized facts: ×, ÷)
 *  - 'template': track the band-level template (good for procedures: +, −)
 */
export const LEITNER_GRANULARITY: Record<Operation, 'instance' | 'template'> = {
	add: 'template',
	sub: 'template',
	mul: 'instance',
	div: 'instance'
};

/** Calibration: a band is "bracketed" when we have a CORRECT below
 *  the candidate ceiling and WRONG_TO_LOCK wrongs at or above it. */
export const CALIBRATION_WRONG_TO_LOCK = 2;
export const CALIBRATION_MAX_TRIALS = 8;
