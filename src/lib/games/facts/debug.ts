import type { MasteryState, Question, Operation, AnswerEvent } from '$lib/curriculum/types';

const OP_LABEL: Record<Operation, string> = {
	add: '+',
	sub: '−',
	mul: '×',
	div: '÷'
};

export function opLabel(op: Operation): string {
	return OP_LABEL[op];
}

export interface OpSummary {
	op: Operation;
	band: number;
	confidence: number;
	unlocked: boolean;
	calibrating: boolean;
}

export function opSummaries(state: MasteryState): OpSummary[] {
	const ops: Operation[] = ['add', 'sub', 'mul', 'div'];
	return ops.map((op) => ({
		op,
		band: state[op].band,
		confidence: state[op].confidence,
		unlocked: state.unlockedOps.includes(op),
		calibrating: state.calibrations.some((c) => c.op === op && !c.done)
	}));
}

export function makeAnswerEvent(q: Question, answer: number, timeMs: number): AnswerEvent {
	return {
		questionId: q.id,
		template: q.template,
		operation: q.operation,
		band: q.band,
		correct: answer === q.answer,
		timeMs,
		at: Date.now()
	};
}

export interface LevelOutcome {
	correct: number;
	total: number;
	avgMs: number;
}

export function summarizeLevel(events: AnswerEvent[]): LevelOutcome {
	const total = events.length;
	const correct = events.filter((e) => e.correct).length;
	const avgMs = total ? events.reduce((s, e) => s + e.timeMs, 0) / total : 0;
	return { correct, total, avgMs };
}
