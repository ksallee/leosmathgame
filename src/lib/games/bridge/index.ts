// Bridge mini-game — data layer.
// Pure TS: bands, question generator, per-world tokens. No Svelte/DOM deps.
// See docs/research/bridge-design.md for the pedagogy + band ladder rationale.
//
// Mechanic: scaffolded bridging via multiple-choice. Step count varies by
// question shape so each step tests something genuinely different:
//   - within-20 (B1, B2, B6): 2 steps — bond + total-via-ten
//   - two-digit add (B3, B4, B5): 3 steps — tens + ones + total
//   - two-digit sub (B7, B8): 2 steps — sub-tens + sub-ones (= total)

import { makeRng } from '$lib/curriculum/rng';
import type { SeededRng } from '$lib/curriculum/types';

export type BridgeOp = 'add' | 'sub';

// What this step is doing in the bridging strategy. The scene uses this to
// decide which visual update to play (fill ten-frame, combine bundles, etc).
export type BridgeStepKind =
	| 'complete-to-ten' // a + ? = nextTen        — within-20 add  / 2-digit + 1-digit
	| 'sub-to-ten' // a − ? = prevTen             — within-20 sub  / 2-digit − 1-digit
	| 'total-via-ten' // 10 + remainder = ?       — within-20 closing step
	| 'add-tens' // a + (bTens*10) = ?            — two-digit add, running total
	| 'add-ones' // running + bOnes = ?           — two-digit add, running total (may bridge)
	| 'sub-tens' // a − (bTens*10) = ?            — two-digit sub, running total
	| 'sub-ones' // running − bOnes = ?           — two-digit sub, running total (may bridge)
	| 'confirm'; // a op b = ?                     — restate original equation

export interface BridgeStep {
	/** Short context label shown above the equation, e.g. "Complète à 10". */
	instruction: string;
	/** The equation the kid solves, e.g. "8 + ? = 10". */
	equation: string;
	answer: number;
	/** Multiple-choice options including the correct answer, ordered ascending. */
	options: number[];
	kind: BridgeStepKind;
}

export interface BridgeQuestion {
	op: BridgeOp;
	a: number;
	b: number;
	total: number;
	/** Visual mode — within20 = literal ten-frames, twoDigit = base-10 bundles + loose dots. */
	visual: 'within20' | 'twoDigit';
	steps: BridgeStep[];
}

export interface BridgeBand {
	band: number;
	op: BridgeOp;
	visual: 'within20' | 'twoDigit';
	description: string;
}

// Eight bands per docs/research/bridge-design.md §2. All bridging-focused.
// Within-20 add (B1-B2) → two-digit add (B3-B5) → subtraction (B6-B8).
export const BRIDGE_BANDS: ReadonlyArray<BridgeBand> = [
	{
		band: 1,
		op: 'add',
		visual: 'within20',
		description: 'B1: bridge within 20, easy bonds (first addend ≥ 6)'
	},
	{
		band: 2,
		op: 'add',
		visual: 'within20',
		description: 'B2: bridge within 20, hard bonds (first addend ≤ 5)'
	},
	{
		band: 3,
		op: 'add',
		visual: 'twoDigit',
		description: 'B3: 2-digit + 1-digit bridging (28+5)'
	},
	{
		band: 4,
		op: 'add',
		visual: 'twoDigit',
		description: 'B4: 2+2-digit, no unit bridge (23+15)'
	},
	{
		band: 5,
		op: 'add',
		visual: 'twoDigit',
		description: 'B5: 2+2-digit with unit bridge (17+38)'
	},
	{
		band: 6,
		op: 'sub',
		visual: 'within20',
		description: 'B6: subtract bridge within 20 (13−5)'
	},
	{
		band: 7,
		op: 'sub',
		visual: 'twoDigit',
		description: 'B7: 2-digit − 1-digit bridging (24−7)'
	},
	{
		band: 8,
		op: 'sub',
		visual: 'twoDigit',
		description: 'B8: 2+2-digit subtraction bridging (52−37)'
	}
];

export function bandConfig(band: number): BridgeBand {
	return BRIDGE_BANDS[Math.max(0, Math.min(BRIDGE_BANDS.length - 1, band - 1))];
}

