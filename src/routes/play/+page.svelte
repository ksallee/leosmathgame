<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto, beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import {
		generateLevel,
		recordAnswer,
		recordForLeitner,
		opsUnlockedAt,
		type Question,
		type GenerateOptions,
		type Operation
	} from '$lib/engine';
	import { opLabel } from '$lib/engine/debug';
	import {
		loadProfile,
		saveProfile,
		emptyProfile,
		findLevelRecord,
		starsForOutcome,
		upsertLevelRecord,
		type Profile
	} from '$lib/storage/persist';
	import {
		createSession,
		currentQuestion,
		tick,
		answer,
		type SessionState
	} from '$lib/game/session';
	import { WIN_CORRECT } from '$lib/game/config';
	import { levelConfig } from '$lib/game/levelConfig';
	import { pickMonsterForLevel, DEFAULT_HERO_ID } from '$lib/cosmetics/catalog';
	import { HEROES, MONSTERS, treasureForVariant } from '$lib/sprites/manifest';
	import Numpad from '$lib/components/ui/Numpad.svelte';
	import Sprite from '$lib/components/sprites/Sprite.svelte';
	import Treasure from '$lib/components/sprites/Treasure.svelte';
	import WorldBg from '$lib/components/sprites/WorldBg.svelte';
	import OutcomeCard from '$lib/components/game/OutcomeCard.svelte';
	import { play, unlock } from '$lib/audio/sfx';

	let profile: Profile = $state(emptyProfile());
	let loaded = $state(false);

	let session: SessionState | null = $state(null);
	let userAnswer = $state('');
	let now = $state(Date.now());
	let rafId: number | null = null;
	let lastEarnedCoins = $state(0);
	let lastBonusCoins = $state(0);
	let groupsTakenIds: string[] = $state([]);
	let celebrationPhase: 'none' | 'celebrating' | 'overlay' = $state('none');
	let celebrationTimer: ReturnType<typeof setTimeout> | null = null;

	let questionBuffer: Question[] = [];

	const replayLevel = $derived.by(() => {
		const r = page.url.searchParams.get('replay');
		return r ? Number(r) : null;
	});
	const explicitLevel = $derived.by(() => {
		const l = page.url.searchParams.get('level');
		return l ? Number(l) : null;
	});
	const isReplay = $derived(replayLevel !== null);
	const playLevel = $derived(replayLevel ?? explicitLevel ?? profile.level);

	const replayRecord = $derived(isReplay ? findLevelRecord(profile, playLevel) : undefined);
	const config = $derived(levelConfig(playLevel));

	function buildOptions(): GenerateOptions | undefined {
		if (!isReplay) return undefined;
		const record = replayRecord;
		const forced = opsUnlockedAt(playLevel);
		return {
			forceUnlockedOps: forced,
			bandFor: (op: Operation) => record?.bandsAtCompletion[op] ?? profile.mastery[op].band ?? 1
		};
	}
	function refillBuffer() {
		const more = generateLevel(profile.mastery, playLevel, buildOptions());
		questionBuffer.push(...more);
	}
	function nextQuestion(): Question {
		if (questionBuffer.length === 0) refillBuffer();
		return questionBuffer.shift()!;
	}

	const q = $derived(session ? currentQuestion(session) : null);

	const heroChar = $derived(HEROES[profile.inventory.equipped.hero] ?? HEROES[DEFAULT_HERO_ID]);
	const monsterSkin = $derived(pickMonsterForLevel(playLevel));
	const monsterChar = $derived(MONSTERS[monsterSkin.id] ?? MONSTERS.slime);

	const monsterHeight = $derived(Math.round(160 * config.monsterScale));
	const heroHeight = 160;

	// Position math: monster path goes from MONSTER_EDGE (at pos=0) to (100% - HERO_EDGE - heroW - monsterW) (at pos=1)
	const MONSTER_EDGE = 60;
	const HERO_EDGE = 100;
	const monsterW = $derived(Math.round(monsterHeight * 0.9));
	const heroW = $derived(Math.round(heroHeight * 0.6));
	// Coin x is in same path coordinates as monster pos. Coin center sits where
	// the monster's center would be at pos = coin.x.
	const coinAnchor = $derived(MONSTER_EDGE + monsterW / 2);
	const coinPathPx = $derived(MONSTER_EDGE + HERO_EDGE + monsterW + heroW);

	const monsterState: 'idle' | 'run' | 'hit' = $derived.by(() => {
		if (!session) return 'run';
		if (session.outcome === 'won') return 'hit';
		if (session.outcome === 'lost') return 'idle';
		if (session.lastFeedback === 'correct' && now - session.lastFeedbackAt < 450) return 'hit';
		return 'run';
	});

	const heroState: 'idle' | 'run' | 'hit' = $derived.by(() => {
		if (!session) return 'idle';
		if (session.outcome === 'lost') return 'hit';
		if (session.outcome === 'won') return 'run';
		if (session.lastFeedback === 'wrong' && now - session.lastFeedbackAt < 400) return 'hit';
		return 'idle';
	});

	const flash: 'correct' | 'wrong' | null = $derived.by(() => {
		if (!session?.lastFeedback) return null;
		if (now - session.lastFeedbackAt > 250) return null;
		return session.lastFeedback;
	});

	const earnedStars = $derived.by(() => {
		if (!session || session.outcome !== 'won') return 0;
		return starsForOutcome(session.wrong);
	});

	const collectedGroups = $derived(config.coinGroups.filter((g) => !groupsTakenIds.includes(g.id)));
	const collectedValue = $derived(collectedGroups.reduce((s, g) => s + g.totalValue, 0));
	const totalCoinValue = $derived(config.coinGroups.reduce((s, g) => s + g.totalValue, 0));

	onMount(async () => {
		const saved = await loadProfile();
		if (saved) profile = saved;
		loaded = true;
		startLevel();
		loop();
	});

	onDestroy(() => {
		if (rafId !== null) cancelAnimationFrame(rafId);
		if (celebrationTimer) clearTimeout(celebrationTimer);
	});

	$effect(() => {
		if (loaded) void saveProfile(profile);
	});

	// Delay the overlay so win/lose animations can play
	$effect(() => {
		if (!session) return;
		if (session.outcome === 'in_progress') {
			if (celebrationPhase !== 'none') celebrationPhase = 'none';
			if (celebrationTimer) {
				clearTimeout(celebrationTimer);
				celebrationTimer = null;
			}
			return;
		}
		if (celebrationPhase === 'none') {
			celebrationPhase = 'celebrating';
			celebrationTimer = setTimeout(() => {
				celebrationPhase = 'overlay';
				celebrationTimer = null;
			}, 1300);
		}
	});

	beforeNavigate(async () => {
		if (loaded) await saveProfile(profile);
	});

	function startLevel() {
		questionBuffer = [];
		groupsTakenIds = [];
		session = createSession(nextQuestion, playLevel, {
			speedMultiplier: config.monsterSpeedMultiplier,
			pushBackMultiplier: config.pushBackMultiplier
		});
		userAnswer = '';
		lastEarnedCoins = 0;
		lastBonusCoins = 0;
	}

	function loop() {
		now = Date.now();
		if (session && session.outcome === 'in_progress') {
			const before = session.outcome;
			tick(session, now);
			for (const g of config.coinGroups) {
				if (!groupsTakenIds.includes(g.id) && session.monsterPos >= g.x) {
					groupsTakenIds = [...groupsTakenIds, g.id];
				}
			}
			if (session.outcome !== before && session.outcome === 'lost') play('lose');
			session = session;
		}
		rafId = requestAnimationFrame(loop);
	}

	function onChange(v: string) {
		userAnswer = v;
	}

	function onKey(e: KeyboardEvent) {
		if (!session || session.outcome !== 'in_progress') return;
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if (e.key >= '0' && e.key <= '9') {
			if (userAnswer.length >= 4) return;
			userAnswer = userAnswer + e.key;
			e.preventDefault();
		} else if (e.key === 'Backspace') {
			if (userAnswer.length === 0) return;
			userAnswer = userAnswer.slice(0, -1);
			e.preventDefault();
		} else if (e.key === 'Enter') {
			if (userAnswer.length === 0) return;
			onSubmit();
			e.preventDefault();
		}
	}

	function onSubmit() {
		if (!session || !q) return;
		unlock();
		const ev = answer(session, Number(userAnswer));
		if (!ev) return;
		recordAnswer(profile.mastery, ev);
		recordForLeitner(profile.mastery, ev);
		play(ev.correct ? 'correct' : 'wrong', 0.5);

		if (session.outcome === 'won') {
			const stars = starsForOutcome(session.wrong);
			upsertLevelRecord(profile, playLevel, profile.mastery, stars);
			if (!isReplay) {
				const base = 10 + session.correct + stars * 5;
				const bonus = collectedValue;
				profile.coins += base + bonus;
				lastEarnedCoins = base;
				lastBonusCoins = bonus;
				if (playLevel >= profile.level) profile.level = playLevel + 1;
			}
			play('win');
			void saveProfile(profile);
		} else if (session.outcome === 'lost') {
			play('lose');
			void saveProfile(profile);
		}
		userAnswer = '';
		session = session;
	}

	async function nextAction() {
		await saveProfile(profile);
		if (isReplay) {
			goto('/levels');
			return;
		}
		startLevel();
	}

	async function goLevels() {
		await saveProfile(profile);
		goto('/levels');
	}
