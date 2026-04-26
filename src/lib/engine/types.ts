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

export interface OpMastery {
	band: Band;
	confidence: number;
	medianTimeByBand: Record<Band, number>;
	recentByBand: Record<Band, boolean[]>;
}

export type LeitnerBucket = 0 | 1 | 2;

export interface LeitnerEntry {
	key: string;
	operation: Operation;
	band: Band;
	bucket: LeitnerBucket;
	dueAtAnswerCount: number;
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