// ---- distractor generation ----

/** Build 3 ascending options that include `correct`. Distractors are ±1
 *  around correct (clamped to ≥ 0). For larger magnitudes the spread stays
 *  ±1 because off-by-one is the dominant error mode at 7yo. */
function options3(correct: number, rng: SeededRng): number[] {
	const candidates = new Set<number>();
	candidates.add(correct);
	// Always include correct ± 1 when available.
	if (correct - 1 >= 0) candidates.add(correct - 1);
	candidates.add(correct + 1);
	// If we somehow only have 2 (correct === 0), pad with correct + 2.
	if (candidates.size < 3) candidates.add(correct + 2);
	const arr = Array.from(candidates).sort((x, y) => x - y);
	// Light shuffle: 50% chance to swap the wrong-distractor side. Keeps the
	// correct answer from being predictably middle every time.
	if (arr.length > 3) arr.length = 3;
	if (rng.chance(0.3)) {
		// Add a "far" distractor instead of one of the ±1 ones, so the kid
		// can't always rely on "pick the middle".
		const far = correct + (rng.chance(0.5) ? 2 : -2);
		if (far >= 0 && !arr.includes(far)) {
			arr[arr.length - 1] = far;
			arr.sort((x, y) => x - y);
		}
	}
	return arr;
}

// ---- question generation ----

export function generateQuestion(band: BridgeBand, rng: SeededRng): BridgeQuestion {
	switch (band.band) {
		case 1:
			return genWithin20Add(rng, /* easyBonds */ true);
		case 2:
			return genWithin20Add(rng, /* easyBonds */ false);
		case 3:
			return genTwoPlusOne(rng);
		case 4:
			return genTwoPlusTwo(rng, /* withBridge */ false);
		case 5:
			return genTwoPlusTwo(rng, /* withBridge */ true);
		case 6:
			return genWithin20Sub(rng);
		case 7:
			return genTwoMinusOne(rng);
		case 8:
			return genTwoMinusTwo(rng);
		default:
			return genWithin20Add(rng, true);
	}
}

function genWithin20Add(rng: SeededRng, easyBonds: boolean): BridgeQuestion {
	// easyBonds: first addend ≥ 6 (bond-to-10 is small: 1-4).
	// hardBonds: first addend ≤ 5 (bond is 5-9, requires bigger split).
	const aRange: [number, number] = easyBonds ? [6, 9] : [3, 5];
	const a = rng.int(aRange[0], aRange[1]);
	const bond = 10 - a; // dots needed to fill the first frame
	const minB = bond + 1;
	const maxB = Math.min(9, 19 - a);
	const b = rng.int(minB, Math.max(minB, maxB));
	const total = a + b;
	const remainder = b - bond;
	return {
		op: 'add',
		a,
		b,
		total,
		visual: 'within20',
		steps: [
			{
				instruction: 'Complète à 10',
				equation: `${a} + ? = 10`,
				answer: bond,
				options: options3(bond, rng),
				kind: 'complete-to-ten'
			},
			{
				instruction: 'Donc le total',
				equation: `10 + ${remainder} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'total-via-ten'
			},
			{
				instruction: 'Confirme',
				equation: `${a} + ${b} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'confirm'
			}
		]
	};
}

function genTwoPlusOne(rng: SeededRng): BridgeQuestion {
	// 2-digit + 1-digit, must bridge a tens-boundary (a%10 + b > 10).
	const aOnes = rng.int(2, 9);
	const aTens = rng.int(1, 8); // 12-89
	const a = aTens * 10 + aOnes;
	const nextTen = (aTens + 1) * 10;
	const bond = nextTen - a;
	const minB = bond + 1;
	const maxB = 9;
	const b = rng.int(minB, Math.max(minB, maxB));
	const total = a + b;
	const remainder = b - bond;
	return {
		op: 'add',
		a,
		b,
		total,
		visual: 'twoDigit',
		steps: [
			{
				instruction: `Complète à ${nextTen}`,
				equation: `${a} + ? = ${nextTen}`,
				answer: bond,
				options: options3(bond, rng),
				kind: 'complete-to-ten'
			},
			{
				instruction: 'Donc le total',
				equation: `${nextTen} + ${remainder} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'total-via-ten'
			},
			{
				instruction: 'Confirme',
				equation: `${a} + ${b} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'confirm'
			}
		]
	};
}

