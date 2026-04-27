import { makeRng } from '$lib/curriculum/rng';

export type ChoiceDifficulty = 'easy' | 'hard';

function hashSeed(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = (h * 31 + s.charCodeAt(i)) >>> 0;
	}
	return h || 1;
}

/** Generate 4 unique non-negative integer choices including the correct answer.
 *  Deterministic per `seed`. Easy = wide spread, Hard = narrow spread. */
export function generateChoices(
	answer: number,
	seed: string,
	difficulty: ChoiceDifficulty = 'easy'
): number[] {
	const rng = makeRng(hashSeed(seed));
	const choices = new Set<number>([answer]);

	const range =
		difficulty === 'hard'
			? Math.max(2, Math.round(answer * 0.18))
			: Math.max(5, Math.round(answer * 0.55));

	let attempts = 0;
	while (choices.size < 4 && attempts < 80) {
		const delta = rng.int(-range, range);
		const candidate = answer + delta;
		if (candidate >= 0 && candidate !== answer) {
			choices.add(candidate);
		}
		attempts++;
	}
	// Fallback: pad with linear distractors if RNG kept colliding (very small answers).
	let pad = 1;
	while (choices.size < 4 && pad < 30) {
		const cand = answer + pad;
		if (cand >= 0) choices.add(cand);
		if (choices.size < 4) {
			const cand2 = answer - pad;
			if (cand2 >= 0) choices.add(cand2);
		}
		pad++;
	}

	const arr = Array.from(choices);
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(rng.next() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}
