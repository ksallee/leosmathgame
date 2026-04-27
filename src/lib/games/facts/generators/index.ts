import type { Operation, Band, Question, SeededRng } from '$lib/curriculum/types';
import type { OpGenerators } from './util';
import { additionGen } from './addition';
import { subtractionGen } from './subtraction';
import { multiplicationGen } from './multiplication';
import { divisionGen } from './division';

const REGISTRY: Record<Operation, OpGenerators> = {
	add: additionGen,
	sub: subtractionGen,
	mul: multiplicationGen,
	div: divisionGen
};

export function maxBand(op: Operation): Band {
	return REGISTRY[op].maxBand;
}

export function clampBand(op: Operation, band: Band): Band {
	return Math.max(1, Math.min(maxBand(op), band));
}

export function generate(op: Operation, band: Band, rng: SeededRng): Question {
	const clamped = clampBand(op, band);
	const fn = REGISTRY[op].bands[clamped];
	if (!fn) throw new Error(`No generator for ${op} band ${clamped}`);
	return fn(rng);
}
