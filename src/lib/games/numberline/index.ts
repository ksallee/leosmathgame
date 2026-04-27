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

export interface QuestionConstraints {
	/** Restrict the answer's tick to this range (inclusive). Used by bands
	 *  that share a number-line range but bias questions toward a sub-region
	 *  (e.g., "0-20 with midpoint targets" → targetMin=8, targetMax=12). */
	targetMin?: number;
	targetMax?: number;
}

/** Generate a question whose answer fits on a [0, rangeMax] line.
 *  ADD: hero starts at the first operand, hops right by the second.
 *  SUB: hero starts at the larger operand, hops left by the smaller. */
export function generateQuestion(
	kind: QuestionKind,
	rangeMax: number,
	rng: SeededRng,
	constraints: QuestionConstraints = {}
): NumberLineQuestion {
	const tMin = Math.max(0, constraints.targetMin ?? 0);
	const tMax = Math.min(rangeMax, constraints.targetMax ?? rangeMax);

	if (kind === 'add') {
		// Pick a target sum in the constrained range, then split it.
		const minSum = Math.max(2, tMin);
		const maxSum = Math.min(rangeMax, tMax);
		const target = rng.int(minSum, Math.max(minSum, maxSum));
		const a = rng.int(1, target - 1);
		const b = target - a;
		return {
			kind,
			startTick: a,
			targetTick: target,
			prompt: `${a} + ${b} = ?`,
			operands: [a, b]
		};
	}
	// 'sub' — pick the difference (target) in the constrained range, then
	// pick the minuend such that subtrahend ≥ 1.
	const minDiff = Math.max(0, tMin);
	const maxDiff = Math.min(rangeMax - 1, tMax);
	const target = rng.int(minDiff, Math.max(minDiff, maxDiff));
	const a = rng.int(target + 1, rangeMax);
	const b = a - target;
	return {
		kind,
		startTick: a,
		targetTick: target,
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

// Band ladder per docs/research/numberline-design.md.
// Key empirical anchors:
//  - Friso-van den Bos 2014: ~75% of 7yos linear on 0-20 by Year 2
//  - Siegler & Booth 2004: log→linear shift on 0-100 between K and Grade 2
//  - Peeters et al. 2017: unlabeled benchmarks HURT 8yo on 0-1000 (8% vs 3%
//    error). Sparsifying labels too early removes scaffolding without
//    aiding magnitude estimation. Minor ticks must always remain countable.
//  - 0-1000 deferred to v2 (genuinely premature for 7yo).
export interface NumberLineBand {
	band: number;
	rangeMin: number;
	rangeMax: number;
	labelEvery: number;
	/** Question targets restricted to this sub-range, when set. Used by B4
	 *  ("same line, harder targets") — the strongest cognitive jump is
	 *  midpoint use within a familiar range, not new range. */
	targetMin?: number;
	targetMax?: number;
	description: string;
}

export const NUMBER_LINE_BANDS: ReadonlyArray<NumberLineBand> = [
	{ band: 1, rangeMin: 0, rangeMax: 5, labelEvery: 1, description: '0-5, every tick labeled' },
	{ band: 2, rangeMin: 0, rangeMax: 10, labelEvery: 1, description: '0-10, every tick labeled' },
	{ band: 3, rangeMin: 0, rangeMax: 20, labelEvery: 1, description: '0-20, every tick labeled' },
	{
		band: 4,
		rangeMin: 0,
		rangeMax: 20,
		labelEvery: 1,
		targetMin: 8,
		targetMax: 12,
		description: '0-20, midpoint targets (8-12) — same line, harder mental position'
	},
	{
		band: 5,
		rangeMin: 0,
		rangeMax: 30,
		labelEvery: 1,
		description: '0-30, every tick labeled (no sparsification yet)'
	},
	{
		band: 6,
		rangeMin: 0,
		rangeMax: 50,
		labelEvery: 5,
		description: '0-50, label every 5 (minor ticks countable)'
	},
	{
		band: 7,
		rangeMin: 0,
		rangeMax: 100,
		labelEvery: 5,
		description: '0-100, label every 5 (denser labels for readability)'
	}
];

export function bandConfig(band: number): NumberLineBand {
	return NUMBER_LINE_BANDS[Math.max(0, Math.min(NUMBER_LINE_BANDS.length - 1, band - 1))];
}

/** Compute tick spacing to fill the available width without exceeding a
 *  reasonable max. Below MIN_SPACING the result is clamped to MIN_SPACING
 *  and `needsScroll = true` — caller should make the line horizontally
 *  scrollable. Above MAX_SPACING ticks would feel wastefully sparse so we
 *  cap there. */
export interface TickSizing {
	spacing: number;
	needsScroll: boolean;
}

// Lowered from 32 → 22 so B6 (0-50) fits a typical iPad container without
// scroll, and B7 (0-100) only needs ~2× scroll instead of ~3.5×. Tap zones
// extend the full tickSpacing wide so individual ticks remain hittable
// even at this density.
const MIN_TICK_SPACING = 22;
// Raised 88 → 160 so few-tick bands (B1 0-5, B2 0-10) actually use the
// available width on iPad/desktop instead of huddling in a narrow box in
// the middle of a wide scene.
const MAX_TICK_SPACING = 160;

export function computeTickSpacing(numTicks: number, availableWidth: number): TickSizing {
	if (numTicks <= 1 || availableWidth <= 0) {
		return { spacing: MAX_TICK_SPACING, needsScroll: false };
	}
	const ideal = availableWidth / (numTicks - 1);
	if (ideal > MAX_TICK_SPACING) return { spacing: MAX_TICK_SPACING, needsScroll: false };
	if (ideal < MIN_TICK_SPACING) return { spacing: MIN_TICK_SPACING, needsScroll: true };
	return { spacing: Math.floor(ideal), needsScroll: false };
}

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

// World theme variants for the number-line scene. Reuse the world themes
// already defined for the facts game (forest / desert / cave / snow / pirate)
// so the kid sees a consistent palette as they cycle through worlds across
// both mini-games.
export type NumberlineTheme = 'forest' | 'desert' | 'cave' | 'snow' | 'pirate';

export interface NumberlineProp {
	src: string;
	/** Position as scene-relative percentages or px. */
	left: string;
	top?: string;
	bottom?: string;
	scale: number;
	opacity?: number;
	zIndex?: number;
}

export interface NumberlineThemeStyle {
	bgGradient: string;
	lineGradient: string;
	lineGlow: string;
	tickColor: string;
	labelColor: string;
	/** Hover-state fill for tap zones. Distinct from lineGradient so the
	 *  hover affordance contrasts with the line itself. */
	hoverFill: string;
	hoverBorder: string;
	/** Optional decorative ground band drawn under the line. */
	groundGradient?: string;
	/** Decorative props (corner palms/boxes/spikes/etc.) reused from
	 *  static/sprites/decor/ — positioned absolutely inside the scene. */
	props: NumberlineProp[];
}

export const NUMBERLINE_THEMES: Record<NumberlineTheme, NumberlineThemeStyle> = {
	forest: {
		bgGradient: 'linear-gradient(180deg, #14532d 0%, #166534 50%, #15803d 100%)',
		lineGradient: 'linear-gradient(90deg, #d97706, #b45309)',
		lineGlow: 'rgba(217, 119, 6, 0.45)',
		tickColor: 'rgba(255, 255, 255, 0.7)',
		labelColor: 'rgba(255, 255, 255, 0.92)',
		hoverFill: 'rgba(190, 242, 100, 0.25)',
		hoverBorder: 'rgba(190, 242, 100, 0.6)',
		groundGradient: 'linear-gradient(180deg, #78350f 0%, #451a03 100%)',
		props: [
			{ src: '/sprites/decor/palm_top_a.png', left: '4%', scale: 1.4 },
			{ src: '/sprites/decor/palm_top_c.png', left: '92%', scale: 1.6 },
			{ src: '/sprites/decor/cloud_a.png', left: '18%', top: '10%', scale: 1.3, opacity: 0.45 },
			{ src: '/sprites/decor/cloud_b.png', left: '70%', top: '18%', scale: 1.0, opacity: 0.45 }
		]
	},
	desert: {
		bgGradient: 'linear-gradient(180deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)',
		lineGradient: 'linear-gradient(90deg, #fef3c7, #fbbf24)',
		lineGlow: 'rgba(251, 191, 36, 0.5)',
		tickColor: 'rgba(255, 255, 255, 0.85)',
		labelColor: 'rgba(255, 255, 255, 0.95)',
		hoverFill: 'rgba(251, 146, 60, 0.3)',
		hoverBorder: 'rgba(251, 146, 60, 0.7)',
		groundGradient: 'linear-gradient(180deg, #a16207 0%, #713f12 100%)',
		props: [
			{ src: '/sprites/decor/box1.png', left: '6%', scale: 1.6 },
			{ src: '/sprites/decor/box2.png', left: '90%', scale: 1.4 },
			{ src: '/sprites/decor/cloud_c.png', left: '40%', top: '8%', scale: 1.0, opacity: 0.4 }
		]
	},
	cave: {
		bgGradient: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
		lineGradient: 'linear-gradient(90deg, #38bdf8, #0284c7)',
		lineGlow: 'rgba(56, 189, 248, 0.5)',
		tickColor: 'rgba(186, 230, 253, 0.85)',
		labelColor: 'rgba(224, 242, 254, 0.95)',
		hoverFill: 'rgba(192, 132, 252, 0.28)',
		hoverBorder: 'rgba(192, 132, 252, 0.7)',
		groundGradient: 'linear-gradient(180deg, #44403c 0%, #1c1917 100%)',
		props: [
			{ src: '/sprites/decor/spikes.png', left: '3%', scale: 1.2 },
			{ src: '/sprites/decor/spikes.png', left: '95%', scale: 1.2 },
			{ src: '/sprites/decor/box3.png', left: '50%', scale: 1.0 }
		]
	},
	snow: {
		bgGradient: 'linear-gradient(180deg, #1e293b 0%, #334155 50%, #64748b 100%)',
		lineGradient: 'linear-gradient(90deg, #e0f2fe, #bae6fd)',
		lineGlow: 'rgba(186, 230, 253, 0.45)',
		tickColor: 'rgba(30, 41, 59, 0.85)',
		labelColor: 'rgba(15, 23, 42, 0.95)',
		hoverFill: 'rgba(125, 211, 252, 0.32)',
		hoverBorder: 'rgba(125, 211, 252, 0.7)',
		groundGradient: 'linear-gradient(180deg, #f1f5f9 0%, #cbd5e1 100%)',
		props: [
			{ src: '/sprites/decor/box1.png', left: '5%', scale: 1.4 },
			{ src: '/sprites/decor/box3.png', left: '93%', scale: 1.4 },
			{ src: '/sprites/decor/cloud_a.png', left: '25%', top: '10%', scale: 1.4, opacity: 0.55 },
			{ src: '/sprites/decor/cloud_c.png', left: '72%', top: '14%', scale: 1.2, opacity: 0.55 }
		]
	},
	pirate: {
		bgGradient: 'linear-gradient(180deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
		lineGradient: 'linear-gradient(90deg, #facc15, #f59e0b)',
		lineGlow: 'rgba(252, 211, 77, 0.4)',
		tickColor: 'rgba(255, 255, 255, 0.85)',
		labelColor: 'rgba(255, 255, 255, 0.95)',
		hoverFill: 'rgba(45, 212, 191, 0.28)',
		hoverBorder: 'rgba(45, 212, 191, 0.7)',
		groundGradient: 'linear-gradient(180deg, #92400e 0%, #57250a 100%)',
		props: [
			{ src: '/sprites/decor/palm_top_b.png', left: '6%', scale: 1.5 },
			{ src: '/sprites/decor/palm_top_d.png', left: '92%', scale: 1.7 },
			{ src: '/sprites/decor/box2.png', left: '50%', scale: 0.9 },
			{ src: '/sprites/decor/cloud_b.png', left: '30%', top: '10%', scale: 1.2, opacity: 0.55 }
		]
	}
};
