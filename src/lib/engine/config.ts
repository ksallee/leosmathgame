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

/** A correct answer faster than this threshold counts as retrieval-fluent.
 *  Below: still counting / deriving. The Leitner scheduler only promotes a
 *  card up the spacing ladder after RETRIEVAL_PROMOTE_STREAK *consecutive*
 *  retrieval-fluent answers — without this gate, finger-counting answers get
 *  promoted to monthly review and silently rot. */
export const RETRIEVAL_TIME_MS = 3000;
export const RETRIEVAL_PROMOTE_STREAK = 3;

/** When the last RECENT_WINDOW answers at a band include this many wrongs,
 *  demote one band immediately (don't wait for the level to end). */
export const MID_LEVEL_DEMOTE_WRONGS_OF_5 = 3;

export const LEITNER_INTERVALS: Record<LeitnerBucket, number> = {
	0: 2,
	1: 12,
	2: 40,
	3: 120
};

export const LEITNER_WALL_FLOORS_MS: Record<LeitnerBucket, number> = {
	0: 3 * 60_000,
	1: 24 * 60 * 60_000,
	2: 7 * 24 * 60 * 60_000,
	3: 30 * 24 * 60 * 60_000
};

export const RECENT_WINDOW = 5;

/** Correct answers needed to advance from one presentation stage to the next. */
export const STAGE_ADVANCE_THRESHOLD = 3;

/** Per-op granularity of Leitner tracking.
 *  - 'instance': track each specific question (good for memorized facts: ×, ÷)
 *  - 'template': track the band-level template (good for procedures: +, −)
 */
export const LEITNER_GRANULARITY: Record<Operation, 'instance' | 'template'> = {
	add: 'instance',
	sub: 'instance',
	mul: 'instance',
	div: 'instance'
};

/** Calibration: a band is "bracketed" when we have a CORRECT below
 *  the candidate ceiling and WRONG_TO_LOCK wrongs at or above it. */
export const CALIBRATION_WRONG_TO_LOCK = 2;
export const CALIBRATION_MAX_TRIALS = 8;
