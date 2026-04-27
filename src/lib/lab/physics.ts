// Minimal platformer physics for the lab tune-mode. Pure TS, no engine.
// AABB collision against a uniform tile grid. Designed to be tweaked live
// via slider UI — every behavior is driven by the PhysicsTunables struct
// so the kid (well, Kevin in dev) can dial in jump arcs, run feel, and
// scale, then export the tunables as JSON for the production game to use.

export interface PhysicsTunables {
	/** px/s² downward acceleration. Earth ≈ 9.8 m/s² → ~600 px/s² at 60px/m;
	 *  platformers usually run 2-3× that for snappier feel. */
	gravity: number;
	/** Max horizontal run speed in px/s. */
	runMaxSpeed: number;
	/** Horizontal accel applied while a movement key is held, px/s². */
	runAccel: number;
	/** Decel applied when no movement key is pressed and hero is on ground. */
	friction: number;
	/** Initial upward velocity on jump (negative because Y axis points down). */
	jumpVelocity: number;
	/** Multiplier (0..1) applied to runAccel when in the air. Platformers
	 *  usually want < 1 so jumps commit. */
	airControl: number;
	/** Display height of the hero in CSS px. Drives sprite scale + collision
	 *  box height. */
	heroHeight: number;
	/** Width of one tile in CSS px. Drives the rendered viewport size and
	 *  the collision math (collision math is in CSS px throughout). */
	tileSize: number;
}

export const DEFAULT_TUNABLES: PhysicsTunables = {
	gravity: 1800,
	runMaxSpeed: 240,
	runAccel: 1600,
	friction: 1400,
	jumpVelocity: -560,
	airControl: 0.55,
	heroHeight: 56,
	tileSize: 32
};

export interface Tilemap {
	width: number; // tile count
	height: number;
	/** [row][col]; 0 = air, 1 = solid. Out-of-bounds is treated as solid. */
	tiles: number[][];
	/** Tile column/row of hero spawn point (hero's bottom-center sits here). */
	spawn: { col: number; row: number };
}

export interface HeroState {
	x: number; // top-left in CSS px
	y: number;
	vx: number;
	vy: number;
	width: number;
	height: number;
	onGround: boolean;
	facing: 1 | -1;
	anim: 'idle' | 'run' | 'jump' | 'fall';
}

export interface InputState {
	left: boolean;
	right: boolean;
	jumpHeld: boolean;
	/** Edge-triggered: true on the frame the jump key went down. Consumed
	 *  by step() so the caller doesn't need to clear it. */
	jumpJustPressed: boolean;
}

export function makeHero(tilemap: Tilemap, t: PhysicsTunables): HeroState {
	const heroWidth = Math.round(t.heroHeight * 0.55);
	return {
		x: tilemap.spawn.col * t.tileSize + (t.tileSize - heroWidth) / 2,
		y: tilemap.spawn.row * t.tileSize + t.tileSize - t.heroHeight,
		vx: 0,
		vy: 0,
		width: heroWidth,
		height: t.heroHeight,
		onGround: false,
		facing: 1,
		anim: 'idle'
	};
}

function isSolid(tilemap: Tilemap, col: number, row: number): boolean {
	if (col < 0 || col >= tilemap.width || row < 0 || row >= tilemap.height) return true;
	return tilemap.tiles[row][col] === 1;
}

/** AABB sweep along X. Push the hero out of any solid tile it overlaps after
 *  the move, snapping to the tile edge and zeroing vx. */
function resolveX(hero: HeroState, tilemap: Tilemap, ts: number) {
	const left = Math.floor(hero.x / ts);
	const right = Math.floor((hero.x + hero.width - 1) / ts);
	const top = Math.floor(hero.y / ts);
	const bottom = Math.floor((hero.y + hero.height - 1) / ts);

	for (let r = top; r <= bottom; r++) {
		for (let c = left; c <= right; c++) {
			if (!isSolid(tilemap, c, r)) continue;
			if (hero.vx > 0) {
				hero.x = c * ts - hero.width;
			} else if (hero.vx < 0) {
				hero.x = (c + 1) * ts;
			}
			hero.vx = 0;
			return;
		}
	}
}

function resolveY(hero: HeroState, tilemap: Tilemap, ts: number) {
	const left = Math.floor(hero.x / ts);
	const right = Math.floor((hero.x + hero.width - 1) / ts);
	const top = Math.floor(hero.y / ts);
	const bottom = Math.floor((hero.y + hero.height - 1) / ts);

	for (let r = top; r <= bottom; r++) {
		for (let c = left; c <= right; c++) {
			if (!isSolid(tilemap, c, r)) continue;
			if (hero.vy > 0) {
				hero.y = r * ts - hero.height;
				hero.onGround = true;
			} else if (hero.vy < 0) {
				hero.y = (r + 1) * ts;
			}
			hero.vy = 0;
			return;
		}
	}
}

/** Advance one fixed-timestep physics step. dt in seconds. Mutates hero
 *  and the input.jumpJustPressed flag (consumed). */
export function step(
	hero: HeroState,
	input: InputState,
	t: PhysicsTunables,
	tilemap: Tilemap,
	dt: number
): void {
	// Horizontal — accel toward target, friction when idle.
	const accel = hero.onGround ? t.runAccel : t.runAccel * t.airControl;
	if (input.left) {
		hero.vx = Math.max(hero.vx - accel * dt, -t.runMaxSpeed);
		hero.facing = -1;
	} else if (input.right) {
		hero.vx = Math.min(hero.vx + accel * dt, t.runMaxSpeed);
		hero.facing = 1;
	} else if (hero.onGround) {
		if (hero.vx > 0) hero.vx = Math.max(0, hero.vx - t.friction * dt);
		else if (hero.vx < 0) hero.vx = Math.min(0, hero.vx + t.friction * dt);
	}

	// Jump — edge-triggered, only from ground.
	if (input.jumpJustPressed && hero.onGround) {
		hero.vy = t.jumpVelocity;
		hero.onGround = false;
	}
	input.jumpJustPressed = false;

	// Gravity
	hero.vy += t.gravity * dt;

	// Integrate + collide axis-by-axis (avoids corner snags).
	hero.x += hero.vx * dt;
	resolveX(hero, tilemap, t.tileSize);
	const wasGrounded = hero.onGround;
	hero.onGround = false;
	hero.y += hero.vy * dt;
	resolveY(hero, tilemap, t.tileSize);

	// Coyote-friendly: keep onGround true if the kid just stepped over a
	// flat seam between two solid tiles (resolveY won't always re-flag it
	// when vy hits 0 mid-frame). Cheap re-probe one px below.
	if (!hero.onGround && wasGrounded && hero.vy >= 0) {
		hero.y += 1;
		resolveY(hero, tilemap, t.tileSize);
		hero.y -= hero.onGround ? 0 : 1;
	}

	// Anim state — purely a derivation of velocity + grounded.
	if (!hero.onGround) {
		hero.anim = hero.vy < 0 ? 'jump' : 'fall';
	} else if (Math.abs(hero.vx) > 10) {
		hero.anim = 'run';
	} else {
		hero.anim = 'idle';
	}
}
