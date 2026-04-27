<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto, beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import {
		bandConfig,
		NUMBERLINE_THEMES,
		type NumberLineBand,
		type QuestionKind,
		type NumberlineTheme
	} from '$lib/games/numberline';
	import { nlBandFor, applyNlLevelOutcome } from '$lib/games/numberline/mastery';
	import NumberlineScene from '$lib/games/numberline/NumberlineScene.svelte';
	import { worldThemeFor } from '$lib/games/facts/levelConfig';
	import {
		loadProfile,
		saveProfile,
		emptyProfile,
		starsForOutcome,
		upsertLevelRecord,
		type Profile
	} from '$lib/storage/persist';
	import { WIN_CORRECT, COINS_PER_WIN } from '$lib/games/facts/sessionConfig';
	import { HEROES } from '$lib/sprites/manifest';
	import { DEFAULT_HERO_ID } from '$lib/cosmetics/catalog';
	import { play, unlock } from '$lib/audio/sfx';
	import OutcomeCard from '$lib/components/game/OutcomeCard.svelte';

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
	const playLevel = $derived(replayLevel ?? explicitLevel ?? profile.level);

	const heroChar = $derived(HEROES[profile.inventory.equipped.hero] ?? HEROES[DEFAULT_HERO_ID]);
	const themeId: NumberlineTheme = $derived(worldThemeFor(playLevel));
	const theme = $derived(NUMBERLINE_THEMES[themeId]);

	// Alternate kinds within a level so the kid sees both add and sub. Seed
	// from level + question index so questions are deterministic per session.
	let questionIdx = $state(0);
	const questionKind: QuestionKind = $derived(questionIdx % 2 === 0 ? 'add' : 'sub');
	// Pinned at finishLevel so the scene doesn't visibly switch to a newly-advanced
	// band during the celebration window before the OutcomeCard appears.
	let frozenBand = $state<NumberLineBand | null>(null);
	const currentBand = $derived(frozenBand ?? bandConfig(nlBandFor(profile.mastery, questionKind)));
	const questionSeed = $derived(playLevel * 1000003 + questionIdx);

	let correct = $state(0);
	let wrong = $state(0);
	let outcome = $state<'in_progress' | 'won' | 'lost'>('in_progress');
	const LOSE_WRONGS = 5;

	let perKindStats: Record<QuestionKind, { correct: number; total: number }> = $state({
		add: { correct: 0, total: 0 },
		sub: { correct: 0, total: 0 }
	});

	let lastEarnedCoins = $state(0);
	let lastBonusCoins = $state(0);
	let celebrationPhase: 'none' | 'celebrating' | 'overlay' = $state('none');
	let celebrationTimer: ReturnType<typeof setTimeout> | null = null;
	let bandUpKind: QuestionKind | null = null;

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

	function onComplete(wasCorrect: boolean) {
		unlock();
		if (outcome !== 'in_progress') return;
		const kindNow = questionKind;
		perKindStats[kindNow].total += 1;
		if (wasCorrect) {
			perKindStats[kindNow].correct += 1;
			correct += 1;
			play('correct', 0.5);
		} else {
			wrong += 1;
			play('wrong', 0.5);
		}

		if (correct >= WIN_CORRECT) {
			finishLevel('won');
			return;
		}
		if (wrong >= LOSE_WRONGS) {
			finishLevel('lost');
			return;
		}
		// Auto-advance after a brief inspection pause. Wrong answers already
		// have a built-in reveal sequence (~1.5s) before onComplete fires, so
		// 900ms here is enough for the kid to register the green check / red
		// cross before the next question.
		setTimeout(() => {
			questionIdx += 1;
		}, 900);
	}

	function finishLevel(result: 'won' | 'lost') {
		// Snapshot the band that was on screen so the visible numberline doesn't
		// swap when applyNlLevelOutcome mutates mastery below.
		frozenBand = bandConfig(nlBandFor(profile.mastery, questionKind));
		outcome = result;
		// Apply NL level outcome per kind (band advance / stay / demote).
		bandUpKind = null;
		for (const kind of ['add', 'sub'] as QuestionKind[]) {
			const stats = perKindStats[kind];
			if (stats.total === 0) continue;
			const transition = applyNlLevelOutcome(profile.mastery, kind, stats.correct, stats.total);
			if (transition.bandChanged && transition.toBand > transition.fromBand) {
				bandUpKind = kind;
			}
		}

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
			if (bandUpKind) {
				setTimeout(() => play('level_up', 0.45), 700);
			}
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
	const levelUpKind: 'band' | 'stage' | null = $derived(bandUpKind ? 'band' : null);

	async function nextAction() {
		await saveProfile(profile);
		if (isReplay) {
			goto('/levels');
			return;
		}
		// Hard reload to /play — the rotator on /levels will route to whichever
		// game type the new playLevel needs.
		goto('/play');
	}

	async function goLevels() {
		await saveProfile(profile);
		goto('/levels');
	}
</script>

<div class="page">
	<!-- HUD -->
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
						<span class="dim">/ {WIN_CORRECT}</span>
					</div>
					<div class="hud-pill lives-pill" aria-label="Vies restantes">
						❤ <span class="num">{Math.max(0, LOSE_WRONGS - wrong)}</span>
					</div>
					<div class="hud-pill coin-pill">
						🪙 <span class="num">{profile.coins}</span>
					</div>
				</div>
				<div class="progressbar" aria-label="Progression vers la victoire">
					<div class="progressbar-fill" style="width: {(correct / WIN_CORRECT) * 100}%"></div>
				</div>
			</div>
		</div>
	</div>

	<div class="scene-wrap">
		<NumberlineScene
			band={currentBand}
			{theme}
			character={heroChar}
			{questionKind}
			{questionSeed}
			heroHeight={96}
			{onComplete}
		/>
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

	/* HUD — same shape as /play's facts HUD. Could be extracted to a shared
	   component later if both keep the same structure. */
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
