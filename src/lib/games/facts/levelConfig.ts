import type { SeededRng } from '$lib/curriculum/types';
import { makeRng } from '$lib/curriculum/rng';

export type WorldTheme = 'forest' | 'desert' | 'cave' | 'snow' | 'pirate';

export type CoinVariant = 'silver' | 'gold' | 'diamond';

export interface CoinPiece {
	variant: CoinVariant;
	value: number;
	dx: number;
	dy: number;
}

export interface CoinGroup {
	id: string;
	x: number;
	pieces: CoinPiece[];
	totalValue: number;
}

export type PropType = 'box' | 'spikes' | 'palm' | 'cloud';

export interface SceneProp {
	id: string;
	type: PropType;
	x: number;
	y: number;
	variant: number;
	obstacle: boolean;
	scale: number;
}

export type ModifierKind = 'normal' | 'fast' | 'treasure' | 'big' | 'frenzy';

export interface LevelConfig {
	level: number;
	isBoss: boolean;
	worldIndex: number;
	worldTheme: WorldTheme;
	bgColor: 'blue' | 'brown' | 'gray' | 'green' | 'pink' | 'purple' | 'yellow';
	groundTint: string;
	skyTint: string;
	monsterScale: number;
	monsterSpeedMultiplier: number;
	pushBackMultiplier: number;
	coinGroups: CoinGroup[];
	props: SceneProp[];
	modifier: ModifierKind;
	modifierLabel?: string;
}

// Worlds change every 10 levels.
export const LEVELS_PER_WORLD = 10;

const WORLD_THEMES: WorldTheme[] = ['forest', 'desert', 'cave', 'snow', 'pirate'];

const THEME_BG: Record<WorldTheme, LevelConfig['bgColor']> = {
	forest: 'green',
	desert: 'yellow',
	cave: 'purple',
	snow: 'gray',
	pirate: 'blue'
};

const THEME_GROUND: Record<WorldTheme, string> = {
	forest: '#3f6212',
	desert: '#b45309',
	cave: '#3b1d6b',
	snow: '#64748b',
	pirate: '#1e3a5f'
};

const THEME_SKY: Record<WorldTheme, string> = {
	forest: '#1e3a23',
	desert: '#7c2d12',
	cave: '#1e1b4b',
	snow: '#1e293b',
	pirate: '#0c4a6e'
};

/** Decorative props that sit hazy in the background. */
const THEME_DECOR: Record<WorldTheme, PropType[]> = {
	forest: ['palm', 'palm'],
	desert: ['box'],
	cave: ['box'],
	snow: ['box'],
	pirate: ['palm', 'palm']
};

/** Foreground obstacles. Currently disabled — kept for future mechanic revival. */
const THEME_OBSTACLES: Record<WorldTheme, PropType[]> = {
	forest: [],
	desert: [],
	cave: [],
	snow: [],
	pirate: []
};

export function worldIndexFor(level: number): number {
	return Math.floor((level - 1) / LEVELS_PER_WORLD);
}

export function worldThemeFor(level: number): WorldTheme {
	return WORLD_THEMES[worldIndexFor(level) % WORLD_THEMES.length];
}

function modifierFor(level: number, isBoss: boolean): { kind: ModifierKind; label?: string } {
	if (isBoss) return { kind: 'big', label: '👑 Boss' };
	if (level >= 36) return { kind: 'frenzy', label: '⚡ Frénésie' };
	if (level >= 16 && level < 26) return { kind: 'treasure', label: '💎 Trésors' };
	if (level >= 11) return { kind: 'fast', label: '⚡ Rapide' };
	return { kind: 'normal' };
}

export function levelConfig(level: number): LevelConfig {
	const rng = makeRng(level * 73 + 19);
	const worldIndex = worldIndexFor(level);
	const worldTheme = WORLD_THEMES[worldIndex % WORLD_THEMES.length];
	const isBoss = level % 5 === 0;
	const mod = modifierFor(level, isBoss);

	const baseSpeedRamp = 1 + Math.min(0.5, (level - 1) * 0.012);
	let monsterSpeedMultiplier = baseSpeedRamp;
	let monsterScale = 1.0;
	let pushBackMultiplier = 1.0;

	if (isBoss) {
		monsterScale = 1.55;
		monsterSpeedMultiplier *= 1.35;
		pushBackMultiplier = 0.85;
	}
	if (mod.kind === 'fast') {
		monsterSpeedMultiplier *= 1.25;
	}
	if (mod.kind === 'frenzy') {
		monsterSpeedMultiplier *= 1.5;
		pushBackMultiplier = 1.2;
	}

	const coinGroups = buildCoinGroups(level, isBoss, mod.kind, rng);
	const props = buildProps(worldTheme, rng);

	return {
		level,
		isBoss,
		worldIndex,
		worldTheme,
		bgColor: THEME_BG[worldTheme],
		groundTint: THEME_GROUND[worldTheme],
		skyTint: THEME_SKY[worldTheme],
		monsterScale,
		monsterSpeedMultiplier,
		pushBackMultiplier,
		coinGroups,
		props,
		modifier: mod.kind,
		modifierLabel: mod.label
	};
}

