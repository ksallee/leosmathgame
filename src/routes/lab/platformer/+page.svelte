<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		DEFAULT_TUNABLES,
		makeHero,
		step,
		type PhysicsTunables,
		type HeroState,
		type InputState
	} from '$lib/lab/physics';
	import { TEST_LEVEL } from '$lib/lab/levels';
	import { HEROES } from '$lib/sprites/manifest';
	import Sprite from '$lib/components/sprites/Sprite.svelte';

	const STORAGE_KEY = 'lab.platformer.tunables';
	const STORAGE_HERO = 'lab.platformer.hero';

	const HERO_IDS = Object.keys(HEROES);

	let tunables: PhysicsTunables = $state({ ...DEFAULT_TUNABLES });
	let heroId = $state('ninja_frog');
	// Initial hero position uses the defaults; the effect below rebuilds it
	// when tunables (incl. heroHeight / tileSize) change. Avoids referencing
	// the reactive `tunables` inside the initializer.
	let hero: HeroState = $state(makeHero(TEST_LEVEL, DEFAULT_TUNABLES));
	const heroChar = $derived(HEROES[heroId] ?? HEROES.ninja_frog);

	const input: InputState = {
		left: false,
		right: false,
		jumpHeld: false,
		jumpJustPressed: false
	};

	let rafId: number | null = null;
	let lastT = 0;
	let copied = $state(false);
	let copiedTimer: ReturnType<typeof setTimeout> | null = null;

	// Jump-trace capture: record sparse position samples from the moment the
	// hero leaves the ground until they land again. Latest completed jump is
	// exposed as JSON in the panel. ~50ms sampling = ~20-40 entries per jump,
	// small enough to paste into a chat message.
	interface JumpSample {
		t: number;
		x: number;
		y: number;
		vx: number;
		vy: number;
	}
	let lastJump: JumpSample[] = $state([]);
	let activeJump: JumpSample[] | null = null;
	let jumpStartT = 0;
	let nextSampleT = 0;
	const SAMPLE_INTERVAL_MS = 50;
	let jumpCopied = $state(false);
	let jumpCopiedTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		const savedT = localStorage.getItem(STORAGE_KEY);
		if (savedT) {
			try {
				tunables = { ...DEFAULT_TUNABLES, ...JSON.parse(savedT) };
			} catch {
				/* keep defaults */
			}
		}
		const savedHero = localStorage.getItem(STORAGE_HERO);
		if (savedHero && HERO_IDS.includes(savedHero)) heroId = savedHero;
		hero = makeHero(TEST_LEVEL, tunables);

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		lastT = performance.now();
		loop();
	});

	onDestroy(() => {
		if (rafId !== null) cancelAnimationFrame(rafId);
		if (copiedTimer) clearTimeout(copiedTimer);
		window.removeEventListener('keydown', onKeyDown);
		window.removeEventListener('keyup', onKeyUp);
	});

	$effect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(tunables));
	});
	$effect(() => {
		localStorage.setItem(STORAGE_HERO, heroId);
	});

	$effect(() => {
		// When hero or tile size changes, the collision box changes — easiest
		// to respawn so the kid doesn't end up stuck inside a tile.
		void tunables.heroHeight;
		void tunables.tileSize;
		hero = makeHero(TEST_LEVEL, tunables);
	});

	function onKeyDown(e: KeyboardEvent) {
		if (e.repeat) return;
		switch (e.key) {
			case 'ArrowLeft':
			case 'a':
				input.left = true;
				e.preventDefault();
				break;
			case 'ArrowRight':
			case 'd':
				input.right = true;
				e.preventDefault();
				break;
			case ' ':
			case 'ArrowUp':
			case 'w':
				if (!input.jumpHeld) input.jumpJustPressed = true;
				input.jumpHeld = true;
				e.preventDefault();
				break;
			case 'r':
			case 'R':
				hero = makeHero(TEST_LEVEL, tunables);
				e.preventDefault();
				break;
		}
	}

	function onKeyUp(e: KeyboardEvent) {
		switch (e.key) {
			case 'ArrowLeft':
			case 'a':
				input.left = false;
				break;
			case 'ArrowRight':
			case 'd':
				input.right = false;
				break;
			case ' ':
			case 'ArrowUp':
			case 'w':
				input.jumpHeld = false;
				break;
		}
	}

	function loop() {
		const now = performance.now();
		const dt = Math.min(0.05, (now - lastT) / 1000);
		lastT = now;
		const wasGrounded = hero.onGround;
		step(hero, input, tunables, TEST_LEVEL, dt);

		// Jump trace lifecycle: lift-off → start capture, while airborne →
		// sample at SAMPLE_INTERVAL_MS, land → freeze and expose.
		if (wasGrounded && !hero.onGround) {
			activeJump = [{ t: 0, x: hero.x, y: hero.y, vx: hero.vx, vy: hero.vy }];
			jumpStartT = now;
			nextSampleT = now + SAMPLE_INTERVAL_MS;
		} else if (activeJump && !hero.onGround && now >= nextSampleT) {
			activeJump.push({
				t: Math.round(now - jumpStartT),
				x: Math.round(hero.x),
				y: Math.round(hero.y),
				vx: Math.round(hero.vx),
				vy: Math.round(hero.vy)
			});
			nextSampleT = now + SAMPLE_INTERVAL_MS;
		} else if (activeJump && hero.onGround) {
			activeJump.push({
				t: Math.round(now - jumpStartT),
				x: Math.round(hero.x),
				y: Math.round(hero.y),
				vx: Math.round(hero.vx),
				vy: Math.round(hero.vy)
			});
			lastJump = activeJump;
			activeJump = null;
		}

		hero = hero;
		rafId = requestAnimationFrame(loop);
	}

	const viewportW = $derived(TEST_LEVEL.width * tunables.tileSize);
	const viewportH = $derived(TEST_LEVEL.height * tunables.tileSize);

	function copyConfig() {
		const config = {
			character: heroId,
			physics: { ...tunables }
		};
		navigator.clipboard.writeText(JSON.stringify(config, null, 2));
		copied = true;
		if (copiedTimer) clearTimeout(copiedTimer);
		copiedTimer = setTimeout(() => (copied = false), 1400);
	}

	function copyJumpTrace() {
		if (lastJump.length === 0) return;
		const trace = {
			character: heroId,
			physics: { ...tunables },
			samples: lastJump
		};
		navigator.clipboard.writeText(JSON.stringify(trace, null, 2));
		jumpCopied = true;
		if (jumpCopiedTimer) clearTimeout(jumpCopiedTimer);
		jumpCopiedTimer = setTimeout(() => (jumpCopied = false), 1400);
	}

	function resetTunables() {
		tunables = { ...DEFAULT_TUNABLES };
		hero = makeHero(TEST_LEVEL, tunables);
	}

	function respawn() {
		hero = makeHero(TEST_LEVEL, tunables);
	}
