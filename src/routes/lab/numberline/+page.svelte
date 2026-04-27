<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		DEFAULT_NUMBERLINE,
		generateQuestion,
		sampleHop,
		hopComplete,
		makeRngFromSeed,
		resolveHopDynamics,
		type NumberLineConfig,
		type NumberLineQuestion,
		type HopState,
		type QuestionKind
	} from '$lib/lab/numberline';
	import { HEROES } from '$lib/sprites/manifest';
	import Sprite from '$lib/components/sprites/Sprite.svelte';

	const STORAGE_CONFIG = 'lab.numberline.config';
	const STORAGE_HERO = 'lab.numberline.hero';

	const HERO_IDS = Object.keys(HEROES);

	let config: NumberLineConfig = $state({ ...DEFAULT_NUMBERLINE });
	let heroId = $state('ninja_frog');
	const heroChar = $derived(HEROES[heroId] ?? HEROES.ninja_frog);

	let seed = 1;
	let question: NumberLineQuestion = $state(
		generateQuestion(
			DEFAULT_NUMBERLINE.questionKind,
			DEFAULT_NUMBERLINE.rangeMax,
			makeRngFromSeed(seed)
		)
	);
	// heroTick gets re-set inside nextQuestion() / hop completion, so the
	// initializer just needs a placeholder integer rather than referencing
	// the reactive `question`.
	let heroTick = $state(0);
	let hop: HopState | null = $state(null);
	let heroYOffset = $state(0);
	let heroFacing: 1 | -1 = $state(1);
	let result: 'correct' | 'wrong' | null = $state(null);
	let resultClearAt = 0;
	let now = $state(performance.now());

	let rafId: number | null = null;

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
		// Generate first question with the (possibly loaded) config kind/range
		nextQuestion();
		loop();
	});

	onDestroy(() => {
		if (rafId !== null) cancelAnimationFrame(rafId);
	});

	$effect(() => {
		localStorage.setItem(STORAGE_CONFIG, JSON.stringify(config));
	});
	$effect(() => {
		localStorage.setItem(STORAGE_HERO, heroId);
	});

	// Active hop's dynamics (arc + duration). Resolved at startHop time so
	// the loop can use them without re-resolving each frame; $state so the
	// "Last jump" readout in the panel updates after each hop.
	let activeArc = $state(0);
	let activeDuration = $state(0);

	function loop() {
		now = performance.now();
		if (hop) {
			const f = sampleHop(hop, activeArc, now);
			heroTick = f.tick;
			heroYOffset = f.yOffset;
			heroFacing = f.facing;
			if (hopComplete(hop, now)) {
				heroTick = hop.toTick;
				heroYOffset = 0;
				const correct = hop.toTick === question.targetTick;
				result = correct ? 'correct' : 'wrong';
				resultClearAt = now + 1200;
				hop = null;
			}
		}
		if (result && now > resultClearAt) {
			result = null;
		}
		rafId = requestAnimationFrame(loop);
	}

	function startHop(toTick: number) {
		if (hop) return;
		if (toTick === heroTick) return;
		result = null;
		const dyn = resolveHopDynamics(config, toTick - heroTick);
		activeArc = dyn.arcHeight;
		activeDuration = dyn.durationMs;
		hop = {
			fromTick: heroTick,
			toTick,
			startedAt: performance.now(),
			durationMs: activeDuration
		};
	}

	function nextQuestion() {
		seed = (seed * 1664525 + 1013904223) >>> 0 || 1;
		question = generateQuestion(config.questionKind, config.rangeMax, makeRngFromSeed(seed));
		heroTick = question.startTick;
		heroYOffset = 0;
		hop = null;
		result = null;
	}

	function copyConfig() {
		navigator.clipboard.writeText(
			JSON.stringify({ character: heroId, numberLine: config }, null, 2)
		);
	}

	const lineWidth = $derived((config.rangeMax - config.rangeMin) * config.tickSpacing);
	const ticks = $derived(
		Array.from({ length: config.rangeMax - config.rangeMin + 1 }, (_, i) => config.rangeMin + i)
	);
	const heroPx = $derived((heroTick - config.rangeMin) * config.tickSpacing);
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
			Tap a tick to send the hero hopping. Tweak range, tick spacing, arc, and hop speed live. <strong
				>Copy Config</strong
			> when it feels right.
		</p>
	</header>

	<div class="layout">
		<div class="scene">
			<div class="prompt-row">
				<div class="prompt">
					{question.prompt}
				</div>
				{#if result === 'correct'}
					<div class="badge ok">✓</div>
				{:else if result === 'wrong'}
					<div class="badge ko">×</div>
				{/if}
				<button class="next" onclick={nextQuestion}>Next ▶</button>
			</div>

			<div class="line-wrap" style:padding-left="{40}px" style:padding-right="{40}px">
				<div
					class="line-area"
					style:width="{lineWidth}px"
					style:height="{config.arcHeight + config.heroHeight + 80}px"
				>
					<!-- The line itself -->
					<div class="line" style:bottom="{40}px" style:width="{lineWidth}px"></div>

					<!-- Ticks + labels + tap zones -->
					{#each ticks as t (t)}
						{@const x = (t - config.rangeMin) * config.tickSpacing}
						<div class="tick" style:left="{x}px" style:bottom="{32}px"></div>
						{#if t % config.labelEvery === 0}
							<div class="tick-label" style:left="{x}px" style:bottom="0px">{t}</div>
						{/if}
						<button
							class="tap-zone"
							class:start={t === heroTick && !hop}
							class:target={t === question.targetTick && result === 'correct'}
							style:left="{x - config.tickSpacing / 2}px"
							style:bottom="{0}px"
							style:width="{config.tickSpacing}px"
							style:height="{config.arcHeight + config.heroHeight + 60}px"
							onclick={() => startHop(t)}
							aria-label="Tick {t}"
						></button>
					{/each}

					<!-- Hero -->
					<div class="hero-wrap" style:left="{heroPx}px" style:bottom="{40 + heroYOffset}px">
						<Sprite
							character={heroChar}
							state="idle"
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

			<fieldset>
				<legend>Line</legend>
				{@render slider(
					'Range max',
					() => config.rangeMax,
					(v) => {
						config.rangeMax = v;
						nextQuestion();
					},
					5,
					30,
					1
				)}
				{@render slider(
					'Tick spacing (px)',
					() => config.tickSpacing,
					(v) => (config.tickSpacing = v),
					24,
					120,
					2
				)}
				{@render slider(
					'Label every Nth tick',
					() => config.labelEvery,
					(v) => (config.labelEvery = v),
					1,
					10,
					1
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

			<fieldset>
				<legend>Hero</legend>
				{@render slider(
					'Height (px)',
					() => config.heroHeight,
					(v) => (config.heroHeight = v),
					20,
					150,
					2
				)}
			</fieldset>

			<div class="actions">
				<button class="primary" onclick={copyConfig}>Copy Config</button>
				<button onclick={() => (config = { ...DEFAULT_NUMBERLINE })}>Reset Defaults</button>
			</div>

			<details class="json">
				<summary>Current config (JSON)</summary>
				<pre>{JSON.stringify({ character: heroId, numberLine: config }, null, 2)}</pre>
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
		grid-template-columns: minmax(0, 1fr) 320px;
		gap: var(--space-4);
		align-items: start;
	}
	@media (max-width: 1280px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}

	.scene {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
		border-radius: var(--radius-lg);
		border: 1px solid rgba(255, 255, 255, 0.08);
		min-height: 480px;
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
		background: linear-gradient(90deg, #facc15, #f59e0b);
		border-radius: 2px;
		box-shadow: 0 0 8px rgba(252, 211, 77, 0.4);
	}
	.tick {
		position: absolute;
		width: 3px;
		height: 14px;
		margin-left: -1.5px;
		background: rgba(255, 255, 255, 0.7);
	}
	.tick-label {
		position: absolute;
		transform: translateX(-50%);
		font: var(--font-w-bold) var(--text-base) / 1 var(--font-display);
		color: rgba(255, 255, 255, 0.85);
		font-variant-numeric: tabular-nums;
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
		background: rgba(56, 189, 248, 0.18);
		border-color: rgba(56, 189, 248, 0.5);
	}
	.tap-zone.start {
		background: rgba(74, 222, 128, 0.1);
		border-color: rgba(74, 222, 128, 0.4);
	}
	.tap-zone.target {
		background: rgba(74, 222, 128, 0.25);
		border-color: rgba(74, 222, 128, 0.7);
	}
	.hero-wrap {
		position: absolute;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		transform: translateX(-50%);
		pointer-events: none;
		transition: none;
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
