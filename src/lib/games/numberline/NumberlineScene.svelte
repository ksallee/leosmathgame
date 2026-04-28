<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		generateQuestion,
		sampleHop,
		hopComplete,
		makeRngFromSeed,
		resolveHopDynamics,
		computeTickSpacing,
		type NumberLineConfig,
		type NumberLineQuestion,
		type HopState,
		type QuestionKind,
		type NumberLineBand,
		type NumberlineThemeStyle
	} from '$lib/games/numberline';
	import type { CharacterManifest } from '$lib/sprites/manifest';
	import Sprite from '$lib/components/sprites/Sprite.svelte';

	interface Props {
		band: NumberLineBand;
		theme: NumberlineThemeStyle;
		character: CharacterManifest;
		questionKind: QuestionKind;
		/** Bump to generate a new question deterministically. */
		questionSeed: number;
		heroHeight?: number;
		/** Called once when the question's outcome is fully resolved (after
		 *  hop landing for correct, after reveal sweep + corrective hop for
		 *  wrong). Fires exactly once per questionSeed. */
		onComplete: (correct: boolean) => void;
	}

	let {
		band,
		theme,
		character,
		questionKind,
		questionSeed,
		heroHeight = 66,
		onComplete
	}: Props = $props();

	let lineWrapEl: HTMLDivElement | undefined;
	let availableWidth = $state(900);
	let roCleanup: (() => void) | null = null;

	// Tick spacing auto-fits the container; fallback when measurement isn't
	// available yet (first paint).
	const sizing = $derived(computeTickSpacing(band.rangeMax - band.rangeMin + 1, availableWidth));
	const effectiveSpacing = $derived(sizing.spacing);

	// Visual config — only the visual knobs are exposed; the curriculum/
	// scoring config is the parent's job.
	const config: NumberLineConfig = $derived({
		rangeMin: band.rangeMin,
		rangeMax: band.rangeMax,
		tickSpacing: effectiveSpacing,
		labelEvery: band.labelEvery,
		autoScale: true,
		arcHeight: 100,
		hopDurationMs: 550,
		heroHeight,
		questionKind
	});

	// Question is derived from props so it auto-updates when band/kind/seed
	// change. The reset $effect below mirrors heroTick + state machine to
	// the new question.
	const question: NumberLineQuestion = $derived(
		generateQuestion(questionKind, band.rangeMax, makeRngFromSeed(questionSeed || 1), {
			targetMin: band.targetMin,
			targetMax: band.targetMax
		})
	);
	let heroTick = $state(0);
	let hop: HopState | null = $state(null);
	let heroYOffset = $state(0);
	let heroFacing: 1 | -1 = $state(1);
	let heroAnim: 'idle' | 'jump' | 'fall' = $state('idle');
	let now = $state(performance.now());

	type Phase = 'idle' | 'hopping' | 'wrong_pause' | 'reveal_sweep' | 'reveal_hop' | 'done';
	let phase = $state<Phase>('idle');
	let result: 'correct' | 'wrong' | null = $state(null);
	let phaseEnteredAt = 0;
	let sweepFromTick = 0;
	let sweepToTick = 0;
	let highlightedTicks: number[] = $state([]);
	let activeArc = 0;
	let activeDuration = 0;
	let completionFired = false;

	const REVEAL_PAUSE_MS = 300;
	const SWEEP_PER_TICK_MS = 90;
	const TAP_ZONE_OVERFLOW = 80;

	let rafId: number | null = null;

	onMount(() => {
		if (lineWrapEl) {
			const ro = new ResizeObserver(() => {
				if (lineWrapEl) availableWidth = lineWrapEl.clientWidth - 80;
			});
			ro.observe(lineWrapEl);
			roCleanup = () => ro.disconnect();
		}
		loop();
	});

	onDestroy(() => {
		if (rafId !== null) cancelAnimationFrame(rafId);
		if (roCleanup) roCleanup();
	});

	// Reset only when the seed/kind ACTUALLY changes — the `question` signal
	// can re-fire spuriously when ancestor reactives notify (e.g., parent
	// mutates profile.mastery during finishLevel). Without this guard the
	// hero "snaps back" to startTick after a winning hop.
	let lastSeenSeed = -1;
	let lastSeenKind: QuestionKind | null = null;
	$effect(() => {
		const seed = questionSeed;
		const kind = questionKind;
		if (seed === lastSeenSeed && kind === lastSeenKind) return;
		lastSeenSeed = seed;
		lastSeenKind = kind;
		const q = question;
		heroTick = q.startTick;
		heroYOffset = 0;
		heroFacing = 1;
		heroAnim = 'idle';
		hop = null;
		result = null;
		highlightedTicks = [];
		completionFired = false;
		setPhase('idle');
	});

	// Fire onComplete exactly once when the question resolves.
	$effect(() => {
		if (phase === 'done' && !completionFired) {
			completionFired = true;
			onComplete(result === 'correct');
		}
	});

	function setPhase(next: Phase) {
		phase = next;
		phaseEnteredAt = performance.now();
	}

	function loop() {
		now = performance.now();

		if (phase === 'hopping' || phase === 'reveal_hop') {
			if (hop) {
				const f = sampleHop(hop, activeArc, now);
				heroTick = f.tick;
				heroYOffset = f.yOffset;
				heroFacing = f.facing;
				heroAnim = f.progress < 0.5 ? 'jump' : 'fall';

				if (phase === 'hopping') {
					const direction = hop.toTick > hop.fromTick ? 1 : -1;
					const minB = Math.min(hop.fromTick, hop.toTick);
					const maxB = Math.max(hop.fromTick, hop.toTick);
					for (let t = Math.ceil(minB); t <= Math.floor(maxB); t++) {
						if (t === hop.fromTick) continue;
						const passed = direction > 0 ? heroTick >= t : heroTick <= t;
						if (passed && !highlightedTicks.includes(t)) {
							highlightedTicks = [...highlightedTicks, t];
						}
					}
				}

				if (hopComplete(hop, now)) {
					heroTick = hop.toTick;
					heroYOffset = 0;
					heroAnim = 'idle';
					const correct = hop.toTick === question.targetTick;
					hop = null;
					if (phase === 'hopping') {
						result = correct ? 'correct' : 'wrong';
						if (correct) {
							setPhase('done');
						} else {
							setPhase('wrong_pause');
						}
					} else {
						setPhase('done');
					}
				}
			}
		} else if (phase === 'wrong_pause') {
			if (now - phaseEnteredAt >= REVEAL_PAUSE_MS) {
				sweepFromTick = question.startTick;
				sweepToTick = question.targetTick;
				highlightedTicks = [];
				setPhase('reveal_sweep');
			}
		} else if (phase === 'reveal_sweep') {
			const elapsed = now - phaseEnteredAt;
			const direction = sweepToTick > sweepFromTick ? 1 : -1;
			const totalSteps = Math.abs(sweepToTick - sweepFromTick);
			const stepIdx = Math.min(totalSteps, Math.floor(elapsed / SWEEP_PER_TICK_MS));
			for (let i = 1; i <= stepIdx; i++) {
				const t = sweepFromTick + i * direction;
				if (!highlightedTicks.includes(t)) {
					highlightedTicks = [...highlightedTicks, t];
				}
			}
			if (stepIdx >= totalSteps) {
				if (heroTick === question.targetTick) {
					setPhase('done');
				} else {
					const dyn = resolveHopDynamics(config, question.targetTick - heroTick);
					activeArc = dyn.arcHeight;
					activeDuration = dyn.durationMs;
					hop = {
						fromTick: heroTick,
						toTick: question.targetTick,
						startedAt: performance.now(),
						durationMs: activeDuration
					};
					setPhase('reveal_hop');
				}
			}
		}
		rafId = requestAnimationFrame(loop);
	}

	function startHop(toTick: number) {
		if (phase !== 'idle' && phase !== 'done') return;
		if (toTick === heroTick) return;
		result = null;
		highlightedTicks = [];
		const dyn = resolveHopDynamics(config, toTick - heroTick);
		activeArc = dyn.arcHeight;
		activeDuration = dyn.durationMs;
		hop = {
			fromTick: heroTick,
			toTick,
			startedAt: performance.now(),
			durationMs: activeDuration
		};
		setPhase('hopping');
	}

	const lineWidth = $derived((band.rangeMax - band.rangeMin) * effectiveSpacing);
	const ticks = $derived(
		Array.from({ length: band.rangeMax - band.rangeMin + 1 }, (_, i) => band.rangeMin + i)
	);
	const heroPx = $derived((heroTick - band.rangeMin) * effectiveSpacing);
	const interactive = $derived(phase === 'idle');

	const showAnswer = $derived(phase === 'done');
	const displayedPrompt = $derived(
		showAnswer ? question.prompt.replace('?', String(question.targetTick)) : question.prompt
	);
