<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto, beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import {
		bandConfig,
		BRIDGE_THEMES,
		BRIDGE_TOKENS,
		type BridgeBand,
		type BridgeWorld
	} from '$lib/games/bridge';
	import { bridgeBandFor, applyBridgeLevelOutcome } from '$lib/games/bridge/mastery';
	import BridgeScene from '$lib/games/bridge/BridgeScene.svelte';
	import { worldThemeFor } from '$lib/games/facts/levelConfig';
	import {
		loadProfile,
		saveProfile,
		emptyProfile,
		starsForOutcome,
		upsertLevelRecord,
		type Profile
	} from '$lib/storage/persist';
	import { COINS_PER_WIN } from '$lib/games/facts/sessionConfig';
	import { play, unlock } from '$lib/audio/sfx';
	import OutcomeCard from '$lib/components/game/OutcomeCard.svelte';

	// Bridge questions are 3-4 sub-step taps each, so 4 questions per level
	// keeps the total commit-count comparable to a 10-question facts level.
	// See docs/research/bridge-design.md §5.
	const BRIDGE_WIN_CORRECT = 4;
	// 5 lives — each wrong sub-step costs one life. Lose at 5 cumulative
	// wrong sub-steps (matches the lives semantics from facts/numberline).
	const BRIDGE_LOSE_WRONGS = 5;

	let profile: Profile = $state(emptyProfile());
	let loaded = $state(false);

	const explicitLevel = $derived.by(() => {
		const l = page.url.searchParams.get('level');
		return l ? Number(l) : null;
	});
	const replayLevel = $derived.by(() => {
		const r = page.url.searchParams.get('replay');
		return r ? Number(r) : null;
	});
	const isReplay = $derived(replayLevel !== null);
	// Pinned at finishLevel so profile.level++ (after a win) doesn't bump
	// playLevel and regenerate the question while the celebration is showing.
	let frozenPlayLevel = $state<number | null>(null);
	const playLevel = $derived(frozenPlayLevel ?? replayLevel ?? explicitLevel ?? profile.level);

	const worldId: BridgeWorld = $derived(worldThemeFor(playLevel) as BridgeWorld);
	const theme = $derived(BRIDGE_THEMES[worldId]);
	const token = $derived(BRIDGE_TOKENS[worldId]);

	let questionIdx = $state(0);
	// Per-mount nonce so each session (including replays) gets fresh RNG.
	const sessionNonce = Math.floor(Math.random() * 1_000_000);
	// Pinned at finishLevel so the band visual doesn't swap to a newly-advanced
	// band during the celebration window before the OutcomeCard.
	let frozenBand = $state<BridgeBand | null>(null);
	const currentBand = $derived(frozenBand ?? bandConfig(bridgeBandFor(profile.mastery)));
	const questionSeed = $derived(playLevel * 1000003 + questionIdx + sessionNonce * 7919);

	let correct = $state(0);
	let wrong = $state(0);
	let outcome = $state<'in_progress' | 'won' | 'lost'>('in_progress');

	let lastEarnedCoins = $state(0);
	let lastBonusCoins = $state(0);
	let celebrationPhase: 'none' | 'celebrating' | 'overlay' = $state('none');
	let celebrationTimer: ReturnType<typeof setTimeout> | null = null;
	let bandedUp = false;

	onMount(async () => {
		const saved = await loadProfile();
		if (saved) profile = saved;
		profile.lastViewedLevel = playLevel;
		loaded = true;
	});

	onDestroy(() => {
		if (celebrationTimer) clearTimeout(celebrationTimer);
	});

	$effect(() => {
		if (loaded) void saveProfile(profile);
	});

	beforeNavigate(async () => {
		if (loaded) await saveProfile(profile);
	});

	function onStep(wasCorrect: boolean) {
		// Per-sub-step HUD update: each wrong sub-step decrements lives in
		// real time. End the level immediately if lives hit 0 mid-question.
		if (outcome !== 'in_progress') return;
		if (!wasCorrect) {
			wrong += 1;
			if (wrong >= BRIDGE_LOSE_WRONGS) finishLevel('lost');
		}
	}

	function onComplete(wrongSteps: number) {
		unlock();
		if (outcome !== 'in_progress') return;
		// `wrong` was already incremented per step via onStep — don't double.
		// Question counts as "correct" only if all sub-steps were right on first try.
		if (wrongSteps === 0) correct += 1;

		if (correct >= BRIDGE_WIN_CORRECT) {
			finishLevel('won');
			return;
		}
		if (wrong >= BRIDGE_LOSE_WRONGS) {
			finishLevel('lost');
			return;
		}
		setTimeout(() => {
			questionIdx += 1;
		}, 900);
	}

	function finishLevel(result: 'won' | 'lost') {
		frozenBand = bandConfig(bridgeBandFor(profile.mastery));
		frozenPlayLevel = playLevel;
		outcome = result;
		const transition = applyBridgeLevelOutcome(profile.mastery, correct, correct + wrong);
		bandedUp = transition.bandChanged && transition.toBand > transition.fromBand;

		if (result === 'won') {
			const stars = starsForOutcome(wrong);
			upsertLevelRecord(profile, playLevel, profile.mastery, stars);
			const base = isReplay ? 0 : COINS_PER_WIN;
			profile.coins += base;
			lastEarnedCoins = base;
			lastBonusCoins = 0;
			if (!isReplay && playLevel >= profile.level) {
				profile.level = playLevel + 1;
			}
			profile.lastViewedLevel = playLevel;
			play('win', 0.4);
			if (bandedUp) setTimeout(() => play('level_up', 0.45), 700);
			void saveProfile(profile);
		} else {
			play('lose', 0.3);
			void saveProfile(profile);
		}

		celebrationPhase = 'celebrating';
		if (celebrationTimer) clearTimeout(celebrationTimer);
		celebrationTimer = setTimeout(() => {
			celebrationPhase = 'overlay';
			celebrationTimer = null;
		}, 1300);
	}

	const earnedStars = $derived(outcome === 'won' ? starsForOutcome(wrong) : 0);
	const levelUpKind: 'band' | 'stage' | null = $derived(bandedUp ? 'band' : null);

	async function nextAction() {
		await saveProfile(profile);
		if (outcome === 'lost') {
			// "Réessayer" — reload to reset scene state cleanly.
			window.location.reload();
			return;
		}
		if (isReplay) {
			goto('/levels');
			return;
		}
		goto('/play');
	}

	async function goLevels() {
		await saveProfile(profile);
		goto('/levels');
	}
