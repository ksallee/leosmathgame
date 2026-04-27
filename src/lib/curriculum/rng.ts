import type { SeededRng } from './types';

/** Mulberry32 — small, fast, deterministic PRNG. */
export function makeRng(seed = Date.now()): SeededRng {
	let state = seed >>> 0;
	const next = (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		int(min, max) {
			if (max < min) throw new Error('rng.int: max < min');
			return Math.floor(next() * (max - min + 1)) + min;
		},
		pick(arr) {
			if (arr.length === 0) throw new Error('rng.pick: empty array');
			return arr[Math.floor(next() * arr.length)];
		},
		chance(p) {
			return next() < p;
		}
	};
}
