import type {
	MasteryState,
	LeitnerEntry,
	LeitnerBucket,
	Operation,
	Band,
	Question,
	AnswerEvent
} from './types';
import { LEITNER_GRANULARITY, LEITNER_INTERVALS } from './config';

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

function scheduleDue(state: MasteryState, bucket: LeitnerBucket): number {
	return state.answered + LEITNER_INTERVALS[bucket];
}

/** Returns true if this answer should drive a Leitner update for this op. */
function isTracked(op: Operation): boolean {
	return LEITNER_GRANULARITY[op] === 'instance' || LEITNER_GRANULARITY[op] === 'template';
}

export function recordForLeitner(state: MasteryState, ev: AnswerEvent): void {
	if (!isTracked(ev.operation)) return;
	const key = keyFor(ev);
	const existing = findEntry(state, key);

	if (!ev.correct) {
		const entry: LeitnerEntry = existing ?? {
			key,
			operation: ev.operation,
			band: ev.band,
			bucket: 0,
			dueAtAnswerCount: 0
		};
		entry.bucket = 0;
		entry.band = ev.band;
		entry.dueAtAnswerCount = scheduleDue(state, 0);
		if (!existing) state.leitner.push(entry);
		return;
	}

	if (!existing) return;
	const newBucket = Math.min(2, existing.bucket + 1) as LeitnerBucket;
	existing.bucket = newBucket;
	existing.dueAtAnswerCount = scheduleDue(state, newBucket);
}

/** Entries currently due for review, restricted to currently-unlocked ops. */
export function dueEntries(state: MasteryState): LeitnerEntry[] {
	return state.leitner.filter(
		(e) => e.dueAtAnswerCount <= state.answered && state.unlockedOps.includes(e.operation)
	);
}

export function pickDue(
	state: MasteryState,
	op?: Operation,
	band?: Band
): LeitnerEntry | undefined {
	const due = dueEntries(state);
	const filtered = due.filter(
		(e) => (op ? e.operation === op : true) && (band ? e.band === band : true)
	);
	if (filtered.length === 0) return undefined;
	return filtered[0];
}