</script>

<div class="page">
	<div class="hud-top">
		<button class="hud-back" onclick={goLevels} aria-label="Carte des niveaux">←</button>
		<div class="hud-level">
			<span class="lv-num">Niv. {playLevel}</span>
			{#if isReplay}
				<span class="lv-mod replay">↻</span>
			{/if}
		</div>
		<div class="hud-right">
			<div class="hud-stack">
				<div class="hud-row">
					<div class="hud-pill score-pill">
						✓ <span class="hi">{correct}</span>
						<span class="dim">/ {BRIDGE_WIN_CORRECT}</span>
					</div>
					<div class="hud-pill lives-pill" aria-label="Vies restantes">
						❤ <span class="num">{Math.max(0, BRIDGE_LOSE_WRONGS - wrong)}</span>
					</div>
					<div class="hud-pill coin-pill">
						🪙 <span class="num">{profile.coins}</span>
					</div>
				</div>
				<div class="progressbar" aria-label="Progression vers la victoire">
					<div
						class="progressbar-fill"
						style="width: {(correct / BRIDGE_WIN_CORRECT) * 100}%"
					></div>
				</div>
			</div>
		</div>
	</div>

	<div class="scene-wrap">
		<!-- Key on playLevel so re-entering the same route after navigation
		     forces a fresh BridgeScene instance — otherwise internal state can
		     survive into the next visit. -->
		{#key playLevel}
			<BridgeScene band={currentBand} {theme} {token} {questionSeed} {onStep} {onComplete} />
		{/key}
	</div>

	{#if celebrationPhase === 'overlay'}
		<OutcomeCard
			outcome={outcome === 'won' ? 'won' : 'lost'}
			{correct}
			{wrong}
			stars={earnedStars}
			coinsCollected={0}
			coinsTotal={0}
			earnedCoins={lastEarnedCoins}
			bonusCoins={lastBonusCoins}
			{isReplay}
			levelUp={levelUpKind}
			onNext={nextAction}
			onMap={goLevels}
		/>
	{/if}
</div>

<style>
	.page {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: var(--surface-app);
		display: flex;
		flex-direction: column;
	}
	.scene-wrap {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 100px 16px 16px;
	}
	.scene-wrap :global(.scene) {
		flex: 1;
	}
	.hud-top {
		position: absolute;
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
	.hud-back {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		border-radius: var(--radius-pill);
		background: rgba(15, 23, 42, 0.92);
		color: var(--color-fg-50);
		font-size: var(--text-2xl);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
		cursor: pointer;
	}
	.hud-back:active {
		transform: scale(0.93);
	}
	.hud-level {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background: rgba(15, 23, 42, 0.92);
		border-radius: var(--radius-pill);
		color: var(--color-fg-50);
		font: var(--font-w-bold) var(--text-base) / 1 var(--font-display);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}
	.lv-mod {
		padding: 2px var(--space-2);
		border-radius: var(--radius-pill);
		background: rgba(168, 85, 247, 0.85);
		color: white;
		font-size: var(--text-sm);
	}
	.lv-mod.replay {
		background: rgba(59, 130, 246, 0.85);
	}
	.hud-right {
		margin-left: auto;
		display: flex;
	}
	.hud-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		align-items: stretch;
	}
	.hud-row {
		display: flex;
		gap: var(--space-2);
		justify-content: flex-end;
	}
	.hud-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: var(--space-2) var(--space-3);
		background: rgba(15, 23, 42, 0.92);
		border-radius: var(--radius-pill);
		color: var(--color-fg-50);
		font: var(--font-w-bold) var(--text-base) / 1 var(--font-display);
		font-variant-numeric: tabular-nums;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}
	.score-pill .hi {
		color: var(--color-primary-300);
	}
	.score-pill .dim {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
	.coin-pill {
		color: var(--color-coin-500);
	}
	.lives-pill {
		color: #f87171;
	}
	.lives-pill .num {
		color: #fef2f2;
	}
	.progressbar {
		height: 6px;
		background: rgba(0, 0, 0, 0.55);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}
	.progressbar-fill {
		height: 100%;
		background: linear-gradient(90deg, #4ade80, #22c55e, #facc15);
		transition: width var(--motion-normal) var(--ease-out);
	}
</style>
