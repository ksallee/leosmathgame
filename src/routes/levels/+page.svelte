<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { loadProfile, emptyProfile, findLevelRecord, type Profile } from '$lib/storage/persist';
	import { pickMonsterForLevel, DEFAULT_HERO_ID } from '$lib/cosmetics/catalog';
	import { HEROES, MONSTERS } from '$lib/sprites/manifest';
	import Sprite from '$lib/components/sprites/Sprite.svelte';

	let profile: Profile = $state(emptyProfile());
	let scroller: HTMLDivElement | undefined = $state();

	const SHOW_AHEAD = 10;
	const NODE_GAP = 150;
	const TOP_PAD = 60;

	const totalLevels = $derived(Math.max(profile.level + SHOW_AHEAD, 25));
	const heroChar = $derived(HEROES[profile.inventory.equipped.hero] ?? HEROES[DEFAULT_HERO_ID]);

	onMount(async () => {
		const saved = await loadProfile();
		if (saved) profile = saved;
		queueMicrotask(scrollToCurrent);
	});

	function scrollToCurrent() {
		if (!scroller) return;
		const target = (profile.level - 1) * NODE_GAP + TOP_PAD - scroller.clientHeight / 2 + 60;
		scroller.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
	}

	function nodeX(i: number): number {
		return 50 + Math.sin(i * 0.65) * 30;
	}

	type Status = 'locked' | 'current' | 'done';
	function levelStatus(level: number): Status {
		if (level === profile.level) return 'current';
		if (level < profile.level) return 'done';
		return 'locked';
	}

	function tap(level: number) {
		const s = levelStatus(level);
		if (s === 'done') goto(`/play?replay=${level}`);
		else if (s === 'current') goto('/play');
		else goto(`/play?level=${level}`);
	}

	function backHome() {
		goto('/');
	}
</script>

<main>
	<header>
		<button class="back" onclick={backHome} aria-label="Retour">←</button>
		<h1>Carte des niveaux</h1>
		<a class="shop" href="/shop">🪙 {profile.coins}</a>
	</header>

	<div class="scroller" bind:this={scroller}>
		<div class="map" style="height: {totalLevels * NODE_GAP + TOP_PAD}px">
			<svg
				class="path"
				preserveAspectRatio="none"
				viewBox="0 0 100 {totalLevels * NODE_GAP + TOP_PAD}"
			>
				<path
					d={Array.from({ length: totalLevels }, (_, i) => {
						const x = nodeX(i);
						const y = i * NODE_GAP + TOP_PAD;
						return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
					}).join(' ')}
					stroke="rgba(255,255,255,0.12)"
					stroke-width="0.6"
					stroke-dasharray="2 2"
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
					aria-label="Niveau {level}"
				>
					<div class="bubble">
						<div class="mini">
							<Sprite character={monsterChar} state="idle" height={48} />
						</div>
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
	main {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background:
			radial-gradient(ellipse at 30% 10%, #1e1b4b 0%, transparent 50%),
			radial-gradient(ellipse at 70% 90%, #312e81 0%, transparent 60%), var(--surface-app);
	}

	header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: rgba(15, 23, 42, 0.85);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.back {
		font-size: var(--text-2xl);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
	}
	h1 {
		flex: 1;
		font: var(--font-w-bold) var(--text-lg) / 1 var(--font-display);
	}
	.shop {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-800);
		border-radius: var(--radius-pill);
		color: var(--color-coin-500);
		font: var(--font-w-bold) var(--text-base) / 1 var(--font-display);
		font-variant-numeric: tabular-nums;
	}
	.shop:active {
		transform: scale(0.95);
	}

	.scroller {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		-webkit-overflow-scrolling: touch;
	}
	.map {
		position: relative;
		max-width: 540px;
		margin: 0 auto;
	}
	.path {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.node {
		position: absolute;
		transform: translateX(-50%);
		width: 110px;
		height: 130px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: 0;
		background: transparent;
		border: none;
	}
	.bubble {
		position: relative;
		width: 88px;
		height: 88px;
		border-radius: 50%;
		background: linear-gradient(180deg, var(--color-bg-800), var(--color-bg-900));
		box-shadow:
			inset 0 -4px 8px rgba(0, 0, 0, 0.5),
			inset 0 2px 4px rgba(255, 255, 255, 0.1),
			0 8px 16px rgba(0, 0, 0, 0.5);
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
		bottom: -4px;
		right: -4px;
		min-width: 28px;
		height: 28px;
		padding: 0 6px;
		border-radius: var(--radius-pill);
		background: var(--color-fg-50);
		color: var(--color-bg-900);
		font: var(--font-w-bold) var(--text-base) / 28px var(--font-display);
		text-align: center;
		font-variant-numeric: tabular-nums;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
	}
	.node.boss .bubble {
		background: linear-gradient(180deg, #facc15 0%, #b45309 100%);
		box-shadow:
			inset 0 -4px 8px rgba(0, 0, 0, 0.5),
			inset 0 2px 6px rgba(255, 255, 255, 0.3),
			0 0 24px rgba(250, 204, 21, 0.5),
			0 8px 16px rgba(0, 0, 0, 0.5);
	}
	.node.locked .bubble {
		filter: grayscale(0.85) brightness(0.5);
	}
	.node.locked .num {
		opacity: 0.5;
	}
	.node.locked .mini {
		opacity: 0.45;
	}
	.node.current .bubble {
		animation: pulse 1.6s ease-in-out infinite;
		box-shadow:
			inset 0 -4px 8px rgba(0, 0, 0, 0.5),
			inset 0 2px 4px rgba(255, 255, 255, 0.1),
			0 0 0 4px var(--color-primary-500),
			0 0 24px rgba(16, 185, 129, 0.6);
	}
	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
	}
	.stars {
		display: flex;
		gap: 2px;
		font-size: var(--text-base);
	}
	.star {
		color: var(--color-fg-700);
	}
	.star.on {
		color: var(--color-coin-500);
		text-shadow: 0 0 8px rgba(250, 204, 21, 0.7);
	}
	.now {
		font-size: var(--text-xs);
		font-weight: var(--font-w-bold);
		color: var(--color-primary-300);
		background: rgba(16, 185, 129, 0.15);
		padding: 2px 8px;
		border-radius: var(--radius-pill);
	}

	.hero-marker {
		position: absolute;
		transform: translateX(-50%);
		pointer-events: none;
		animation: hero-bob 2s ease-in-out infinite;
		z-index: 5;
	}
	.hero-marker {
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
