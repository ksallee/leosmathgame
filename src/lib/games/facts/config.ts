// Facts-mini-game config: only constants used by the fact-retrieval sampler /
// stage logic. Cross-game progression constants (Leitner, retrieval gating,
// calibration, op-unlock levels, etc.) live in `$lib/curriculum/config`.

export const QUESTIONS_PER_LEVEL = 10;

/** Fraction of sampler picks that come from Leitner due-cards instead of the
 *  weighted band sampler. */
export const REVIEW_FRACTION = 0.3;

/** Sampler band-offset weights (legacy — current sampler uses single-band-at-
 *  a-time, but kept for reference / future rebalancing). */
export const STEADY_AT_BAND_WEIGHT = 0.6;
export const STEADY_BELOW_BAND_WEIGHT = 0.25;
export const STEADY_ABOVE_BAND_WEIGHT = 0.15;

export const PROMOTE_FAST_CORRECT_THRESHOLD = 1;
export const DEMOTE_WRONG_STREAK = 2;

/** Correct answers needed to advance from one presentation stage to the next. */
export const STAGE_ADVANCE_THRESHOLD = 3;
