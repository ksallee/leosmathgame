<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, beforeNavigate, preloadCode } from '$app/navigation';
	import { gameForLevel } from '$lib/rotator/rotation';
	import {
		loadProfile,
		saveProfile,
		emptyProfile,
		findLevelRecord,
		type Profile
	} from '$lib/storage/persist';
	import { pickMonsterForLevel, DEFAULT_HERO_ID } from '$lib/cosmetics/catalog';
	import { HEROES, MONSTERS } from '$lib/sprites/manifest';
	import { worldThemeFor, LEVELS_PER_WORLD, type WorldTheme } from '$lib/games/facts/levelConfig';
	import Sprite from '$lib/components/sprites/Sprite.svelte';

	let profile: Profile = $state(emptyProfile());
	let loaded = $state(false);
	let scroller: HTMLDivElement | undefined = $state();

	const NODE_GAP = 150;
	// Bumped from 180 → 220 to absorb the taller toolbar (which now sits 24px
	// below the screen edge to dodge iOS Safari's top-edge gesture zone).
	const TOP_PAD = 220;

	// Visible levels grow in chunks of 10 — beating level 10 unlocks 11-20, etc.
	const totalLevels = $derived(Math.max(10, Math.ceil(profile.level / 10) * 10));
	const heroChar = $derived(HEROES[profile.inventory.equipped.hero] ?? HEROES[DEFAULT_HERO_ID]);

	const WORLD_GRADIENTS: Record<WorldTheme, string> = {
		forest:
			'linear-gradient(180deg, #14532d 0%, #166534 50%, #15803d 100%), radial-gradient(ellipse at 70% 0%, #4ade80, transparent)',
		desert:
			'linear-gradient(180deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%), radial-gradient(ellipse at 30% 0%, #fbbf24, transparent)',
		cave: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
		snow: 'linear-gradient(180deg, #1e293b 0%, #334155 50%, #64748b 100%)',
		pirate: 'linear-gradient(180deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)'
	};
	const WORLD_LABEL: Record<WorldTheme, string> = {
		forest: '🌲 Forêt',
		desert: '🏜 Désert',
		cave: '🕳 Caverne',
		snow: '❄ Glace',
		pirate: '🏴‍☠ Pirate'
	};

	const worldsVisible = $derived.by(() => {
		const worlds: { idx: number; theme: WorldTheme; topPx: number; heightPx: number }[] = [];
		const totalWorlds = Math.ceil(totalLevels / LEVELS_PER_WORLD);
		const baseH = LEVELS_PER_WORLD * NODE_GAP;
		for (let w = 0; w < totalWorlds; w++) {
			const startLevel = w * LEVELS_PER_WORLD + 1;
			// World 1 absorbs TOP_PAD so node 10 still sits inside it.
			const topPx = w === 0 ? 0 : TOP_PAD + w * baseH;
			const heightPx = w === 0 ? baseH + TOP_PAD : baseH;
			worlds.push({
				idx: w,
				theme: worldThemeFor(startLevel),
				topPx,
				heightPx
			});
		}
		return worlds;
	});

	onMount(async () => {
		const saved = await loadProfile();
		if (saved) profile = saved;
		loaded = true;
		queueMicrotask(scrollToCurrent);
		// Warm the JS chunks for the most likely next destinations so a tap on
		// a chip is instant instead of waiting for a network fetch (especially
		// painful on slow wifi where the kid taps repeatedly thinking nothing
		// happened).
		void preloadCode('/play');
		void preloadCode('/play/numberline');
		void preloadCode('/shop');
	});

	$effect(() => {
		if (loaded) void saveProfile(profile);
	});

	beforeNavigate(async () => {
		if (loaded) await saveProfile(profile);
	});

	function scrollToCurrent() {
		if (!scroller) return;
		const target =
			(profile.lastViewedLevel - 1) * NODE_GAP + TOP_PAD - scroller.clientHeight / 2 + 60;
		scroller.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
	}

	function nodeX(i: number): number {
		// 25-75% of viewport (50% wide path centered, with bg edges showing)
		return 50 + Math.sin(i * 0.65) * 25;
	}

	// Bubble vertical center within a node (node top + bubble half-height).
	const NODE_BUBBLE_Y = 44;

	/** Catmull-Rom smoothing → cubic bezier path for smooth wavy trail.
	 *  Path Y is offset so it passes through bubble centers. */
	function smoothPathD(): string {
		const pts: [number, number][] = Array.from({ length: totalLevels }, (_, i) => [
			nodeX(i),
			i * NODE_GAP + TOP_PAD + NODE_BUBBLE_Y
		]);
		if (pts.length === 0) return '';
		let d = `M ${pts[0][0]} ${pts[0][1]}`;
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[Math.max(0, i - 1)];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[Math.min(pts.length - 1, i + 2)];
			const c1x = p1[0] + (p2[0] - p0[0]) / 6;
			const c1y = p1[1] + (p2[1] - p0[1]) / 6;
			const c2x = p2[0] - (p3[0] - p1[0]) / 6;
			const c2y = p2[1] - (p3[1] - p1[1]) / 6;
			d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
		}
		return d;
	}

	type Status = 'locked' | 'current' | 'done';
	function levelStatus(level: number): Status {
		if (findLevelRecord(profile, level)) return 'done';
		if (level === profile.level) return 'current';
		return 'locked';
	}

	function tap(level: number) {
		if (levelStatus(level) === 'locked') return;
		profile.lastViewedLevel = level;
		const route = gameForLevel(level) === 'numberline' ? '/play/numberline' : '/play';
		if (findLevelRecord(profile, level)) {
			goto(`${route}?replay=${level}`);
		} else {
			goto(route);
		}
	}

	function backHome() {
		goto('/');
	}

	function goShop() {
		goto('/shop');
	}