function buildProps(theme: WorldTheme, rng: SeededRng): SceneProp[] {
	const out: SceneProp[] = [];
	const decorPool = THEME_DECOR[theme];
	const obstaclePool = THEME_OBSTACLES[theme];

	// 2 background decorations (palms / fire / box) — one on each edge
	const bgCount = 2;
	for (let i = 0; i < bgCount; i++) {
		const type = rng.pick(decorPool);
		const onLeft = i % 2 === 0;
		const x = onLeft ? 0.02 + rng.next() * 0.08 : 0.86 + rng.next() * 0.1;
		out.push({
			id: `bg${i}`,
			type,
			x,
			y: 0,
			variant: rng.int(0, 3),
			obstacle: false,
			scale: 0.95 + rng.next() * 0.3
		});
	}

	// Foreground obstacles disabled for now (mechanic shelved).
	void obstaclePool;

	// Clouds: cave has very few (dark), others have several
	const cloudCount = theme === 'cave' ? (rng.chance(0.3) ? 1 : 0) : rng.int(2, 4);
	for (let i = 0; i < cloudCount; i++) {
		out.push({
			id: `c${i}`,
			type: 'cloud',
			x: rng.next(),
			y: 0.08 + rng.next() * 0.32,
			variant: rng.int(0, 2),
			obstacle: false,
			scale: 0.7 + rng.next() * 0.6
		});
	}

	return out;
}

function makePiece(variant: CoinVariant, dx: number, dy: number): CoinPiece {
	const value = variant === 'silver' ? 1 : variant === 'gold' ? 2 : 5;
	return { variant, value, dx, dy };
}

function clusterOffsets(count: number): Array<{ dx: number; dy: number }> {
	if (count === 1) return [{ dx: 0, dy: 0 }];
	if (count === 2)
		return [
			{ dx: -16, dy: 0 },
			{ dx: 16, dy: 0 }
		];
	if (count === 3)
		return [
			{ dx: -22, dy: 0 },
			{ dx: 0, dy: -16 },
			{ dx: 22, dy: 0 }
		];
	// 4+
	return Array.from({ length: count }, (_, i) => {
		const cols = Math.ceil(Math.sqrt(count));
		const row = Math.floor(i / cols);
		const col = i % cols;
		return { dx: (col - (cols - 1) / 2) * 22, dy: -row * 18 };
	});
}

function buildCoinGroups(
	level: number,
	isBoss: boolean,
	mod: ModifierKind,
	rng: SeededRng
): CoinGroup[] {
	function group(id: string, x: number, pieces: CoinPiece[]): CoinGroup {
		const totalValue = pieces.reduce((s, p) => s + p.value, 0);
		return { id, x, pieces, totalValue };
	}

	if (isBoss) {
		// Boss reward: a single diamond near the end
		const variant: CoinVariant = level >= 10 ? 'diamond' : 'gold';
		const off = clusterOffsets(1);
		return [group('g0', 0.78, [makePiece(variant, off[0].dx, off[0].dy)])];
	}

	if (mod === 'treasure') {
		const out: CoinGroup[] = [];
		const groupCount = 2;
		for (let i = 0; i < groupCount; i++) {
			const x = 0.55 + i * 0.2;
			const pieceCount = rng.int(2, 3);
			const offs = clusterOffsets(pieceCount);
			const pieces: CoinPiece[] = offs.map((o, j) => {
				const r = rng.next();
				const variant: CoinVariant =
					level >= 10 && j === 1 && r < 0.4 ? 'diamond' : r < 0.55 ? 'gold' : 'silver';
				return makePiece(variant, o.dx, o.dy);
			});
			out.push(group(`g${i}`, x, pieces));
		}
		return out;
	}

	// Normal: 1 group, 1-2 coins, between 0.6 and 0.82
	const pieceCount = rng.chance(0.5) ? 1 : 2;
	const offs = clusterOffsets(pieceCount);
	const pieces: CoinPiece[] = offs.map((o) => {
		const variant: CoinVariant = rng.chance(0.4) ? 'gold' : 'silver';
		return makePiece(variant, o.dx, o.dy);
	});
	const x = 0.62 + rng.next() * 0.18;
	return [group('g0', x, pieces)];
}
