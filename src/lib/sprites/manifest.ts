export interface SpriteState {
	src: string;
	frameW: number;
	frameH: number;
	frames: number;
	/** Total animation cycle duration in ms (e.g. 12 frames * 80ms = 960). */
	durationMs: number;
	loop: boolean;
}

export interface CharacterManifest {
	id: string;
	name: string;
	idle: SpriteState;
	run: SpriteState;
	hit: SpriteState;
}

const FRAME_MS = 80;
function state(
	src: string,
	frameW: number,
	frameH: number,
	frames: number,
	loop = true
): SpriteState {
	return { src, frameW, frameH, frames, durationMs: frames * FRAME_MS, loop };
}

// ---- Heroes ---- (all PA1, same frame layout)
function hero(id: string): CharacterManifest {
	const base = `/sprites/heroes/${id}`;
	return {
		id,
		name: id,
		idle: state(`${base}/idle.png`, 32, 32, 11),
		run: state(`${base}/run.png`, 32, 32, 12),
		hit: state(`${base}/hit.png`, 32, 32, 7, false)
	};
}

export const HEROES: Record<string, CharacterManifest> = {
	pink_man: hero('pink_man'),
	ninja_frog: hero('ninja_frog'),
	virtual_guy: hero('virtual_guy'),
	mask_dude: hero('mask_dude')
};

// ---- Monsters ---- (PA2, varying dimensions)
// For monsters lacking a dedicated "run" sheet, idle is used as the walk anim.
function monster(
	id: string,
	frame: [number, number],
	frames: { idle: number; run?: number; hit: number }
): CharacterManifest {
	const base = `/sprites/monsters/${id}`;
	const [w, h] = frame;
	const runFrames = frames.run ?? frames.idle;
	const runSrc = frames.run ? `${base}/run.png` : `${base}/idle.png`;
	return {
		id,
		name: id,
		idle: state(`${base}/idle.png`, w, h, frames.idle),
		run: state(runSrc, w, h, runFrames),
		hit: state(`${base}/hit.png`, w, h, frames.hit, false)
	};
}

export const MONSTERS: Record<string, CharacterManifest> = {
	slime: monster('slime', [44, 30], { idle: 10, hit: 5 }),
	mushroom: monster('mushroom', [32, 32], { idle: 14, run: 16, hit: 5 }),
	ghost: monster('ghost', [44, 30], { idle: 10, hit: 5 }),
	bunny: monster('bunny', [34, 44], { idle: 8, run: 12, hit: 5 }),
	snail: monster('snail', [38, 24], { idle: 15, run: 10, hit: 5 }),
	angrypig: monster('angrypig', [36, 30], { idle: 9, run: 12, hit: 5 }),
	bat: monster('bat', [46, 30], { idle: 12, run: 7, hit: 5 }),
	chicken: monster('chicken', [32, 34], { idle: 13, run: 14, hit: 5 }),
	rino: monster('rino', [52, 34], { idle: 11, run: 6, hit: 5 }),
	fatbird: monster('fatbird', [40, 48], { idle: 8, hit: 5 }),
	trunk: monster('trunk', [64, 32], { idle: 18, run: 14, hit: 5 }),
	skull: monster('skull', [52, 54], { idle: 8, hit: 5 })
};

export function getCharacter(id: string): CharacterManifest | undefined {
	return HEROES[id] ?? MONSTERS[id];
}

// ---- Treasures (TH stitched sheets, single 'idle' state, looping shimmer) ----

export interface TreasureManifest {
	id: string;
	src: string;
	frameW: number;
	frameH: number;
	frames: number;
	durationMs: number;
}

const TREASURE_FRAME_MS = 140;
function treasure(id: string, w: number, h: number, frames: number): TreasureManifest {
	return {
		id,
		src: `/sprites/treasure/${id}.png`,
		frameW: w,
		frameH: h,
		frames,
		durationMs: frames * TREASURE_FRAME_MS
	};
}

export const TREASURES: Record<string, TreasureManifest> = {
	silver_coin: treasure('silver_coin', 16, 16, 4),
	gold_coin: treasure('gold_coin', 16, 16, 4),
	blue_diamond: treasure('blue_diamond', 24, 24, 4),
	red_diamond: treasure('red_diamond', 24, 24, 4),
	green_diamond: treasure('green_diamond', 24, 24, 4)
};

/** Map a coin variant to a specific treasure sprite id. */
export function treasureForVariant(variant: 'silver' | 'gold' | 'diamond'): TreasureManifest {
	if (variant === 'diamond') return TREASURES.blue_diamond;
	if (variant === 'gold') return TREASURES.gold_coin;
	return TREASURES.silver_coin;
}
