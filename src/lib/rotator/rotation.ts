// Mini-game rotator. Strict alternation between number-line jump and fact
// retrieval per docs/research/rotation-strategy.md. Number-line on odd
// levels first because Siegler's strategy-choice model says kids start at
// counting strategy before retrieval — the more concrete representation
// should come first.

export type GameType = 'numberline' | 'facts';

export function gameForLevel(level: number): GameType {
	return level % 2 === 1 ? 'numberline' : 'facts';
}
