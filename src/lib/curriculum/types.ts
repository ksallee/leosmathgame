export type Operation = 'add' | 'sub' | 'mul' | 'div';

export type Band = number;

export interface Question {
	id: string;
	template: string;
	operation: Operation;
	band: Band;
	prompt: string;
	operands: number[];
	answer: number;
}

export interface AnswerEvent {
	questionId: string;
	template: string;
	operation: Operation;
	band: Band;
	correct: boolean;
	timeMs: number;
	at: number;
}

export type PresentationStage = 'choices_easy' | 'choices_hard' | 'numpad';

export interface OpMastery {
	band: Band;
	confidence: number;
	medianTimeByBand: Record<Band, number>;
	recentByBand: Record<Band, boolean[]>;
	/** Per-op presentation stage. Progression is sequential within a band:
	 *  choices_easy → choices_hard → numpad → (advance band, stage resets to
	 *  choices_easy). One stage per op, not per band, so the kid feels a
	 *  steady "leveling up the input method" rhythm. */
	stage: PresentationStage;
	/** Cumulative exposures in the current stage. Resets on stage transition. */
	stageProgress: number;
}

export type LeitnerBucket = 0 | 1 | 2 | 3;

export interface LeitnerEntry {
	key: string;
	operation: Operation;
	band: Band;
	bucket: LeitnerBucket;
	dueAtAnswerCount: number;
	dueAtWallMs: number;
}

export interface CalibrationPhase {
	op: Operation;
	trials: Array<{ band: Band; correct: boolean }>;
	done: boolean;
	finalBand: Band | null;
}

export interface MasteryState {
	add: OpMastery;
	sub: OpMastery;
	mul: OpMastery;
	div: OpMastery;
	answered: number;
	leitner: LeitnerEntry[];
	calibrations: CalibrationPhase[];
	unlockedOps: Operation[];
	/** Per-Leitner-key streak of fast-correct answers. Reset on miss or slow-
	 *  correct. Used to gate Leitner bucket promotion: only retrieval-fluent
	 *  facts (correct + fast) climb the spacing ladder, not facts the kid is
	 *  still finger-counting. */
	fastCorrectStreaks: Record<string, number>;
	/** Derived-fact bridges queued for the next sampling pass. When the kid
	 *  retrieval-masters 3+5, we enqueue 5+3 (and other rule-derived neighbors)
	 *  here so the sampler can prioritize them over pure random sampling. */
	pendingBridges: PendingBridge[];
	/** Number-line jump mini-game progression. Tracked separately from facts
	 *  mastery per the rotation-strategy brief (don't unify SRS across game
	 *  types in v1) — same kid skill but different presentation, separate
	 *  band ladders. */
	numberline: NumberlineMastery;
	/** Bridge mini-game progression. Single band index (1-8) — the bridge band
	 *  ladder in src/lib/games/bridge/ doesn't split by op (each band has its
	 *  own op baked in: B1-B5 add, B6-B8 sub). */
	bridge: BridgeMastery;
}

export interface NumberlineMastery {
	/** Current NL band per question kind (1-7 per the band ladder in
	 *  src/lib/games/numberline/). Lazy-initialized to band 1 when an op is
	 *  played for the first time. */
	band: Partial<Record<Operation, Band>>;
}

export interface BridgeMastery {
	/** Current bridge band (1-8). Single global band — the band ladder mixes
	 *  ops by design (B1-B5 add, B6-B8 sub). Lazy-initialized to band 1. */
	band: Band;
}

export interface PendingBridge {
	op: Operation;
	operands: number[];
	answer: number;
	band: Band;
}

export type Speed = 'fast' | 'normal' | 'slow';

export interface LevelRecord {
	level: number;
	bandsAtCompletion: Partial<Record<Operation, Band>>;
	bestStars: number;
	timesWon: number;
}

export interface GenerateOptions {
	seed?: number;
	bandFor?: (op: Operation) => Band;
	forceUnlockedOps?: Operation[];
}

export interface SeededRng {
	int(min: number, max: number): number;
	pick<T>(arr: readonly T[]): T;
	chance(p: number): boolean;
	next(): number;
}
