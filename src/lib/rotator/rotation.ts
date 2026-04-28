// Mini-game rotator. Three game types per docs/research/rotation-strategy.md:
//   - facts:      numpad-based fact retrieval (symbolic / retrieval skill)
//   - numberline: hop along a number line (linear-spatial / magnitude skill)
//   - bridge:     scaffolded bridging-through-ten (decomposition / strategy skill)
//
// Strict 3-cycle: each game gets 1/3 of levels. Numberline first because the
// concrete spatial representation is the most accessible entry point; bridge
// next because it builds on number-line magnitude work; facts last as the
// abstract retrieval target.
//
//   level 1 → numberline
//   level 2 → bridge
//   level 3 → facts
//   level 4 → numberline
//   level 5 → bridge
//   level 6 → facts
//   ... repeats every 3 levels.

export type GameType = 'numberline' | 'facts' | 'bridge';

export function gameForLevel(level: number): GameType {
	const slot = (level - 1) % 3;
	if (slot === 0) return 'numberline';
	if (slot === 1) return 'bridge';
	return 'facts';
}

/** Theme color per game type. Used to color-code level pills on the map and
 *  any other game-type indicator. Boss/replay decorations apply on top. */
export function colorForGame(game: GameType): { bg: string; ring: string; label: string } {
	switch (game) {
		case 'facts':
			return {
				bg: 'linear-gradient(160deg, #b45309 0%, #78350f 100%)',
				ring: 'rgba(251, 191, 36, 0.7)',
				label: 'facts'
			};
		case 'numberline':
			return {
				bg: 'linear-gradient(160deg, #047857 0%, #064e3b 100%)',
				ring: 'rgba(110, 231, 183, 0.7)',
				label: 'ligne'
			};
		case 'bridge':
			return {
				bg: 'linear-gradient(160deg, #6d28d9 0%, #4c1d95 100%)',
				ring: 'rgba(196, 181, 253, 0.75)',
				label: 'dizaine'
			};
	}
}
