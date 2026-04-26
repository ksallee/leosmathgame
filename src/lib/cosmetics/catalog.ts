import type { SpriteSkin } from './types';

export const HERO_SKINS: SpriteSkin[] = [
	{ id: 'pink_man', name: 'Rose', slot: 'hero', price: 0 },
	{ id: 'ninja_frog', name: 'Ninja Grenouille', slot: 'hero', price: 80 },
	{ id: 'mask_dude', name: 'Masque', slot: 'hero', price: 120 },
	{ id: 'virtual_guy', name: 'Virtuel', slot: 'hero', price: 200, unlockLevel: 5 }
];

export const MONSTER_SKINS: SpriteSkin[] = [
	{ id: 'slime', name: 'Slime', slot: 'monster', price: 0 },
	{ id: 'mushroom', name: 'Champignon', slot: 'monster', price: 0 },
	{ id: 'snail', name: 'Escargot', slot: 'monster', price: 0 },
	{ id: 'chicken', name: 'Poule', slot: 'monster', price: 0 },
	{ id: 'angrypig', name: 'Cochon', slot: 'monster', price: 0 },
	{ id: 'bunny', name: 'Lapin', slot: 'monster', price: 0 },
	{ id: 'ghost', name: 'Fantôme', slot: 'monster', price: 0 },
	{ id: 'bat', name: 'Chauve-souris', slot: 'monster', price: 0 },
	{ id: 'rino', name: 'Rhino', slot: 'monster', price: 0, unlockLevel: 5 },
	{ id: 'fatbird', name: 'Gros Oiseau', slot: 'monster', price: 0, unlockLevel: 10 },
	{ id: 'trunk', name: 'Tronc', slot: 'monster', price: 0, unlockLevel: 15 },
	{ id: 'skull', name: 'Crâne', slot: 'monster', price: 0, unlockLevel: 20 }
];

export const ALL_SKINS: SpriteSkin[] = [...HERO_SKINS, ...MONSTER_SKINS];

export function findSkin(id: string): SpriteSkin | undefined {
	return ALL_SKINS.find((s) => s.id === id);
}

const COMMON_MONSTERS = [
	'slime',
	'mushroom',
	'snail',
	'chicken',
	'angrypig',
	'bunny',
	'ghost',
	'bat'
];
const BOSS_MONSTERS = ['rino', 'fatbird', 'trunk', 'skull'];

/** Boss every 5th level. Otherwise rotate commons. */
export function pickMonsterForLevel(level: number): SpriteSkin {
	const isBoss = level % 5 === 0;
	const pool = isBoss ? BOSS_MONSTERS : COMMON_MONSTERS;
	const idx = isBoss ? (level / 5 - 1) % pool.length : (level - 1) % pool.length;
	const id = pool[idx];
	return findSkin(id) ?? MONSTER_SKINS[0];
}

export const DEFAULT_HERO_ID = 'pink_man';
