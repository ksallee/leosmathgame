export interface SpriteState {
	src: string;
	frameW: number;
	frameH: number;
	frames: number;
	/** Total animation cycle duration in ms (e.g. 12 frames * 80ms = 960). */
	durationMs: number;
	loop: boolean;
	/** Pixels of transparent space at the bottom of each frame (native source units).
	 *  When set, the Sprite clips that band so the character's feet sit at the wrap bottom. */
	bottomPad?: number;
}

export interface ProjectileSpec {
	src: string;
	/** Native frame dimensions in the source sheet. */
	frameW: number;
	frameH: number;
	frames: number;
	/** Display height in CSS px while the projectile is in flight. Width is
	 *  derived from the native aspect ratio so the art doesn't stretch. */
	displayH: number;
}

export interface CharacterManifest {
	id: string;
	name: string;
	idle: SpriteState;
	run: SpriteState;
	hit: SpriteState;
	attack?: SpriteState;
	jump?: SpriteState;
	fall?: SpriteState;
	projectile?: ProjectileSpec;
	/** True when the source sprite natively faces LEFT (e.g. Treasure Hunters
	 *  Crusty Crew). The Sprite component XORs this with the `flip` prop so
	 *  callers can stay convention-agnostic — `<Sprite flip />` always means
	 *  "face the monster on the left", `<Sprite />` always means "face right". */
	facingLeft?: boolean;
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
		hit: state(`${base}/hit.png`, 32, 32, 7, false),
		// PA1 ships single-frame jump + fall poses (loop=false; just hold).
		jump: state(`${base}/jump.png`, 32, 32, 1, false),
		fall: state(`${base}/fall.png`, 32, 32, 1, false)
	};
}

export const HEROES: Record<string, CharacterManifest> = {
	pink_man: hero('pink_man'),
	ninja_frog: hero('ninja_frog'),
	virtual_guy: hero('virtual_guy'),
	mask_dude: hero('mask_dude'),
	captain: {
		id: 'captain',
		name: 'captain',
		idle: { ...state('/sprites/heroes/captain/idle.png', 64, 40, 5), bottomPad: 8 },
		run: { ...state('/sprites/heroes/captain/run.png', 64, 40, 6), bottomPad: 8 },
		hit: { ...state('/sprites/heroes/captain/hit.png', 64, 40, 4, false), bottomPad: 8 },
		attack: { ...state('/sprites/heroes/captain/attack.png', 64, 40, 3, false), bottomPad: 8 },
		jump: { ...state('/sprites/heroes/captain/jump.png', 64, 40, 3, false), bottomPad: 8 },
		fall: { ...state('/sprites/heroes/captain/fall.png', 64, 40, 1, false), bottomPad: 8 },
		projectile: {
			src: '/sprites/decor/sword_spin.png',
			frameW: 20,
			frameH: 20,
			frames: 4,
			displayH: 80
		}
	},
	crabby: {
		id: 'crabby',
		name: 'crabby',
		facingLeft: true,
		idle: state('/sprites/heroes/crabby/idle.png', 72, 32, 9),
		run: state('/sprites/heroes/crabby/run.png', 72, 32, 6),
		hit: state('/sprites/heroes/crabby/hit.png', 72, 32, 4, false),
		attack: state('/sprites/heroes/crabby/attack.png', 72, 32, 4, false),
		jump: state('/sprites/heroes/crabby/jump.png', 72, 32, 3, false),
		fall: state('/sprites/heroes/crabby/fall.png', 72, 32, 1, false),
		projectile: {
			src: '/sprites/decor/crabby_proj.png',
			frameW: 118,
			frameH: 24,
			frames: 3,
			displayH: 48
		}
	},
	fierce_tooth: {
		id: 'fierce_tooth',
		name: 'fierce_tooth',
		facingLeft: true,
		idle: state('/sprites/heroes/fierce_tooth/idle.png', 34, 30, 8),
		run: state('/sprites/heroes/fierce_tooth/run.png', 34, 30, 6),
		hit: state('/sprites/heroes/fierce_tooth/hit.png', 34, 30, 4, false),
		attack: state('/sprites/heroes/fierce_tooth/attack.png', 34, 30, 5, false),
		jump: state('/sprites/heroes/fierce_tooth/jump.png', 34, 30, 3, false),
		fall: state('/sprites/heroes/fierce_tooth/fall.png', 34, 30, 1, false),
		projectile: {
			src: '/sprites/decor/fierce_tooth_proj.png',
			frameW: 22,
			frameH: 24,
			frames: 3,
			displayH: 64
		}
	},
	pink_star: {
		id: 'pink_star',
		name: 'pink_star',
		facingLeft: true,
		idle: state('/sprites/heroes/pink_star/idle.png', 34, 30, 8),
		run: state('/sprites/heroes/pink_star/run.png', 34, 30, 6),
		hit: state('/sprites/heroes/pink_star/hit.png', 34, 30, 4, false),
		attack: state('/sprites/heroes/pink_star/attack.png', 34, 30, 4, false),
		jump: state('/sprites/heroes/pink_star/jump.png', 34, 30, 3, false),
		fall: state('/sprites/heroes/pink_star/fall.png', 34, 30, 1, false),
		projectile: {
			src: '/sprites/decor/pink_star_proj.png',
			frameW: 16,
			frameH: 12,
			frames: 4,
			displayH: 60
		}
	}
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
