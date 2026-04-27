// Number-line jump mini-game — lab module.
// Question generator + parabolic hop math. No physics simulation: jumps are
// pre-baked arcs from the current tick to the target tick. The lab uses
// this to iterate on level design + visual feel before promoting to a
// production game module.

import { makeRng } from '$lib/curriculum/rng';
import type { SeededRng } from '$lib/curriculum/types';

export type QuestionKind = 'add' | 'sub';

export interface NumberLineQuestion {
	kind: QuestionKind;
	/** Where the hero starts (always one of the operands). */
	startTick: number;
	/** The correct answer position. */
	targetTick: number;
	prompt: string;
	operands: [number, number];
}

/** Generate a question whose answer fits on a [0, rangeMax] line.
 *  ADD: hero starts at the first operand, hops right by the second.
 *  SUB: hero starts at the larger operand, hops left by the smaller. */
export function generateQuestion(
	kind: QuestionKind,
	rangeMax: number,
	rng: SeededRng
): NumberLineQuestion {
	if (kind === 'add') {
		const maxA = Math.max(1, Math.min(9, rangeMax - 1));
		const a = rng.int(1, maxA);
		const maxB = Math.max(1, Math.min(9, rangeMax - a));
		const b = rng.int(1, maxB);
		return {
			kind,
			startTick: a,
			targetTick: a + b,
			prompt: `${a} + ${b} = ?`,
			operands: [a, b]
		};
	}
	// 'sub'
	const a = rng.int(2, rangeMax);
	const b = rng.int(1, a - 1);
	return {
		kind,
		startTick: a,
		targetTick: a - b,
		prompt: `${a} − ${b} = ?`,
		operands: [a, b]
	};
}

export interface HopState {
	fromTick: number;
	toTick: number;
	startedAt: number;
	durationMs: number;
}

export interface HopFrame {
	tick: number; // continuous, e.g. 3.42 mid-hop
	yOffset: number; // px above the line (positive = up; baseline = 0)
	progress: number; // 0..1
	facing: 1 | -1;
}

/** Sample the hop's position at time `now`. Linear in tick (X), parabolic
 *  in Y with peak at progress=0.5. Returns the resting position once the
 *  hop completes. */
export function sampleHop(hop: HopState, arcHeight: number, now: number): HopFrame {
	const elapsed = Math.max(0, now - hop.startedAt);
	const progress = Math.min(1, elapsed / hop.durationMs);
	const tick = hop.fromTick + (hop.toTick - hop.fromTick) * progress;
	const yOffset = 4 * arcHeight * progress * (1 - progress);
	const facing: 1 | -1 = hop.toTick >= hop.fromTick ? 1 : -1;
	return { tick, yOffset, progress, facing };
}

export function hopComplete(hop: HopState, now: number): boolean {
	return now - hop.startedAt >= hop.durationMs;
}

export interface NumberLineConfig {
	rangeMin: number;
	rangeMax: number;
	tickSpacing: number; // px between ticks
	labelEvery: number; // 1 = every tick, 2 = every other, etc.
	/** When true, arcHeight + hopDurationMs are computed from the jump's
	 *  pixel distance via the calibration curve below (cf. computeHopDynamics).
	 *  When false, the manual arcHeight / hopDurationMs values are used
	 *  unchanged regardless of jump length. */
	autoScale: boolean;
	arcHeight: number; // px peak above the line (used when autoScale=false)
	hopDurationMs: number; // (used when autoScale=false)
	heroHeight: number; // px
	questionKind: QuestionKind;
}

export const DEFAULT_NUMBERLINE: NumberLineConfig = {
	rangeMin: 0,
	rangeMax: 10,
	tickSpacing: 64,
	labelEvery: 1,
	autoScale: true,
	arcHeight: 100,
	hopDurationMs: 550,
	heroHeight: 66,
	questionKind: 'add'
};

// Hop dynamics — closed-form linear scaling with clamps. Coefficients
// fitted to Kevin's lab calibration for ninja_frog at heroHeight=66:
//   arc ≈ 0.33 × pixel-distance, capped around 240px
//   dur ≈ 380ms + 0.35 × pixel-distance, capped around 700ms
//
// Using pixel distance (not tick count) so the arc matches the *physical*
// motion the eye sees: a 256px hop on a sparse 0-10 line and a 256px hop
// on a dense 0-100 line look like "the same jump", with the same arc.
// Tying to tick count instead would make numerically-bigger jumps feel
// dramatic regardless of visual size — defensible but more abstract.
//
// If the linear fit drifts at specific distances, tweak the coefficients
// here OR move back to a calibration-table approach (just stash a
// readonly [distance, arc, dur] array and lerp). The closed-form has
// fewer magic numbers; the table fits arbitrary curves.
export const HOP_FORMULA = {
	arcRatio: 0.33,
	arcMin: 50,
	arcMax: 240,
	durationBase: 380,
	durationRate: 0.35,
	durationMin: 380,
	durationMax: 700
} as const;

export interface HopDynamics {
	arcHeight: number;
	durationMs: number;
}

function clamp(v: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, v));
}

/** Compute arc + duration for a hop covering `distancePx` horizontally. */
export function computeHopDynamics(distancePx: number): HopDynamics {
	const d = Math.abs(distancePx);
	return {
		arcHeight: clamp(HOP_FORMULA.arcRatio * d, HOP_FORMULA.arcMin, HOP_FORMULA.arcMax),
		durationMs: clamp(
			HOP_FORMULA.durationBase + HOP_FORMULA.durationRate * d,
			HOP_FORMULA.durationMin,
			HOP_FORMULA.durationMax
		)
	};
}

export function resolveHopDynamics(config: NumberLineConfig, tickDistance: number): HopDynamics {
	if (!config.autoScale) {
		return { arcHeight: config.arcHeight, durationMs: config.hopDurationMs };
	}
	return computeHopDynamics(Math.abs(tickDistance) * config.tickSpacing);
}

export function makeRngFromSeed(seed: number): SeededRng {
	return makeRng(seed || 1);
}
