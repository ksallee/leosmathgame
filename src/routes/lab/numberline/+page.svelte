<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		DEFAULT_NUMBERLINE,
		generateQuestion,
		sampleHop,
		hopComplete,
		makeRngFromSeed,
		resolveHopDynamics,
		NUMBER_LINE_BANDS,
		bandConfig,
		computeTickSpacing,
		NUMBERLINE_THEMES,
		type NumberLineConfig,
		type NumberLineQuestion,
		type HopState,
		type QuestionKind,
		type NumberlineTheme
	} from '$lib/games/numberline';
	import { HEROES } from '$lib/sprites/manifest';
	import Sprite from '$lib/components/sprites/Sprite.svelte';

	const STORAGE_CONFIG = 'lab.numberline.config';
	const STORAGE_HERO = 'lab.numberline.hero';
	const STORAGE_BAND = 'lab.numberline.band';
	const STORAGE_THEME = 'lab.numberline.theme';
	const STORAGE_AUTO_SPACING = 'lab.numberline.autoSpacing';

	const HERO_IDS = Object.keys(HEROES);
	const THEME_IDS: NumberlineTheme[] = ['forest', 'desert', 'cave', 'snow', 'pirate'];

	let config: NumberLineConfig = $state({ ...DEFAULT_NUMBERLINE });
	let heroId = $state('ninja_frog');
	let bandIdx = $state(2); // band 2 (0-10) — single-digit single-digit
	let themeId: NumberlineTheme = $state('forest');
	let autoSpacing = $state(true);
	let availableWidth = $state(900);
	const heroChar = $derived(HEROES[heroId] ?? HEROES.ninja_frog);
	const band = $derived(bandConfig(bandIdx));
	const theme = $derived(NUMBERLINE_THEMES[themeId]);

	// When auto-spacing is on, derive tickSpacing from container width + tick
	// count. Below the min, the line scrolls horizontally. The lab exposes
	// the manual override via the existing slider.
	const sizing = $derived(
		computeTickSpacing(config.rangeMax - config.rangeMin + 1, availableWidth)
	);
	const manualSpacing = $derived(config.tickSpacing);
	const effectiveSpacing = $derived(autoSpacing ? sizing.spacing : manualSpacing);

	let seed = 1;
	let question: NumberLineQuestion = $state(
		generateQuestion(
			DEFAULT_NUMBERLINE.questionKind,
			DEFAULT_NUMBERLINE.rangeMax,
			makeRngFromSeed(seed)
		)
	);
	let heroTick = $state(0);
	let hop: HopState | null = $state(null);
	let heroYOffset = $state(0);
	let heroFacing: 1 | -1 = $state(1);
	let heroAnim: 'idle' | 'jump' | 'fall' = $state('idle');
	let now = $state(performance.now());

	// Reveal/answer state machine
	type Phase = 'idle' | 'hopping' | 'wrong_pause' | 'reveal_sweep' | 'reveal_hop' | 'done';
	let phase = $state<Phase>('idle');
	let result: 'correct' | 'wrong' | null = $state(null);
	let phaseEnteredAt = 0;
	let sweepFromTick = 0;
	let sweepToTick = 0;
	/** Ticks that have been visually highlighted during the current hop or
	 *  reveal sweep. Cleared on next question / new hop start. */
	let highlightedTicks: number[] = $state([]);
	const REVEAL_PAUSE_MS = 300; // hold on wrong landing before sweep starts
	const SWEEP_PER_TICK_MS = 90; // one tick lights up every 90ms during sweep

	let activeArc = $state(0);
	let activeDuration = $state(0);

	let rafId: number | null = null;
	let lineWrapEl: HTMLDivElement | undefined;
	let roCleanup: (() => void) | null = null;

	onMount(() => {
		const savedC = localStorage.getItem(STORAGE_CONFIG);
		if (savedC) {
			try {
				config = { ...DEFAULT_NUMBERLINE, ...JSON.parse(savedC) };
			} catch {
				/* defaults */
			}
		}
		const savedH = localStorage.getItem(STORAGE_HERO);
		if (savedH && HERO_IDS.includes(savedH)) heroId = savedH;
		const savedB = Number(localStorage.getItem(STORAGE_BAND));
		if (Number.isFinite(savedB) && savedB >= 1 && savedB <= NUMBER_LINE_BANDS.length)
			bandIdx = savedB;
		const savedTheme = localStorage.getItem(STORAGE_THEME);
		if (savedTheme && (THEME_IDS as string[]).includes(savedTheme)) {
			themeId = savedTheme as NumberlineTheme;
		}
		const savedAutoS = localStorage.getItem(STORAGE_AUTO_SPACING);
		if (savedAutoS !== null) autoSpacing = savedAutoS === 'true';
		applyBandToConfig();
		nextQuestion();
		loop();

		// Track container width for auto-spacing.
		if (lineWrapEl) {
			const ro = new ResizeObserver(() => {
				if (lineWrapEl) availableWidth = lineWrapEl.clientWidth - 80; // minus padding
			});
			ro.observe(lineWrapEl);
			roCleanup = () => ro.disconnect();
		}
	});

	onDestroy(() => {
		if (rafId !== null) cancelAnimationFrame(rafId);
		if (roCleanup) roCleanup();
	});

	$effect(() => {
		localStorage.setItem(STORAGE_CONFIG, JSON.stringify(config));
	});
	$effect(() => {
		localStorage.setItem(STORAGE_HERO, heroId);
	});
	$effect(() => {
		localStorage.setItem(STORAGE_BAND, String(bandIdx));
	});
	$effect(() => {
		localStorage.setItem(STORAGE_THEME, themeId);
	});
	$effect(() => {
		localStorage.setItem(STORAGE_AUTO_SPACING, String(autoSpacing));
	});

	function applyBandToConfig() {
		const b = bandConfig(bandIdx);
		config.rangeMin = b.rangeMin;
		config.rangeMax = b.rangeMax;
		config.labelEvery = b.labelEvery;
	}

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

				// Counting-tick highlight: as hero passes over each integer tick
				// between fromTick and toTick (exclusive of fromTick, inclusive
				// of toTick), light it up. Visualizes "1, 2, 3, 4 steps".
				// Only during user-initiated hops — the corrective reveal_hop
				// shouldn't add to the trail because the sweep already shows
				// the correct path.
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
						// reveal_hop completed → done
						setPhase('done');
					}
				}
			}
		} else if (phase === 'wrong_pause') {
			if (now - phaseEnteredAt >= REVEAL_PAUSE_MS) {
				// Begin reveal sweep from the QUESTION's start tick → correct
				// answer. This shows the kid "here's how you should have
				// counted from your starting position", not "here's the path
				// from where you mistakenly landed". The hero is still on the
				// wrong tick; the corrective hop after the sweep sends them
				// to the right answer.
				sweepFromTick = question.startTick;
				sweepToTick = question.targetTick;
				highlightedTicks = [];
				setPhase('reveal_sweep');
			}
		} else if (phase === 'reveal_sweep') {
			// Light up ticks one-by-one between sweepFromTick and sweepToTick.
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
				// Sweep complete — corrective hop from wrong landing → correct.
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

	function nextQuestion() {
		seed = (seed * 1664525 + 1013904223) >>> 0 || 1;
		applyBandToConfig();
		question = generateQuestion(config.questionKind, config.rangeMax, makeRngFromSeed(seed), {
			targetMin: band.targetMin,
			targetMax: band.targetMax
		});
		heroTick = question.startTick;
		heroYOffset = 0;
		heroAnim = 'idle';
		hop = null;
		result = null;
		highlightedTicks = [];
		setPhase('idle');
	}

	function copyConfig() {
		navigator.clipboard.writeText(
			JSON.stringify({ character: heroId, band: bandIdx, numberLine: config }, null, 2)
		);
	}

	const lineWidth = $derived((config.rangeMax - config.rangeMin) * effectiveSpacing);

	// Tap zones extend this far below line-area's bottom so they cover the
	// area between the number labels and the ground — bigger hit area
	// without growing line-area itself (which would push the scene flex
	// taller and shift the ground band down with it).
	const TAP_ZONE_OVERFLOW = 80;
	const ticks = $derived(
		Array.from({ length: config.rangeMax - config.rangeMin + 1 }, (_, i) => config.rangeMin + i)
	);
	const heroPx = $derived((heroTick - config.rangeMin) * effectiveSpacing);
	const interactive = $derived(phase === 'idle' || phase === 'done');

	// Reveal the answer in the prompt only when the hero is settled on the
	// correct tick — for a correct hop that's immediate (phase → done on
	// landing); for a wrong hop that's after the corrective hop completes,
	// not at the start of the sweep. Don't spoil the answer before the hero
	// physically arrives.
	const showAnswer = $derived(phase === 'done');
	const displayedPrompt = $derived(
		showAnswer ? question.prompt.replace('?', String(question.targetTick)) : question.prompt
	);
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
		<h1>Number-line jump tune</h1>
		<p class="hint">
			Tap a tick to send the hero hopping. Tweak the band, character, and visual knobs live.
			Wrong-answer reveal sweeps the corrective ticks then hops to the right answer (per
			docs/research/numberline-design.md).
		</p>
	</header>

	<div class="layout">
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
					style:top={p.top ?? 'auto'}
					style:bottom={p.bottom ?? 'auto'}
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
				<button class="next" onclick={nextQuestion}>Next ▶</button>
			</div>

			<div
				class="line-wrap"
				bind:this={lineWrapEl}
				style:padding-left="{40}px"
				style:padding-right="{40}px"
				style:overflow-x={sizing.needsScroll ? 'auto' : 'visible'}
			>
				<div
					class="line-area"
					style:width="{lineWidth}px"
					style:height="{config.arcHeight + config.heroHeight + 80}px"
				>
					<div class="line" style:bottom="{40}px" style:width="{lineWidth}px"></div>

					{#each ticks as t (t)}
						{@const x = (t - config.rangeMin) * effectiveSpacing}
						{@const lit = highlightedTicks.includes(t)}
						{@const showStepLabel = lit && t !== question.startTick && band.labelEvery === 1}
						<div class="tick" class:lit style:left="{x}px" style:bottom="{32}px"></div>
						{#if t % config.labelEvery === 0}
							<div class="tick-label" class:lit style:left="{x}px" style:bottom="0px">
								{t}
							</div>
						{/if}
						{#if showStepLabel}
							<!-- Step counter: visualizes the operation as a count of jumps
								 (1, 2, 3, ...) from the question's starting tick. Per the
								 concreteness-fading principle (Fyfe et al. 2014) this scaffold
								 only shows on labeled-every-tick bands (B1-B5); B6+ rely on the
								 absolute labels alone. -->
							<div class="step-label" style:left="{x}px" style:bottom="{config.heroHeight + 50}px">
								{Math.abs(t - question.startTick)}
							</div>
						{/if}
						<button
							class="tap-zone"
							class:disabled={!interactive}
							style:left="{x - effectiveSpacing / 2}px"
							style:bottom="-{TAP_ZONE_OVERFLOW}px"
							style:width="{effectiveSpacing}px"
							style:height="{config.arcHeight + config.heroHeight + 80 + TAP_ZONE_OVERFLOW}px"
							onclick={() => startHop(t)}
							aria-label="Tick {t}"
						></button>
					{/each}

					<div class="hero-wrap" style:left="{heroPx}px" style:bottom="{40 + heroYOffset}px">
						<Sprite
							character={heroChar}
							state={heroAnim}
							height={config.heroHeight}
							flip={heroFacing === -1}
						/>
					</div>
				</div>
			</div>
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
			<div class="row">
				<label for="kind-pick">Question kind</label>
				<select
					id="kind-pick"
					value={config.questionKind}
					onchange={(e) => {
						config.questionKind = (e.target as HTMLSelectElement).value as QuestionKind;
						nextQuestion();
					}}
				>
					<option value="add">Addition</option>
					<option value="sub">Subtraction</option>
				</select>
			</div>
			<div class="row">
				<label for="band-pick">Band</label>
				<select
					id="band-pick"
					value={bandIdx}
					onchange={(e) => {
						bandIdx = Number((e.target as HTMLSelectElement).value);
						applyBandToConfig();
						nextQuestion();
					}}
				>
					{#each NUMBER_LINE_BANDS as b (b.band)}
						<option value={b.band}>B{b.band} — {b.description}</option>
					{/each}
				</select>
			</div>
			<div class="row">
				<label for="theme-pick">World theme</label>
				<select
					id="theme-pick"
					value={themeId}
					onchange={(e) => (themeId = (e.target as HTMLSelectElement).value as NumberlineTheme)}
				>
					{#each THEME_IDS as id (id)}
						<option value={id}>{id}</option>
					{/each}
				</select>
			</div>

			<fieldset>
				<legend>Visual</legend>
				<label class="toggle">
					<input type="checkbox" bind:checked={autoSpacing} />
					Auto-fit tick spacing to width ({sizing.needsScroll ? 'scroll' : 'fit'},
					{effectiveSpacing.toFixed(0)}px)
				</label>
				{#if !autoSpacing}
					{@render slider(
						'Tick spacing (px)',
						() => config.tickSpacing,
						(v) => (config.tickSpacing = v),
						24,
						120,
						2
					)}
				{/if}
				{@render slider(
					'Hero height (px)',
					() => config.heroHeight,
					(v) => (config.heroHeight = v),
					20,
					150,
					2
				)}
			</fieldset>

			<fieldset>
				<legend>Hop</legend>
				<label class="toggle">
					<input type="checkbox" bind:checked={config.autoScale} />
					Auto-scale arc + duration with jump distance
				</label>
				{#if config.autoScale}
					<p class="readout">
						Last jump: arc {activeArc.toFixed(0)}px, dur {activeDuration.toFixed(0)}ms
					</p>
				{:else}
					{@render slider(
						'Arc height (px)',
						() => config.arcHeight,
						(v) => (config.arcHeight = v),
						20,
						300,
						5
					)}
					{@render slider(
						'Hop duration (ms)',
						() => config.hopDurationMs,
						(v) => (config.hopDurationMs = v),
						150,
						1500,
						50
					)}
				{/if}
			</fieldset>

			<div class="actions">
				<button class="primary" onclick={copyConfig}>Copy Config</button>
				<button onclick={() => (config = { ...DEFAULT_NUMBERLINE })}>Reset Defaults</button>
			</div>

			<details class="json">
				<summary>Current config (JSON)</summary>
				<pre>{JSON.stringify(
						{ character: heroId, band: bandIdx, numberLine: config },
						null,
						2
					)}</pre>
			</details>

			<details class="json">
				<summary>Current question</summary>
				<pre>{JSON.stringify(question, null, 2)}</pre>
			</details>
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
		grid-template-columns: minmax(0, 1fr) 360px;
		gap: var(--space-4);
		align-items: start;
	}
	@media (max-width: 1280px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}

	.scene {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		/* background gradient is applied inline from the theme */
		border-radius: var(--radius-lg);
		border: 1px solid rgba(255, 255, 255, 0.08);
		min-height: 480px;
		overflow: hidden;
	}
	.ground {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		/* Thin band — the line sits just above this. Bigger heights bleed
		   above the line and make it look "sunk into" the ground. */
		height: 12%;
		z-index: 0;
		pointer-events: none;
	}
	.prop {
		position: absolute;
		image-rendering: pixelated;
		/* Hazy / background look (matches the facts game's bg-prop) — pulled
		   back so the props don't compete with the line + hero. */
		opacity: 0.7;
		filter: saturate(0.85) brightness(0.9) drop-shadow(0 6px 10px rgba(0, 0, 0, 0.4));
		pointer-events: none;
		max-width: 120px;
		max-height: 200px;
		width: auto;
		height: auto;
		z-index: 1;
		/* Anchor the scale at the BASE so the prop's bottom stays planted on
		   the ground band — without this, scale > 1 grows equally up + down
		   and the props float above the ground. */
		transform-origin: 50% 100%;
	}
	.prompt-row,
	.line-wrap {
		position: relative;
		z-index: 2;
	}
	.prompt-row {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}
	.prompt {
		font: var(--font-w-bold) clamp(28px, 4vw, 48px) / 1 var(--font-display);
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
	.next {
		margin-left: auto;
		padding: 8px 16px;
		background: var(--color-primary-500);
		color: var(--color-bg-900);
		border: none;
		border-radius: var(--radius-pill);
		font-weight: var(--font-w-bold);
		cursor: pointer;
	}

	.line-wrap {
		overflow-x: auto;
		overflow-y: visible;
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
		height: 14px;
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
		font: var(--font-w-bold) var(--text-base) / 1 var(--font-display);
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
		padding: 2px 10px;
		font: var(--font-w-bold) var(--text-sm) / 1 var(--font-display);
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
		gap: var(--space-2);
	}
	.row label {
		color: var(--text-muted);
		flex-shrink: 0;
	}
	select {
		background: rgba(15, 23, 42, 0.9);
		color: var(--text-primary);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: var(--radius-md);
		padding: 6px 10px;
		font-size: var(--text-sm);
		max-width: 220px;
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
	.toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
		color: var(--text-primary);
		font-size: var(--text-sm);
	}
	.readout {
		margin: 4px 0 0;
		padding: 6px 10px;
		background: rgba(56, 189, 248, 0.1);
		border-left: 2px solid rgba(56, 189, 248, 0.6);
		color: var(--color-fg-50);
		font-family: ui-monospace, monospace;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	.actions {
		display: flex;
		gap: var(--space-2);
	}
	.actions button {
		flex: 1;
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