</script>

<div
	class="scene"
	style:background={theme.bgGradient}
	style:--line-bg={theme.lineGradient}
	style:--line-glow={theme.lineGlow}
	style:--tick-color={theme.tickColor}
	style:--label-color={theme.labelColor}
	style:--hover-fill={theme.hoverFill}
	style:--hover-border={theme.hoverBorder}
>
	{#if theme.groundGradient}
		<div class="ground" style:background={theme.groundGradient}></div>
	{/if}
	{#each theme.props as p, i (i)}
		<img
			class="prop"
			src={p.src}
			alt=""
			draggable="false"
			style:left={p.left}
			style:top={p.top}
			style:bottom={p.top ? 'auto' : (p.bottom ?? null)}
			style:transform="translate(-50%, 0) scale({p.scale})"
			style:opacity={p.opacity}
			style:z-index={p.zIndex ?? 1}
		/>
	{/each}

	<div class="prompt-row">
		<div class="prompt">
			{displayedPrompt}
		</div>
		{#if result === 'correct'}
			<div class="badge ok">✓</div>
		{:else if result === 'wrong'}
			<div class="badge ko">×</div>
		{/if}
	</div>

	<div
		class="line-wrap"
		bind:this={lineWrapEl}
		style:overflow-x={sizing.needsScroll ? 'auto' : 'visible'}
	>
		<div
			class="line-area"
			style:width="{lineWidth}px"
			style:height="{config.arcHeight + heroHeight + 80}px"
		>
			<div class="line" style:bottom="40px" style:width="{lineWidth}px"></div>

			{#each ticks as t (t)}
				{@const x = (t - band.rangeMin) * effectiveSpacing}
				{@const lit = highlightedTicks.includes(t)}
				{@const showStepLabel = lit && t !== question.startTick && band.labelEvery === 1}
				<div class="tick" class:lit style:left="{x}px" style:bottom="32px"></div>
				{#if t % config.labelEvery === 0}
					<div class="tick-label" class:lit style:left="{x}px" style:bottom="0px">
						{t}
					</div>
				{/if}
				{#if showStepLabel}
					<div class="step-label" style:left="{x}px" style:bottom="{heroHeight + 50}px">
						{Math.abs(t - question.startTick)}
					</div>
				{/if}
				<button
					class="tap-zone"
					class:disabled={!interactive}
					style:left="{x - effectiveSpacing / 2}px"
					style:bottom="-{TAP_ZONE_OVERFLOW}px"
					style:width="{effectiveSpacing}px"
					style:height="{Math.round((config.arcHeight + heroHeight + 80) * 1.5) +
						TAP_ZONE_OVERFLOW}px"
					onclick={() => startHop(t)}
					aria-label="Tick {t}"
				></button>
			{/each}

			<div class="hero-wrap" style:left="{heroPx}px" style:bottom="{40 + heroYOffset}px">
				<Sprite {character} state={heroAnim} height={heroHeight} flip={heroFacing === -1} />
			</div>
		</div>
	</div>
</div>

<style>
	.scene {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		border-radius: var(--radius-lg);
		border: 1px solid rgba(255, 255, 255, 0.08);
		min-height: 480px;
		overflow: hidden;
		/* Single source of truth for ground band height — both the .ground
		   element AND the line-wrap padding read from this so the line
		   always sits ABOVE the ground top. Override per-route by setting
		   --ground-height on .scene's parent. Default 80px works for most
		   container sizes. */
		--ground-height: 150px;
	}
	.ground {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: var(--ground-height);
		z-index: 0;
		pointer-events: none;
	}
	.prop {
		position: absolute;
		image-rendering: pixelated;
		opacity: 0.7;
		filter: saturate(0.85) brightness(0.9) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.4));
		pointer-events: none;
		max-width: 120px;
		max-height: 200px;
		width: auto;
		height: auto;
		z-index: 1;
		transform-origin: 50% 100%;
		/* Default ground anchor — props sit ON the ground top. Theme entries
		   override `bottom` inline if they want a different position (e.g.
		   clouds use `top` instead). */
		bottom: var(--ground-height);
	}
	.prompt-row {
		position: relative;
		z-index: 2;
		display: flex;
		gap: var(--space-3);
		align-items: center;
		justify-content: center;
	}
	.prompt {
		font: var(--font-w-bold) clamp(72px, 8vw, 102px) / 1 var(--font-display);
		color: var(--color-fg-50);
		padding: var(--space-2) var(--space-4);
		background: rgba(15, 23, 42, 0.8);
		border-radius: var(--radius-lg);
		font-variant-numeric: tabular-nums;
	}
	.badge {
		font: var(--font-w-bold) clamp(28px, 4vw, 48px) / 1 var(--font-display);
		padding: 4px 16px;
		border-radius: var(--radius-pill);
		animation: badge-pop 0.3s var(--ease-bounce);
	}
	.badge.ok {
		background: rgba(34, 197, 94, 0.25);
		color: #4ade80;
	}
	.badge.ko {
		background: rgba(239, 68, 68, 0.25);
		color: #ef4444;
	}
	@keyframes badge-pop {
		from {
			transform: scale(0.5);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.line-wrap {
		position: relative;
		z-index: 2;
		flex: 1;
		display: flex;
		align-items: flex-end;
		padding: 0 40px calc(var(--ground-height) - 56px) 40px;
	}
	.line-area {
		position: relative;
		margin: 0 auto;
	}
	.line {
		position: absolute;
		left: 0;
		height: 4px;
		background: var(--line-bg);
		border-radius: 2px;
		box-shadow: 0 0 8px var(--line-glow);
	}
	.tick {
		position: absolute;
		width: 3px;
		/* Bumped 14 → 21 (50% taller) so ticks read clearly against the
		   jump arc and don't feel undersized. */
		height: 21px;
		margin-left: -1.5px;
		background: var(--tick-color);
		transition: background var(--motion-fast) var(--ease-out);
	}
	.tick.lit {
		background: #22c55e;
		box-shadow: 0 0 14px rgba(34, 197, 94, 0.85);
	}
	.tick-label {
		position: absolute;
		transform: translateX(-50%);
		font: var(--font-w-bold) var(--text-lg) / 1 var(--font-display);
		color: var(--label-color);
		font-variant-numeric: tabular-nums;
		transition:
			color var(--motion-fast) var(--ease-out),
			transform var(--motion-fast) var(--ease-out);
	}
	.tick-label.lit {
		color: #22c55e;
		transform: translateX(-50%) scale(1.25);
		text-shadow: 0 0 12px rgba(34, 197, 94, 0.85);
	}
	.step-label {
		position: absolute;
		transform: translateX(-50%);
		padding: 4px 12px;
		font: var(--font-w-bold) var(--text-base) / 1 var(--font-display);
		color: #ecfdf5;
		background: linear-gradient(180deg, #22c55e 0%, #15803d 100%);
		border-radius: var(--radius-pill);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.3),
			0 0 14px rgba(34, 197, 94, 0.5),
			0 2px 4px rgba(0, 0, 0, 0.4);
		font-variant-numeric: tabular-nums;
		animation: step-pop 0.25s var(--ease-bounce);
	}
	@keyframes step-pop {
		from {
			transform: translateX(-50%) scale(0.4);
			opacity: 0;
		}
		to {
			transform: translateX(-50%) scale(1);
			opacity: 1;
		}
	}
	.tap-zone {
		position: absolute;
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.08);
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
	.tap-zone:hover {
		background: var(--hover-fill);
		border-color: var(--hover-border);
	}
	.tap-zone.disabled {
		cursor: default;
		pointer-events: none;
	}
	.hero-wrap {
		position: absolute;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		transform: translateX(-50%);
		pointer-events: none;
	}
</style>