function genTwoPlusTwo(rng: SeededRng, withBridge: boolean): BridgeQuestion {
	// 2-digit + 2-digit. withBridge=true forces ones-sum ≥ 10 (unit bridge).
	// Two-step mechanic: combine tens, then total. The ones sum is computed
	// mentally — within-10 bridging is acquired by B1-B2, so we don't
	// re-scaffold it here (per Salden 2010 adaptive fading principle).
	const aTens = rng.int(1, 4);
	const bTens = rng.int(1, 9 - aTens);
	const aOnes = rng.int(1, 9);
	// Always require bOnes ≥ 1 so B is never a round number (no 30, 40, 50…).
	// A round B reduces to B3-style content.
	const minBOnes = withBridge ? Math.max(1, 10 - aOnes) : 1;
	const maxBOnes = withBridge ? 9 : Math.max(1, 9 - aOnes);
	const bOnes = rng.int(minBOnes, Math.max(minBOnes, maxBOnes));
	const a = aTens * 10 + aOnes;
	const b = bTens * 10 + bOnes;
	const total = a + b;
	const runA1 = a + bTens * 10;
	return {
		op: 'add',
		a,
		b,
		total,
		visual: 'twoDigit',
		steps: [
			{
				instruction: 'Ajoute les dizaines',
				equation: `${a} + ${bTens * 10} = ?`,
				answer: runA1,
				options: options3(runA1, rng),
				kind: 'add-tens'
			},
			{
				instruction: 'Ajoute les unités',
				equation: `${runA1} + ${bOnes} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'add-ones'
			},
			{
				instruction: 'Confirme',
				equation: `${a} + ${b} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'confirm'
			}
		]
	};
}

function genWithin20Sub(rng: SeededRng): BridgeQuestion {
	// Subtract bridging within 20. a in 11-19, b such that a-b ≥ 0 AND
	// b > a%10 (forces borrow / bridge through 10).
	const a = rng.int(11, 19);
	const aOnes = a - 10;
	const minB = aOnes + 1;
	const maxB = Math.min(9, a);
	const b = rng.int(minB, Math.max(minB, maxB));
	const total = a - b;
	const bond = a - 10;
	const remainder = b - bond;
	return {
		op: 'sub',
		a,
		b,
		total,
		visual: 'within20',
		steps: [
			{
				instruction: 'Va à 10',
				equation: `${a} − ? = 10`,
				answer: bond,
				options: options3(bond, rng),
				kind: 'sub-to-ten'
			},
			{
				instruction: 'Donc le total',
				equation: `10 − ${remainder} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'total-via-ten'
			},
			{
				instruction: 'Confirme',
				equation: `${a} − ${b} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'confirm'
			}
		]
	};
}

function genTwoMinusOne(rng: SeededRng): BridgeQuestion {
	// 2-digit − 1-digit, must borrow (b > a%10).
	const aOnes = rng.int(1, 8);
	const aTens = rng.int(2, 9);
	const a = aTens * 10 + aOnes;
	const prevTen = aTens * 10;
	const minB = aOnes + 1;
	const b = rng.int(minB, 9);
	const total = a - b;
	const bond = a - prevTen;
	const remainder = b - bond;
	return {
		op: 'sub',
		a,
		b,
		total,
		visual: 'twoDigit',
		steps: [
			{
				instruction: `Va à ${prevTen}`,
				equation: `${a} − ? = ${prevTen}`,
				answer: bond,
				options: options3(bond, rng),
				kind: 'sub-to-ten'
			},
			{
				instruction: 'Donc le total',
				equation: `${prevTen} − ${remainder} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'total-via-ten'
			},
			{
				instruction: 'Confirme',
				equation: `${a} − ${b} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'confirm'
			}
		]
	};
}

