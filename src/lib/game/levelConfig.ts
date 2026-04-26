import type { SeededRng } from '$lib/engine/types';
import { makeRng } from '$lib/engine/rng';

export type WorldTheme = 'forest' | 'desert' | 'cave' | 'snow' | 'jungle' | 'pirate' | 'lava';

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

export type ModifierKind = 'normal' | 'fast' | 'treasure' | 'big' | 'frenzy';

export interface LevelConfig {
	level: number;
	isBoss: boolean;
	worldIndex: number;
	worldTheme: WorldTheme;
	bgColor: 'blue' | 'brown' | 'gray' | 'green' | 'pink' | 'purple' | 'yellow';
	groundTint: string;
	monsterScale: number;
	monsterSpeedMultiplier: number;
	pushBackMultiplier: number;
	coinGroups: CoinGroup[];
	modifier: ModifierKind;
	modifierLabel?: string;
}

const WORLD_THEMES: WorldTheme[] = ['forest', 'desert', 'cave', 'snow', 'jungle', 'pirate', 'lava'];

const THEME_BG: Record<WorldTheme, LevelConfig['bgColor']> = {
	forest: 'green',
	desert: 'yellow',
	cave: 'purple',
	snow: 'gray',
	jungle: 'brown',
	pirate: 'blue',
	lava: 'pink'
};

const THEME_GROUND: Record<WorldTheme, string> = {
	forest: '#3f6212',
	desert: '#a16207',
	cave: '#3b1d6b',
	snow: '#475569',
	jungle: '#5b3a1f',
	pirate: '#1e3a5f',
	lava: '#7f1d1d'
};

export function worldThemeFor(level: number): WorldTheme {
	const worldIndex = Math.floor((level - 1) / 5);
	return WORLD_THEMES[worldIndex % WORLD_THEMES.length];
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
	const worldIndex = Math.floor((level - 1) / 5);
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

	return {
		level,
		isBoss,
		worldIndex,
		worldTheme,
		bgColor: THEME_BG[worldTheme],
		groundTint: THEME_GROUND[worldTheme],
		monsterScale,
		monsterSpeedMultiplier,
		pushBackMultiplier,
		coinGroups,
		modifier: mod.kind,
		modifierLabel: mod.label
	};
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