</script>

<main class="game">
	<!-- Floating HUD -->
	<div class="hud-top">
		<button class="chip back" onclick={backHome} aria-label="Retour">←</button>
		<div class="chip title">Carte des niveaux</div>
		<div class="chip coins"><span aria-hidden="true">🪙</span> {profile.coins}</div>
		<button class="chip shop" onclick={goShop} aria-label="Boutique">🛒</button>
	</div>

	<div class="scroller" bind:this={scroller}>
		<div class="map" style="height: {totalLevels * NODE_GAP + TOP_PAD * 2}px">
			<!-- World background sections -->
			{#each worldsVisible as w (w.idx)}
				<div
					class="world-section"
					style:top="{w.topPx}px"
					style:height="{w.heightPx}px"
					style:background={WORLD_GRADIENTS[w.theme]}
					style:--theme-shadow="rgba(0,0,0,0.4)"
				>
					<div class="world-label">
						<span>{WORLD_LABEL[w.theme]}</span>
						<span class="world-num">Monde {w.idx + 1}</span>
					</div>
					<!-- Decorative props per world theme -->
					{#if w.theme === 'pirate' || w.theme === 'forest'}
						<img
							class="decor palm-l"
							src="/sprites/decor/palm_top_a.png"
							alt=""
							draggable="false"
						/>
						<img
							class="decor palm-r"
							src="/sprites/decor/palm_top_c.png"
							alt=""
							draggable="false"
						/>
						<img
							class="decor palm-mid"
							src="/sprites/decor/palm_top_b.png"
							alt=""
							draggable="false"
						/>
					{/if}
					{#if w.theme === 'desert'}
						<img class="decor palm-l" src="/sprites/decor/box1.png" alt="" draggable="false" />
						<img class="decor palm-r" src="/sprites/decor/box2.png" alt="" draggable="false" />
					{/if}
					{#if w.theme === 'cave'}
						<img class="decor palm-l" src="/sprites/decor/box3.png" alt="" draggable="false" />
						<img class="decor palm-r" src="/sprites/decor/spikes.png" alt="" draggable="false" />
					{/if}
					{#if w.theme === 'snow'}
						<img class="decor palm-l" src="/sprites/decor/box1.png" alt="" draggable="false" />
						<img class="decor palm-r" src="/sprites/decor/box3.png" alt="" draggable="false" />
					{/if}
					<img class="cloud cloud-1" src="/sprites/decor/cloud_a.png" alt="" draggable="false" />
					<img class="cloud cloud-2" src="/sprites/decor/cloud_b.png" alt="" draggable="false" />
					<img class="cloud cloud-3" src="/sprites/decor/cloud_c.png" alt="" draggable="false" />
				</div>
			{/each}

			<svg
				class="path"
				preserveAspectRatio="none"
				viewBox="0 0 100 {totalLevels * NODE_GAP + TOP_PAD * 2}"
			>
				<path
					d={smoothPathD()}
					stroke="rgba(255, 240, 200, 0.55)"
					stroke-width="3"
					stroke-dasharray="6 8"
					stroke-linecap="round"
					fill="none"
					vector-effect="non-scaling-stroke"
				/>
			</svg>

			{#each Array(totalLevels) as _, i (i)}
				{@const level = i + 1}
				{@const status = levelStatus(level)}
				{@const record = findLevelRecord(profile, level)}
				{@const monsterSkin = pickMonsterForLevel(level)}
				{@const monsterChar = MONSTERS[monsterSkin.id] ?? MONSTERS.slime}
				{@const isBoss = level % 5 === 0}
				<button
					class="node {status}"
					class:boss={isBoss}
					style="left: {nodeX(i)}%; top: {i * NODE_GAP + TOP_PAD}px"
					onclick={() => tap(level)}
					disabled={status === 'locked'}
					aria-label="Niveau {level}{status === 'locked' ? ' (verrouillé)' : ''}"
				>
					<div class="bubble">
						{#if status === 'locked'}
							<div class="lock">🔒</div>
						{:else}
							<div class="mini">
								<Sprite character={monsterChar} state="idle" height={48} />
							</div>
						{/if}
						<div class="num">{level}</div>
					</div>
					{#if record}
						<div class="stars">
							{#each Array(3) as _, s (s)}
								<span class="star" class:on={s < record.bestStars}>★</span>
							{/each}
						</div>
					{:else if status === 'current'}
						<div class="now">Ici !</div>
					{/if}
				</button>
			{/each}

			<div
				class="hero-marker"
				style="top: {(profile.level - 1) * NODE_GAP + TOP_PAD - 90}px; left: {nodeX(
					profile.level - 1
				)}%"
			>
				<Sprite character={heroChar} state="idle" height={64} />
			</div>
		</div>
	</div>
</main>

<style>
	.game {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #0b0d10;
	}

	/* ---- Floating HUD ---- */
	.hud-top {
		position: absolute;
		/* Padded down from the screen edge so iOS Safari's top-edge gesture
		   doesn't steal the tap. The whole bar accepts pointer-events
		   directly — the see-through parent / opt-in child pattern was
		   misrouting touches on iPad PWA. */
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: max(env(safe-area-inset-top), var(--space-6)) var(--space-4) var(--space-3);
		z-index: 30;
		pointer-events: auto;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-5);
		/* Solid bg (no backdrop-filter) — iPad PWA hit-testing on
		   backdrop-filter elements is unreliable. Visual loss is minimal. */
		background: rgba(15, 23, 42, 0.92);
		border: none;
		border-radius: var(--radius-pill);
		color: var(--color-fg-50);
		font: var(--font-w-bold) var(--text-lg) / 1 var(--font-display);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
		min-height: 48px;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
		cursor: pointer;
	}
	.chip.back {
		font-size: var(--text-2xl);
		padding: var(--space-3) var(--space-4);
		min-width: 56px;
		justify-content: center;
	}
	.chip.title {
		flex: 1;
		justify-content: center;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.chip.coins {
		color: var(--color-coin-500);
		font-variant-numeric: tabular-nums;
	}
	.chip.shop {
		font-size: var(--text-2xl);
		padding: var(--space-3) var(--space-4);
		min-width: 56px;
		justify-content: center;
		background: rgba(15, 23, 42, 0.75);
		box-shadow:
			inset 0 2px 0 rgba(56, 189, 248, 0.3),
			inset 0 -3px 0 rgba(0, 0, 0, 0.4),
			0 0 0 2px rgba(56, 189, 248, 0.5),
			0 4px 12px rgba(0, 0, 0, 0.5);
		text-decoration: none;
	}
	.chip:active {
		transform: scale(0.96);
	}

	/* ---- Scroller ---- */
	.scroller {
		position: absolute;
		inset: 0;
		overflow-y: auto;
		overflow-x: hidden;
		-webkit-overflow-scrolling: touch;
	}
	.map {
		position: relative;
		width: 100%;
	}

	/* ---- World sections (background per world) ---- */
	.world-section {
		position: absolute;
		left: 0;
		right: 0;
		overflow: hidden;
		box-shadow: inset 0 -20px 40px rgba(0, 0, 0, 0.4);
	}
	.world-label {
		position: absolute;
		/* Pushed down from 80 → 120 so it clears the taller toolbar
		   (toolbar grew when we moved it past the iOS top-edge gesture
		   zone). */
		top: 120px;
		left: 24px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		font: var(--font-w-bold) var(--text-2xl) / 1 var(--font-display);
		color: rgba(255, 255, 255, 0.9);
		text-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
		z-index: 2;
	}
	.world-num {
		font-size: var(--text-sm);
		color: rgba(255, 255, 255, 0.6);
		font-weight: var(--font-w-medium);
	}

	.decor {
		position: absolute;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.55));
		opacity: 0.9;
		pointer-events: none;
	}
	.palm-l,
	.cact-l {
		left: 24px;
		bottom: 60px;
		width: 200px;
		height: auto;
	}
	.palm-r,
	.cact-r {
		right: 24px;
		bottom: 60px;
		width: 200px;
		height: auto;
		transform: scaleX(-1);
	}
	.palm-mid {
		left: 50%;
		bottom: 360px;
		width: 140px;
		transform: translateX(-50%) scaleX(-1);
	}
	.cloud {
		position: absolute;
		image-rendering: pixelated;
		opacity: 0.55;
		pointer-events: none;
		filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
	}
	.cloud-1 {
		top: 12%;
		right: 4%;
		width: 220px;
		height: auto;
	}
	.cloud-2 {
		top: 48%;
		left: 4%;
		width: 180px;
		height: auto;
	}
	.cloud-3 {
		top: 78%;
		right: 12%;
		width: 160px;
		height: auto;
	}

	/* ---- Path ---- */
	.path {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 1;
	}

	/* ---- Nodes ---- */
	.node {
		position: absolute;
		transform: translateX(-50%);
		/* Hit area extends well past the visible bubble. The 88px circle is
		   what the kid aims for; the surrounding 30px+ on each side absorbs
		   off-center taps on a tablet. touch-action: manipulation kills the
		   300ms double-tap-zoom delay AND raises the movement threshold for
		   "this is a scroll, not a tap" — without it, a tiny finger drift
		   during touch was canceling the click. */
		width: 140px;
		height: 150px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: 0;
		background: transparent;
		border: none;
		z-index: 5;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
	.bubble {
		position: relative;
		width: 88px;
		height: 88px;
		border-radius: 50%;
		background:
			radial-gradient(ellipse at top, rgba(255, 255, 255, 0.25), transparent 60%),
			linear-gradient(180deg, #d9a26b, #8a5524);
		box-shadow:
			inset 0 -6px 12px rgba(0, 0, 0, 0.5),
			inset 0 4px 6px rgba(255, 230, 180, 0.4),
			0 0 0 4px #5a3a1a,
			0 8px 16px rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform var(--motion-fast) var(--ease-out);
	}
	.node:active:not(:disabled) .bubble {
		transform: scale(0.94);
	}
	.mini {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 60px;
		height: 60px;
	}
	.num {
		position: absolute;
		bottom: -8px;
		right: -8px;
		min-width: 32px;
		height: 32px;
		padding: 0 8px;
		border-radius: var(--radius-pill);
		background: #fef3c7;
		color: #4a2c0e;
		font: var(--font-w-bold) var(--text-base) / 32px var(--font-display);
		text-align: center;
		font-variant-numeric: tabular-nums;
		box-shadow:
			0 0 0 3px #5a3a1a,
			0 4px 4px rgba(0, 0, 0, 0.4);
	}
	.node.boss .bubble {
		background:
			radial-gradient(ellipse at top, rgba(255, 255, 255, 0.4), transparent 60%),
			linear-gradient(180deg, #facc15, #b45309);
		box-shadow:
			inset 0 -6px 12px rgba(0, 0, 0, 0.4),
			inset 0 4px 6px rgba(255, 255, 255, 0.5),
			0 0 0 4px #78350f,
			0 0 24px rgba(252, 211, 77, 0.6),
			0 8px 16px rgba(0, 0, 0, 0.6);
	}
	.node.locked {
		cursor: not-allowed;
	}
	.node.locked .bubble {
		filter: grayscale(0.7) brightness(0.55);
	}
	.node.locked:active .bubble {
		transform: none;
	}
	.node.locked .num {
		opacity: 0.5;
	}
	.lock {
		font-size: 32px;
		line-height: 1;
		filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.5));
	}
	.node.locked .mini {
		opacity: 0.45;
	}
	.node.current .bubble {
		animation: pulse 1.6s ease-in-out infinite;
		box-shadow:
			inset 0 -6px 12px rgba(0, 0, 0, 0.4),
			inset 0 4px 6px rgba(255, 230, 180, 0.5),
			0 0 0 4px var(--color-primary-500),
			0 0 28px rgba(16, 185, 129, 0.7),
			0 8px 16px rgba(0, 0, 0, 0.6);
	}
	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.06);
		}
	}
	.stars {
		display: flex;
		gap: 2px;
		font-size: var(--text-base);
		filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.4));
	}
	.star {
		color: rgba(0, 0, 0, 0.4);
	}
	.star.on {
		color: #facc15;
		text-shadow: 0 0 8px rgba(252, 211, 77, 0.7);
	}
	.now {
		font-size: var(--text-xs);
		font-weight: var(--font-w-bold);
		color: white;
		background: var(--color-primary-500);
		padding: 2px 8px;
		border-radius: var(--radius-pill);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
	}

	/* ---- Hero marker ---- */
	.hero-marker {
		position: absolute;
		transform: translateX(-50%);
		pointer-events: none;
		animation: hero-bob 2s ease-in-out infinite;
		z-index: 6;
		filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.6));
	}
	@keyframes hero-bob {
		0%,
		100% {
			transform: translateX(-50%) translateY(0);
		}
		50% {
			transform: translateX(-50%) translateY(-6px);
		}
	}
</style>