</script>

<svelte:window on:keydown={onKey} />

<div class="game" class:flash-correct={flash === 'correct'} class:flash-wrong={flash === 'wrong'}>
	<WorldBg level={playLevel} />

	<div class="ground" style:--tint={config.groundTint}></div>
	<div class="ground-edge"></div>

	<!-- HUD -->
	<div class="hud-top">
		<button class="hud-back" onclick={goLevels} aria-label="Carte des niveaux">←</button>
		<div class="hud-level">
			<span class="lv-num">Niv. {playLevel}</span>
			{#if config.modifierLabel}
				<span class="lv-mod" class:mod-boss={config.isBoss}>{config.modifierLabel}</span>
			{/if}
			{#if isReplay}
				<span class="lv-mod replay">↻</span>
			{/if}
		</div>
		<div class="hud-right">
			<div class="hud-stack">
				<div class="hud-row">
					<div class="hud-pill score-pill">
						✓ <span class="hi">{session?.correct ?? 0}</span>
						<span class="dim">/ {WIN_CORRECT}</span>
					</div>
					<div class="hud-pill coin-pill">
						🪙 <span class="num">{profile.coins}</span>
					</div>
				</div>
				<div class="lifebar" aria-label="Distance du monstre">
					<div class="lifebar-fill" style="width: {(session?.monsterPos ?? 0) * 100}%"></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Question prompt -->
	{#if q}
		<div class="prompt-area">
			<div class="prompt-pill">
				<span class="op-mark">{opLabel(q.operation)}</span>
				<span class="lhs">{q.prompt}</span>
				<span class="eq">=</span>
				<span class="ans">{userAnswer}</span><span class="caret" class:hide={userAnswer !== ''}
				></span>
			</div>
		</div>
	{/if}

	<!-- Battle track -->
	<div class="track">
		{#each config.coinGroups as g (g.id)}
			{@const taken = groupsTakenIds.includes(g.id)}
			<div
				class="coin-group"
				class:taken
				style:left="calc({coinAnchor}px + {g.x} * (100% - {coinPathPx}px))"
			>
				{#each g.pieces as piece, idx (idx)}
					<div class="coin-piece" style:transform="translate({piece.dx}px, {piece.dy}px)">
						<Treasure
							treasure={treasureForVariant(piece.variant)}
							state={taken ? 'taken' : 'idle'}
							height={piece.variant === 'diamond' ? 80 : 64}
						/>
					</div>
				{/each}
			</div>
		{/each}

		<div
			class="monster-wrap"
			style="left: calc({MONSTER_EDGE}px + {session?.monsterPos ?? 0} * (100% - {coinPathPx}px))"
			style:width="{monsterW}px"
		>
			<Sprite character={monsterChar} state={monsterState} height={monsterHeight} flip />
		</div>
		<div class="hero-wrap" style:right="{HERO_EDGE}px" style:width="{heroW}px">
			<Sprite character={heroChar} state={heroState} height={heroHeight} flip />
		</div>
	</div>

	<!-- Numpad floater -->
	<div class="pad-floater">
		<Numpad
			value={userAnswer}
			onchange={onChange}
			onsubmit={onSubmit}
			disabled={session?.outcome !== 'in_progress'}
		/>
	</div>

	<!-- Win/Lose overlay -->
	{#if session && session.outcome === 'won' && celebrationPhase === 'celebrating'}
		<div class="win-burst" aria-hidden="true"></div>
	{/if}

	{#if session && session.outcome === 'lost' && celebrationPhase === 'celebrating'}
		<div class="lose-veil"></div>
	{/if}

	{#if session && celebrationPhase === 'overlay'}
		<OutcomeCard
			outcome={session.outcome}
			correct={session.correct}
			wrong={session.wrong}
			stars={earnedStars}
			coinsCollected={collectedValue}
			coinsTotal={totalCoinValue}
			earnedCoins={lastEarnedCoins}
			bonusCoins={lastBonusCoins}
			{isReplay}
			onNext={nextAction}
			onMap={goLevels}
		/>
	{/if}
</div>

<style>
	.game {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: var(--surface-app);
		--ground-h: clamp(180px, 28vh, 240px);
		--pad-h: clamp(220px, 30vh, 320px);
	}

	.game::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 50;
	}
	.game.flash-correct::after {
		animation: flash-green 0.25s ease-out;
	}
	.game.flash-wrong::after {
		animation: flash-red 0.25s ease-out;
	}
	.game.flash-wrong {
		animation: shake 0.25s ease-in-out;
	}
	@keyframes flash-green {
		0% {
			background: rgba(34, 197, 94, 0);
		}
		30% {
			background: rgba(34, 197, 94, 0.35);
		}
		100% {
			background: rgba(34, 197, 94, 0);
		}
	}
	@keyframes flash-red {
		0% {
			background: rgba(239, 68, 68, 0);
		}
		30% {
			background: rgba(239, 68, 68, 0.45);
		}
		100% {
			background: rgba(239, 68, 68, 0);
		}
	}
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-6px);
		}
		40% {
			transform: translateX(6px);
		}
		60% {
			transform: translateX(-4px);
		}
		80% {
			transform: translateX(4px);
		}
	}

	/* ---- Ground ---- */
	.ground {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: var(--ground-h);
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--tint) 60%, transparent) 0%,
			var(--tint) 30%,
			color-mix(in srgb, var(--tint) 70%, black) 100%
		);
		z-index: 1;
		box-shadow: inset 0 8px 16px rgba(0, 0, 0, 0.35);
	}
	.ground-edge {
		position: absolute;
		left: 0;
		right: 0;
		bottom: var(--ground-h);
		height: 6px;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent);
		z-index: 2;
	}

	/* ---- HUD ---- */
	.hud-top {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		z-index: 30;
		pointer-events: none;
	}
	.hud-top > * {
		pointer-events: auto;
	}
	.hud-back {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-pill);
		background: rgba(15, 23, 42, 0.65);
		backdrop-filter: blur(8px);
		color: var(--color-fg-50);
		font-size: var(--text-xl);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}
	.hud-back:active {
		transform: scale(0.93);
	}
	.hud-level {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background: rgba(15, 23, 42, 0.65);
		backdrop-filter: blur(8px);
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
	.lv-mod.mod-boss {
		background: var(--color-coin-500);
		color: var(--color-bg-900);
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
		background: rgba(15, 23, 42, 0.65);
		backdrop-filter: blur(8px);
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
	.lifebar {
		height: 6px;
		background: rgba(0, 0, 0, 0.55);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}
	.lifebar-fill {
		height: 100%;
		background: linear-gradient(90deg, #facc15, #f59e0b, #ef4444);
		transition: width var(--motion-normal) var(--ease-out);
	}

	/* ---- Prompt ---- */
	.prompt-area {
		position: absolute;
		top: 70px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		z-index: 20;
		padding: 0 var(--space-4);
	}
	.prompt-pill {
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-6);
		background: rgba(15, 23, 42, 0.7);
		backdrop-filter: blur(10px);
		border-radius: var(--radius-xl);
		border: 1px solid rgba(255, 255, 255, 0.08);
		font: var(--font-w-bold) clamp(36px, 5.5vw, 76px) / 1 var(--font-display);
		font-variant-numeric: tabular-nums;
		color: var(--color-fg-50);
		text-shadow: 0 2px 0 rgba(0, 0, 0, 0.6);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}
	.op-mark {
		font-size: 0.5em;
		padding: 0 var(--space-2);
		border-radius: var(--radius-md);
		background: var(--color-monster-500);
		color: white;
		align-self: center;
	}
	.lhs,
	.eq {
		color: var(--color-fg-50);
	}
	.ans {
		color: var(--color-primary-300);
		min-width: 1ch;
	}
	.caret {
		display: inline-block;
		width: 0.4ch;
		height: 0.85em;
		background: var(--color-primary-300);
		margin-left: 2px;
		animation: blink 1s step-start infinite;
		vertical-align: -0.05em;
	}
	.caret.hide {
		display: none;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}

	/* ---- Track + characters ---- */
	.track {
		position: absolute;
		left: 0;
		right: 0;
		bottom: var(--ground-h);
		height: 220px;
		z-index: 10;
		pointer-events: none;
	}
	.monster-wrap {
		position: absolute;
		bottom: 0;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		transition: left var(--motion-normal) var(--ease-out);
		will-change: left;
	}
	.hero-wrap {
		position: absolute;
		bottom: 0;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}
	.coin-group {
		position: absolute;
		bottom: 80px;
		transform: translateX(-50%);
		animation: coin-bob 2s ease-in-out infinite;
		z-index: 8;
	}
	.coin-group.taken {
		animation:
			coin-bob 2s ease-in-out infinite,
			group-vanish 0.5s ease-out forwards;
		pointer-events: none;
	}
	.coin-piece {
		position: relative;
		display: inline-block;
	}
	@keyframes coin-bob {
		0%,
		100% {
			transform: translateX(-50%) translateY(0);
		}
		50% {
			transform: translateX(-50%) translateY(-8px);
		}
	}
	@keyframes group-vanish {
		0% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

	/* ---- Numpad floater ---- */
	.pad-floater {
		position: absolute;
		left: 0;
		right: 0;
		bottom: var(--space-3);
		display: flex;
		justify-content: center;
		z-index: 30;
		padding: 0 var(--space-3);
	}
	.pad-floater :global(.pad) {
		max-width: 320px;
	}
	.pad-floater :global(.key) {
		background: rgba(15, 23, 42, 0.78) !important;
		backdrop-filter: blur(8px);
	}
	.pad-floater :global(.key.ok) {
		background: var(--color-primary-500) !important;
	}

	/* ---- Win burst (subtle radial flash, no confetti) ---- */
	.win-burst {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 80;
		background: radial-gradient(
			circle at 50% 60%,
			rgba(250, 204, 21, 0.5) 0%,
			rgba(250, 204, 21, 0.2) 30%,
			transparent 70%
		);
		animation: win-flash 1.2s ease-out;
	}
	@keyframes win-flash {
		0% {
			opacity: 0;
			transform: scale(0.4);
		}
		35% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(1.4);
		}
	}
	.lose-veil {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 80;
		background: radial-gradient(circle at center, transparent 20%, rgba(120, 0, 0, 0.7) 90%);
		animation: lose-pulse 1.3s ease-in;
	}
	@keyframes lose-pulse {
		0% {
			opacity: 0;
		}
		25% {
			opacity: 1;
		}
		100% {
			opacity: 0.95;
		}
	}
</style>
