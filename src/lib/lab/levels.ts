import type { Tilemap } from './physics';

// Tune-mode test level. Designed to exercise the failure modes from the
// previous platformer attempt:
//   - Short hop: stepping stones at row 10 (cols 5-6, 9-10, 13-14) — verify
//     small jumps land cleanly without overshooting.
//   - Medium-distance jump: floating platforms at row 6 (cols 5-8) and
//     row 7 (cols 18-21) — verify jump arc reaches at moderate run speed.
//   - High reach: ceiling-grazing platform at row 3 (cols 14-17) — verify
//     max jump height is enough; also ensures gravity doesn't snap-back too
//     fast.
//   - Scale check: ground is continuous so the hero can walk past the
//     platforms at ground level for visual scale comparison vs tile size.
//
// Continuous ground (no pits) — the lab doesn't need fail-states. If you
// jump weird and end up stuck, press R to reset.
const TEST_LEVEL_ROWS = [
	'##############################', // 0
	'#                            #', // 1
	'#                            #', // 2
	'#                            #', // 3
	'#              ####          #', // 4  high platform (moved from row 3 → 4 to clear headroom for taller heroes)
	'#                            #', // 5
	'#     ####                   #', // 6  mid-left platform
	'#                  ####      #', // 7  mid-right platform
	'#                            #', // 8
	'#                            #', // 9
	'#     ##   ##   ##           #', // 10 stepping stones
	'#                            #', // 11
	'#                            #', // 12
	'#                            #', // 13 spawn row (hero stands on row 14 ground)
	'##############################', // 14 ground
	'##############################' // 15 ground (extra thickness)
] as const;

function parseLevel(rows: readonly string[]): Tilemap {
	const height = rows.length;
	const width = rows[0].length;
	const tiles: number[][] = rows.map((r) => Array.from(r, (ch) => (ch === '#' ? 1 : 0)));
	return {
		width,
		height,
		tiles,
		spawn: { col: 3, row: 13 }
	};
}

export const TEST_LEVEL: Tilemap = parseLevel(TEST_LEVEL_ROWS);
