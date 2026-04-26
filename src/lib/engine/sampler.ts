import type { MasteryState, Operation, Band, Question, SeededRng, GenerateOptions } from './types';
import {
	QUESTIONS_PER_LEVEL,
	REVIEW_FRACTION,
	STEADY_AT_BAND_WEIGHT,
	STEADY_BELOW_BAND_WEIGHT
} from './config';
import { applyUnlocks, getCalibration, nextProbeBand } from './mastery';
import { dueEntries } from './leitner';
import { generate, clampBand } from './generators';
import { makeRng } from './rng';

function pickWeightedBandOffset(rng: SeededRng): -1 | 0 | 1 {
	const r = rng.next();
	if (r < STEADY_AT_BAND_WEIGHT) return 0;
	if (r < STEADY_AT_BAND_WEIGHT + STEADY_BELOW_BAND_WEIGHT) return -1;
	return 1;
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

		const due = dueEntries(state).filter((e) => useOps.includes(e.operation));
		if (due.length > 0 && rng.chance(REVIEW_FRACTION)) {
			const entry = rng.pick(due);
			out.push(uniqueQuestion(entry.operation, entry.band, rng, seen));
			continue;
		}

		const op = rrPick(useOps, opCounter++);
		const baseBand = opts?.bandFor ? opts.bandFor(op) : state[op].band || 1;
		const offset = pickWeightedBandOffset(rng);
		const targetBand = clampBand(op, baseBand + offset);
		out.push(uniqueQuestion(op, targetBand, rng, seen));
	}

	return out;
}
