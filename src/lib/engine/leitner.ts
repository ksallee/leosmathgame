import type {
	MasteryState,
	LeitnerEntry,
	LeitnerBucket,
	Operation,
	Band,
	Question,
	AnswerEvent
} from './types';
import {
	LEITNER_GRANULARITY,
	LEITNER_INTERVALS,
	LEITNER_WALL_FLOORS_MS,
	RETRIEVAL_TIME_MS,
	RETRIEVAL_PROMOTE_STREAK
} from './config';
import { bridgesFor } from './bridges';

function keyFor(question: Question | AnswerEvent): string {
	const op = question.operation;
	if (LEITNER_GRANULARITY[op] === 'instance') {
		return 'questionId' in question ? question.questionId : question.id;
	}
	return question.template;
}

function findEntry(state: MasteryState, key: string): LeitnerEntry | undefined {
	return state.leitner.find((e) => e.key === key);
}

function dueAtAnswerCount(state: MasteryState, bucket: LeitnerBucket): number {
	return state.answered + LEITNER_INTERVALS[bucket];
}

function dueAtWallMs(nowMs: number, bucket: LeitnerBucket): number {
	return nowMs + LEITNER_WALL_FLOORS_MS[bucket];
}

function isTracked(op: Operation): boolean {
	return LEITNER_GRANULARITY[op] === 'instance' || LEITNER_GRANULARITY[op] === 'template';
}

export function recordForLeitner(state: MasteryState, ev: AnswerEvent): void {
	if (!isTracked(ev.operation)) return;
	const key = keyFor(ev);
	const existing = findEntry(state, key);

	if (!ev.correct) {
		state.fastCorrectStreaks[key] = 0;
		if (!existing) {
			state.leitner.push({
				key,
				operation: ev.operation,
				band: ev.band,
				bucket: 0,
				dueAtAnswerCount: dueAtAnswerCount(state, 0),
				dueAtWallMs: dueAtWallMs(ev.at, 0)
			});
			return;
		}
		const newBucket = Math.max(0, existing.bucket - 1) as LeitnerBucket;
		existing.bucket = newBucket;
		existing.band = ev.band;
		existing.dueAtAnswerCount = dueAtAnswerCount(state, newBucket);
		existing.dueAtWallMs = dueAtWallMs(ev.at, newBucket);
		return;
	}

	const isRetrieval = ev.timeMs < RETRIEVAL_TIME_MS;
	state.fastCorrectStreaks[key] = isRetrieval ? (state.fastCorrectStreaks[key] ?? 0) + 1 : 0;

	if (!existing) return;
	if ((state.fastCorrectStreaks[key] ?? 0) < RETRIEVAL_PROMOTE_STREAK) return;

	const newBucket = Math.min(3, existing.bucket + 1) as LeitnerBucket;
	existing.bucket = newBucket;
	existing.dueAtAnswerCount = dueAtAnswerCount(state, newBucket);
	existing.dueAtWallMs = dueAtWallMs(ev.at, newBucket);
	state.fastCorrectStreaks[key] = 0;
	enqueueBridges(state, ev);
}

const MAX_PENDING_BRIDGES = 12;

function enqueueBridges(state: MasteryState, ev: AnswerEvent): void {
	const operands = parseOperandsFromId(ev.questionId, ev.operation);
	if (operands.length !== 2) return;
	const answer = computeAnswer(ev.operation, operands);
	if (answer === null) return;
	const targets = bridgesFor(ev.operation, operands, answer, ev.band);
	for (const t of targets) {
		const targetKey = `${t.op}:b${t.band}:${t.operands.join(symbolFor(t.op))}`;
		if (state.leitner.some((l) => l.key === targetKey)) continue;
		if (state.pendingBridges.some((p) => p.op === t.op && sameOperands(p.operands, t.operands))) {
			continue;
		}
		state.pendingBridges.push(t);
	}
	while (state.pendingBridges.length > MAX_PENDING_BRIDGES) state.pendingBridges.shift();
}

function symbolFor(op: Operation): string {
	if (op === 'add') return '+';
	if (op === 'sub') return '−';
	if (op === 'mul') return '×';
	return '÷';
}

function sameOperands(a: number[], b: number[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}

function parseOperandsFromId(questionId: string, op: Operation): number[] {
	const parts = questionId.split(':');
	if (parts.length < 3) return [];
	const expr = parts.slice(2).join(':');
	const operands = expr.split(symbolFor(op)).map((s) => Number(s));
	if (operands.some((n) => !Number.isFinite(n))) return [];
	return operands;
}

function computeAnswer(op: Operation, operands: number[]): number | null {
	if (operands.length !== 2) return null;
	const [a, b] = operands;
	if (op === 'add') return a + b;
	if (op === 'sub') return a - b;
	if (op === 'mul') return a * b;
	if (op === 'div') return b !== 0 ? a / b : null;
	return null;
}

/** Entries currently due for review, restricted to currently-unlocked ops.
 *  Both wall-clock and answer-count gates must be satisfied — Cepeda's spacing
 *  law operates in real time, but we also avoid showing the same fact twice in
 *  a row even if its wall-clock floor expired during a long session. */
export function dueEntries(state: MasteryState, nowMs: number = Date.now()): LeitnerEntry[] {
	return state.leitner.filter(
		(e) =>
			e.dueAtAnswerCount <= state.answered &&
			e.dueAtWallMs <= nowMs &&
			state.unlockedOps.includes(e.operation)
	);
}

export function pickDue(
	state: MasteryState,
	op?: Operation,
	band?: Band,
	nowMs: number = Date.now()
): LeitnerEntry | undefined {
	const due = dueEntries(state, nowMs);
	const filtered = due.filter(
		(e) => (op ? e.operation === op : true) && (band ? e.band === band : true)
	);
	if (filtered.length === 0) return undefined;
	return filtered[0];
}