</script>

{#snippet slider(
	label: string,
	getValue: () => number,
	setValue: (v: number) => void,
	min: number,
	max: number,
	stepSize: number
)}
	<label class="slider">
		<span class="lbl">{label}</span>
		<span class="val">{getValue().toFixed(stepSize < 1 ? 2 : 0)}</span>
		<input
			type="range"
			{min}
			{max}
			step={stepSize}
			value={getValue()}
			oninput={(e) => setValue(Number((e.target as HTMLInputElement).value))}
		/>
	</label>
{/snippet}

<main>
	<header>
		<a class="back" href="/lab">← Lab</a>
		<h1>Platformer tune</h1>
		<p class="hint">
			Arrows / WASD to move, Space / W / ↑ to jump, R to respawn. Tweak sliders, feel the result,
			then <strong>Copy Config</strong> to share the JSON.
		</p>
	</header>

	<div class="layout">
		<div class="viewport" style:width="{viewportW}px" style:height="{viewportH}px">
			{#each TEST_LEVEL.tiles as row, r (r)}
				{#each row as cell, c (c)}
					{#if cell === 1}
						<div
							class="tile"
							style:left="{c * tunables.tileSize}px"
							style:top="{r * tunables.tileSize}px"
							style:width="{tunables.tileSize}px"
							style:height="{tunables.tileSize}px"
						></div>
					{/if}
				{/each}
			{/each}

			<div
				class="spawn-mark"
				style:left="{TEST_LEVEL.spawn.col * tunables.tileSize + tunables.tileSize / 2}px"
				style:top="{(TEST_LEVEL.spawn.row + 1) * tunables.tileSize}px"
			></div>

			<div
				class="hero-wrap"
				style:left="{hero.x + hero.width / 2}px"
				style:top="{hero.y + hero.height}px"
				style:width="{hero.width}px"
			>
				<Sprite
					character={heroChar}
					state={hero.anim === 'jump' || hero.anim === 'fall' ? 'idle' : hero.anim}
					height={tunables.heroHeight}
					flip={hero.facing === -1}
				/>
			</div>

			<div
				class="hitbox"
				style:left="{hero.x}px"
				style:top="{hero.y}px"
				style:width="{hero.width}px"
				style:height="{hero.height}px"
			></div>
		</div>

		<aside class="panel">
			<div class="row">
				<label for="hero-pick">Character</label>
				<select id="hero-pick" bind:value={heroId}>
					{#each HERO_IDS as id (id)}
						<option value={id}>{id}</option>
					{/each}
				</select>
			</div>

			<fieldset>
				<legend>Physics</legend>
				{@render slider(
					'Gravity (px/s²)',
					() => tunables.gravity,
					(v) => (tunables.gravity = v),
					400,
					4000,
					50
				)}
				{@render slider(
					'Jump velocity (px/s)',
					() => tunables.jumpVelocity,
					(v) => (tunables.jumpVelocity = v),
					-1200,
					-200,
					20
				)}
				{@render slider(
					'Run max speed (px/s)',
					() => tunables.runMaxSpeed,
					(v) => (tunables.runMaxSpeed = v),
					50,
					600,
					10
				)}
				{@render slider(
					'Run accel (px/s²)',
					() => tunables.runAccel,
					(v) => (tunables.runAccel = v),
					200,
					4000,
					50
				)}
				{@render slider(
					'Friction (px/s²)',
					() => tunables.friction,
					(v) => (tunables.friction = v),
					0,
					4000,
					50
				)}
				{@render slider(
					'Air control (×)',
					() => tunables.airControl,
					(v) => (tunables.airControl = v),
					0,
					1,
					0.05
				)}
			</fieldset>

			<fieldset>
				<legend>Scale</legend>
				{@render slider(
					'Hero height (px)',
					() => tunables.heroHeight,
					(v) => (tunables.heroHeight = v),
					20,
					200,
					2
				)}
				{@render slider(
					'Tile size (px)',
					() => tunables.tileSize,
					(v) => (tunables.tileSize = v),
					16,
					64,
					2
				)}
			</fieldset>

			<div class="actions">
				<button class="primary" onclick={copyConfig}>{copied ? 'Copied ✓' : 'Copy Config'}</button>
				<button onclick={respawn}>Respawn (R)</button>
				<button onclick={resetTunables}>Reset to Defaults</button>
			</div>

			<div class="row">
				<button class="primary" onclick={copyJumpTrace} disabled={lastJump.length === 0}>
					{jumpCopied ? 'Copied ✓' : `Copy last jump trace (${lastJump.length} samples)`}
				</button>
			</div>

			<details class="json">
				<summary>Current config (JSON)</summary>
				<pre>{JSON.stringify({ character: heroId, physics: tunables }, null, 2)}</pre>
			</details>

			{#if lastJump.length > 0}
				<details class="json">
					<summary
						>Last jump trace ({lastJump.length} samples, {lastJump[lastJump.length - 1]
							.t}ms)</summary
					>
					<pre>{JSON.stringify(lastJump, null, 2)}</pre>
				</details>
			{/if}
		</aside>
	</div>
</main>

<style>
	main {
		max-width: 1600px;
		margin: 0 auto;
		padding: var(--space-4);
		color: var(--text-primary);
	}
	header {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: var(--space-4);
	}
	.back {
		color: var(--text-muted);
		font-size: var(--text-sm);
		text-decoration: none;
	}
	h1 {
		font: var(--font-w-bold) var(--text-2xl) / 1 var(--font-display);
	}
	.hint {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	.layout {
		display: grid;
		grid-template-columns: auto 320px;
		gap: var(--space-4);
		align-items: start;
	}
	@media (max-width: 1280px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}

	.viewport {
		position: relative;
		background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	.tile {
		position: absolute;
		background: linear-gradient(180deg, #b27a40 0%, #8a5524 100%);
		box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.4);
	}
	.spawn-mark {
		position: absolute;
		width: 6px;
		height: 6px;
		margin-left: -3px;
		margin-top: -8px;
		background: #4ade80;
		border-radius: 50%;
		box-shadow: 0 0 8px #4ade80;
	}
	.hero-wrap {
		position: absolute;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		transform: translate(-50%, -100%);
	}
	.hitbox {
		position: absolute;
		border: 1px dashed rgba(74, 222, 128, 0.45);
		pointer-events: none;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-3);
		background: rgba(15, 23, 42, 0.8);
		border-radius: var(--radius-lg);
		border: 1px solid rgba(255, 255, 255, 0.08);
		font-size: var(--text-sm);
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	select {
		background: rgba(15, 23, 42, 0.9);
		color: var(--text-primary);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: var(--radius-md);
		padding: 6px 10px;
		font-size: var(--text-sm);
	}
	fieldset {
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-3);
		margin: 0;
	}
	legend {
		color: var(--text-muted);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.slider {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		gap: 2px;
		padding: 4px 0;
	}
	.slider .lbl {
		grid-column: 1;
		grid-row: 1;
		color: var(--text-muted);
	}
	.slider .val {
		grid-column: 2;
		grid-row: 1;
		font-variant-numeric: tabular-nums;
		color: var(--color-primary-300);
	}
	.slider input {
		grid-column: 1 / -1;
		grid-row: 2;
		width: 100%;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.actions button {
		flex: 1;
		min-width: 100px;
		padding: 8px 12px;
		background: rgba(15, 23, 42, 0.9);
		color: var(--text-primary);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.actions button.primary {
		background: var(--color-primary-500);
		color: var(--color-bg-900);
		border-color: transparent;
		font-weight: var(--font-w-bold);
	}
	.actions button:hover {
		opacity: 0.9;
	}
	.json {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.json summary {
		cursor: pointer;
		padding: 4px 0;
	}
	.json pre {
		background: rgba(0, 0, 0, 0.5);
		padding: var(--space-2);
		border-radius: var(--radius-md);
		overflow: auto;
		font-size: 11px;
	}
</style>
