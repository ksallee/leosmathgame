// Cross-game curriculum: per-skill progression (mastery, calibration, bands),
// spaced repetition (Leitner), derived-fact bridges, RNG. Anything tracked
// across multiple mini-game types lives here.

export type {
	Operation,
	Band,
	Question,
	AnswerEvent,
	OpMastery,
	MasteryState,
	LeitnerBucket,
	LeitnerEntry,
	CalibrationPhase,
	Speed,
	LevelRecord,
	GenerateOptions,
	PresentationStage,
	PendingBridge,
	SeededRng
} from './types';

export {
	OP_UNLOCK_LEVEL,
	STARTING_PROBE_BAND,
	LEITNER_GRANULARITY,
	LEITNER_INTERVALS,
	LEITNER_WALL_FLOORS_MS,
	RETRIEVAL_TIME_MS,
	RETRIEVAL_PROMOTE_STREAK,
	RECENT_WINDOW,
	MID_LEVEL_DEMOTE_WRONGS_OF_5,
	CALIBRATION_WRONG_TO_LOCK,
	CALIBRATION_MAX_TRIALS
} from './config';

export {
	createState,
	applyUnlocks,
	getCalibration,
	nextProbeBand,
	evaluateCalibration,
	classifySpeed,
	recordAnswer,
	opsUnlockedAt
} from './mastery';

export { recordForLeitner, dueEntries } from './leitner';
export { makeRng } from './rng';
export { bridgesFor, type BridgeTarget } from './bridges';
