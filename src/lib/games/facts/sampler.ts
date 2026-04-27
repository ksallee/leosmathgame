import type {
	MasteryState,
	Operation,
	Band,
	Question,
	SeededRng,
	GenerateOptions,
	PendingBridge
} from '$lib/curriculum/types';
import { QUESTIONS_PER_LEVEL, REVIEW_FRACTION } from './config';
import { applyUnlocks, getCalibration, nextProbeBand } from '$lib/curriculum/mastery';
import { dueEntries } from '$lib/curriculum/leitner';
import { generate } from './generators';
import { makeRng } from '$lib/curriculum/rng';

const SYM: Record<Operation, '+' | '−' | '×' | '÷'> = {
	add: '+',
	sub: '−',
	mul: '×',
	div: '÷'
};

function bridgeToQuestion(b: PendingBridge): Question {
	const sym = SYM[b.op];
	return {
		id: `${b.op}:b${b.band}:${b.operands.join(sym)}`,
		template: `${b.op}:b${b.band}`,
		operation: b.op,
		band: b.band,
		prompt: b.operands.join(` ${sym} `),
		operands: b.operands.slice(),
		answer: b.answer
	};
}

function calibratingOps(state: MasteryState): Operation[] {
	return state.unlockedOps.filter((op) => !!getCalibration(state, op));
}

function rrPick(ops: Operation[], counter: number): Operation {
	return ops[counter % ops.length];
}

function uniqueQuestion(
	op: Operation,
	band: Band,
	rng: SeededRng,
	seen: Set<string>,
	maxTries = 8
): Question {
	let q = generate(op, band, rng);
	let tries = 0;
	while (seen.has(q.id) && tries < maxTries) {
		q = generate(op, band, rng);
		tries++;
	}
	seen.add(q.id);
	return q;
}

/** Mutates state.unlockedOps and pushes calibration phases as side-effect.
 *  When opts.forceUnlockedOps is set (replay mode), calibration is skipped
 *  and sampling is restricted to that op set. opts.bandFor overrides the
 *  current per-op band used for sampling (replay at snapshot bands). */
export function generateLevel(
	state: MasteryState,
	level: number,
	opts?: GenerateOptions
): Question[] {
	applyUnlocks(state, level);

	const rng = makeRng(opts?.seed ?? level * 1000003 + state.answered);
	const isReplay = !!opts?.forceUnlockedOps;
	const useOps = opts?.forceUnlockedOps ?? state.unlockedOps;
	const out: Question[] = [];
	const seen = new Set<string>();
	let calibCounter = 0;
	let opCounter = 0;

	for (let i = 0; i < QUESTIONS_PER_LEVEL; i++) {
		const calibOps = isReplay ? [] : calibratingOps(state);

		if (calibOps.length > 0) {
			const op = rrPick(calibOps, calibCounter++);
			const phase = getCalibration(state, op)!;
			const band = nextProbeBand(op, phase.trials);
			out.push(uniqueQuestion(op, band, rng, seen));
			continue;
		}

		// Drain any pending derived-fact bridges first (R11). One per slot, capped
		// at ~half the level so they don't crowd out fresh sampling.
		if (
			!isReplay &&
			state.pendingBridges.length > 0 &&
			i < QUESTIONS_PER_LEVEL / 2 &&
			useOps.includes(state.pendingBridges[0].op)
		) {
			const bridge = state.pendingBridges.shift()!;
			const bq = bridgeToQuestion(bridge);
			if (!seen.has(bq.id)) {
				seen.add(bq.id);
				out.push(bq);
				continue;
			}
		}

		const due = dueEntries(state).filter((e) => useOps.includes(e.operation));
		if (due.length > 0 && rng.chance(REVIEW_FRACTION)) {
			const entry = rng.pick(due);
			out.push(uniqueQuestion(entry.operation, entry.band, rng, seen));
			continue;
		}

		// Single-band-at-a-time per op: stay at the kid's current band until
		// numpad consolidation bumps it. Inter-op alternation provides the
		// discriminative-contrast benefit (Rohrer/Taylor); past-band variety
		// comes from Leitner reviews above.
		const op = rrPick(useOps, opCounter++);
		const targetBand = opts?.bandFor ? opts.bandFor(op) : state[op].band || 1;
		out.push(uniqueQuestion(op, targetBand, rng, seen));
	}

	return out;
}