function genTwoMinusTwo(rng: SeededRng): BridgeQuestion {
	// 2-digit − 2-digit. Always force bOnes > aOnes so step 2 (subtract ones)
	// requires bridging — otherwise it's a trivial single-digit subtraction.
	const aTens = rng.int(3, 9);
	const aOnes = rng.int(1, 8);
	const a = aTens * 10 + aOnes;
	const bTens = rng.int(1, aTens - 1);
	const bOnes = rng.int(aOnes + 1, 9);
	const b = bTens * 10 + bOnes;
	const total = a - b;
	const afterTens = a - bTens * 10;
	return {
		op: 'sub',
		a,
		b,
		total,
		visual: 'twoDigit',
		steps: [
			{
				instruction: 'Enlève les dizaines',
				equation: `${a} − ${bTens * 10} = ?`,
				answer: afterTens,
				options: options3(afterTens, rng),
				kind: 'sub-tens'
			},
			{
				instruction: 'Enlève les unités',
				equation: `${afterTens} − ${bOnes} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'sub-ones'
			},
			{
				instruction: 'Confirme',
				equation: `${a} − ${b} = ?`,
				answer: total,
				options: options3(total, rng),
				kind: 'confirm'
			}
		]
	};
}

export function makeRngFromSeed(seed: number): SeededRng {
	return makeRng(seed || 1);
}

// ---- per-world tokens ----

export type BridgeWorld = 'forest' | 'desert' | 'cave' | 'snow' | 'pirate';

export interface BridgeToken {
	src: string;
	/** Native frame width in the source PNG. For animated sheets (fruits)
	 *  the sheet is `frames × frameW` wide; for single-frame sprites this is
	 *  the full image width. */
	frameW: number;
	frameH: number;
	frames: number;
	/** Total animation cycle duration in ms. 0 = static (no animation). */
	durationMs: number;
}

const FRAME_MS = 80;

export const BRIDGE_TOKENS: Record<BridgeWorld, BridgeToken> = {
	forest: {
		src: '/sprites/cells/apple.png',
		frameW: 32,
		frameH: 32,
		frames: 17,
		durationMs: 17 * FRAME_MS
	},
	desert: {
		src: '/sprites/cells/pineapple.png',
		frameW: 32,
		frameH: 32,
		frames: 17,
		durationMs: 17 * FRAME_MS
	},
	cave: {
		src: '/sprites/cells/blue_diamond.png',
		frameW: 24,
		frameH: 24,
		frames: 4,
		durationMs: 4 * FRAME_MS * 2
	},
	snow: {
		src: '/sprites/cells/strawberry.png',
		frameW: 32,
		frameH: 32,
		frames: 17,
		durationMs: 17 * FRAME_MS
	},
	pirate: {
		src: '/sprites/cells/golden_skull.png',
		frameW: 24,
		frameH: 28,
		frames: 8,
		durationMs: 8 * FRAME_MS * 2
	}
};

export interface BridgeThemeStyle {
	bgGradient: string;
	frameBg: string;
	frameBorder: string;
	cellEmpty: string;
	cellBorder: string;
	promptColor: string;
	/** Multiple-choice button fill / border. */
	buttonBg: string;
	buttonBorder: string;
	buttonHoverBg: string;
	/** Per-cell tint for tokens that came from operand B (added in via the
	 *  bridging strategy). Should contrast against the world's bg + frameBg. */
	tintFromB: string;
	tintFromBBorder: string;
	/** Per-cell tint for tokens that were removed via subtraction. Stays
	 *  visible (kid sees what was taken away) but visually de-emphasized. */
	tintRemoved: string;
	tintRemovedBorder: string;
}

export const BRIDGE_THEMES: Record<BridgeWorld, BridgeThemeStyle> = {
	forest: {
		bgGradient: 'linear-gradient(180deg, #14532d 0%, #166534 50%, #15803d 100%)',
		frameBg: 'rgba(120, 53, 15, 0.85)',
		frameBorder: 'rgba(69, 26, 3, 0.95)',
		cellEmpty: 'rgba(254, 243, 199, 0.1)',
		cellBorder: 'rgba(254, 243, 199, 0.35)',
		promptColor: 'rgba(255, 255, 255, 0.95)',
		buttonBg: 'rgba(15, 23, 42, 0.78)',
		buttonBorder: 'rgba(190, 242, 100, 0.4)',
		buttonHoverBg: 'rgba(190, 242, 100, 0.25)',
		tintFromB: 'rgba(190, 242, 100, 0.5)',
		tintFromBBorder: 'rgba(190, 242, 100, 0.85)',
		tintRemoved: 'rgba(0, 0, 0, 0.45)',
		tintRemovedBorder: 'rgba(0, 0, 0, 0.6)'
	},
	desert: {
		bgGradient: 'linear-gradient(180deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)',
		frameBg: 'rgba(161, 98, 7, 0.85)',
		frameBorder: 'rgba(113, 63, 18, 0.95)',
		cellEmpty: 'rgba(254, 243, 199, 0.12)',
		cellBorder: 'rgba(254, 243, 199, 0.4)',
		promptColor: 'rgba(255, 255, 255, 0.95)',
		buttonBg: 'rgba(15, 23, 42, 0.78)',
		buttonBorder: 'rgba(251, 191, 36, 0.45)',
		buttonHoverBg: 'rgba(251, 146, 60, 0.3)',
		tintFromB: 'rgba(56, 189, 248, 0.55)',
		tintFromBBorder: 'rgba(125, 211, 252, 0.85)',
		tintRemoved: 'rgba(0, 0, 0, 0.45)',
		tintRemovedBorder: 'rgba(0, 0, 0, 0.6)'
	},
	cave: {
		bgGradient: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
		frameBg: 'rgba(30, 27, 75, 0.85)',
		frameBorder: 'rgba(15, 12, 50, 0.95)',
		cellEmpty: 'rgba(186, 230, 253, 0.08)',
		cellBorder: 'rgba(186, 230, 253, 0.3)',
		promptColor: 'rgba(224, 242, 254, 0.95)',
		buttonBg: 'rgba(15, 23, 42, 0.78)',
		buttonBorder: 'rgba(192, 132, 252, 0.5)',
		buttonHoverBg: 'rgba(192, 132, 252, 0.28)',
		tintFromB: 'rgba(252, 211, 77, 0.55)',
		tintFromBBorder: 'rgba(252, 211, 77, 0.9)',
		tintRemoved: 'rgba(0, 0, 0, 0.5)',
		tintRemovedBorder: 'rgba(0, 0, 0, 0.7)'
	},
	snow: {
		bgGradient: 'linear-gradient(180deg, #1e293b 0%, #334155 50%, #64748b 100%)',
		frameBg: 'rgba(241, 245, 249, 0.92)',
		frameBorder: 'rgba(100, 116, 139, 0.95)',
		cellEmpty: 'rgba(15, 23, 42, 0.06)',
		cellBorder: 'rgba(15, 23, 42, 0.2)',
		promptColor: 'rgba(248, 250, 252, 0.95)',
		buttonBg: 'rgba(15, 23, 42, 0.85)',
		buttonBorder: 'rgba(125, 211, 252, 0.5)',
		buttonHoverBg: 'rgba(125, 211, 252, 0.3)',
		tintFromB: 'rgba(56, 189, 248, 0.55)',
		tintFromBBorder: 'rgba(14, 165, 233, 0.85)',
		tintRemoved: 'rgba(15, 23, 42, 0.45)',
		tintRemovedBorder: 'rgba(15, 23, 42, 0.6)'
	},
	pirate: {
		bgGradient: 'linear-gradient(180deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
		frameBg: 'rgba(120, 53, 15, 0.88)',
		frameBorder: 'rgba(69, 26, 3, 0.95)',
		cellEmpty: 'rgba(254, 243, 199, 0.1)',
		cellBorder: 'rgba(254, 243, 199, 0.35)',
		promptColor: 'rgba(255, 255, 255, 0.95)',
		buttonBg: 'rgba(15, 23, 42, 0.85)',
		buttonBorder: 'rgba(252, 211, 77, 0.5)',
		buttonHoverBg: 'rgba(45, 212, 191, 0.3)',
		tintFromB: 'rgba(45, 212, 191, 0.55)',
		tintFromBBorder: 'rgba(94, 234, 212, 0.85)',
		tintRemoved: 'rgba(0, 0, 0, 0.45)',
		tintRemovedBorder: 'rgba(0, 0, 0, 0.65)'
	}
};
