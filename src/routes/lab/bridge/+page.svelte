<script lang="ts">
	import { onMount } from 'svelte';
	import {
		bandConfig,
		BRIDGE_THEMES,
		BRIDGE_TOKENS,
		BRIDGE_BANDS,
		generateQuestion,
		makeRngFromSeed,
		type BridgeWorld
	} from '$lib/games/bridge';
	import BridgeScene from '$lib/games/bridge/BridgeScene.svelte';

	const STORAGE = 'lab.bridge';
	const WORLD_IDS: BridgeWorld[] = ['forest', 'desert', 'cave', 'snow', 'pirate'];

	let bandIdx = $state(1);
	let worldId: BridgeWorld = $state('forest');
	let questionSeed = $state(1);
	let autoAdvance = $state(true);
	let autoAdvanceMs = $state(900);
	let lastResult = $state('');
	let stats = $state({ correct: 0, wrong: 0 });

	const band = $derived(bandConfig(bandIdx));
	const theme = $derived(BRIDGE_THEMES[worldId]);
	const token = $derived(BRIDGE_TOKENS[worldId]);
	const previewQuestion = $derived(generateQuestion(band, makeRngFromSeed(questionSeed || 1)));

	onMount(() => {
		const saved = localStorage.getItem(STORAGE);
		if (saved) {
			try {
				const s = JSON.parse(saved);
				if (Number.isFinite(s.bandIdx)) bandIdx = s.bandIdx;
				if (WORLD_IDS.includes(s.worldId)) worldId = s.worldId;
				if (typeof s.autoAdvance === 'boolean') autoAdvance = s.autoAdvance;
				if (Number.isFinite(s.autoAdvanceMs)) autoAdvanceMs = s.autoAdvanceMs;
			} catch {
				/* defaults */
			}
		}
	});

	$effect(() => {
		localStorage.setItem(STORAGE, JSON.stringify({ bandIdx, worldId, autoAdvance, autoAdvanceMs }));
	});

	function onComplete(correct: boolean) {
		lastResult = correct ? '✓ all steps correct' : '× ≥1 step wrong';
		if (correct) stats.correct += 1;
		else stats.wrong += 1;
		if (autoAdvance) {
			setTimeout(() => {
				questionSeed += 1;
			}, autoAdvanceMs);
		}
	}

	function nextQuestion() {
		questionSeed += 1;
		lastResult = '';
	}

	function resetStats() {
		stats = { correct: 0, wrong: 0 };
	}
</script>

<div class="lab">
	<aside class="controls">
		<a class="back" href="/lab">← Lab</a>
		<h1>Bridge</h1>

		<section>
			<h2>Band</h2>
			<select bind:value={bandIdx}>
				{#each BRIDGE_BANDS as b (b.band)}
					<option value={b.band}>{b.description}</option>
				{/each}
			</select>
			<p class="meta">
				<span>{band.op}</span> · <span>{band.visual}</span>
			</p>
		</section>

		<section>
			<h2>World</h2>
			<div class="world-row">
				{#each WORLD_IDS as id (id)}
					<button class="world-chip" class:active={worldId === id} onclick={() => (worldId = id)}>
						{id}
					</button>
				{/each}
			</div>
		</section>

		<section>
			<h2>Question</h2>
			<button class="next" onclick={nextQuestion}>↻ Next question</button>
			<dl class="kv">
				<dt>seed</dt>
				<dd>{questionSeed}</dd>
				<dt>equation</dt>
				<dd>
					{previewQuestion.a}
					{previewQuestion.op === 'add' ? '+' : '−'}
					{previewQuestion.b} = {previewQuestion.total}
				</dd>
				{#each previewQuestion.steps as s, i (i)}
					<dt>step {i + 1}</dt>
					<dd>{s.instruction}: {s.equation} → {s.answer}</dd>
				{/each}
			</dl>
		</section>

		<section>
			<h2>Auto-advance</h2>
			<label class="toggle">
				<input type="checkbox" bind:checked={autoAdvance} />
				<span>Auto next on answer</span>
			</label>
			<label class="slider">
				<span>Delay {autoAdvanceMs}ms</span>
				<input type="range" min="200" max="2500" step="100" bind:value={autoAdvanceMs} />
			</label>
		</section>

		<section>
			<h2>Stats</h2>
			<p class="meta">
				✓ {stats.correct} · × {stats.wrong}
				{#if lastResult}<br /><span>{lastResult}</span>{/if}
			</p>
			<button class="next ghost" onclick={resetStats}>Reset</button>
		</section>
	</aside>

	<main class="scene-pane">
		<BridgeScene {band} {theme} {token} {questionSeed} {onComplete} />
	</main>
</div>

<style>
	.lab {
		position: fixed;
		inset: 0;
		display: flex;
		background: var(--surface-app);
		overflow: hidden;
	}
	.controls {
		flex: 0 0 280px;
		min-width: 240px;
		max-width: 340px;
		height: 100%;
		overflow-y: auto;
		padding: var(--space-5) var(--space-4);
		background: rgba(15, 23, 42, 0.92);
		color: var(--color-fg-50);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		border-right: 1px solid rgba(255, 255, 255, 0.08);
	}
	.scene-pane {
		flex: 1;
		height: 100%;
		min-width: 0;
		display: flex;
	}
	.scene-pane :global(.scene) {
		flex: 1;
	}
	.back {
		color: var(--text-muted);
		font-size: var(--text-sm);
		text-decoration: none;
	}
	h1 {
		font: var(--font-w-bold) var(--text-xl) / 1 var(--font-display);
		margin: 0;
	}
	h2 {
		font: var(--font-w-bold) var(--text-sm) / 1 var(--font-display);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		margin: 0 0 var(--space-2);
	}
	section {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	select {
		width: 100%;
		padding: var(--space-2);
		background: rgba(255, 255, 255, 0.06);
		color: var(--color-fg-50);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
	}
	.meta {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-xs);
	}
	.world-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.world-chip {
		padding: 6px 10px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: var(--radius-pill);
		color: var(--color-fg-50);
		font-size: var(--text-xs);
		cursor: pointer;
	}
	.world-chip.active {
		background: rgba(99, 102, 241, 0.4);
		border-color: rgba(99, 102, 241, 0.7);
	}
	.next {
		padding: var(--space-2) var(--space-3);
		background: rgba(99, 102, 241, 0.5);
		border: none;
		border-radius: var(--radius-md);
		color: white;
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
	}
	.next.ghost {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
	}
	.kv {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px var(--space-3);
		margin: 0;
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.kv dt {
		opacity: 0.7;
	}
	.kv dd {
		margin: 0;
		color: var(--color-fg-50);
		font-variant-numeric: tabular-nums;
	}
	.toggle,
	.slider {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: var(--text-xs);
		color: var(--text-muted);
	}
	.toggle {
		flex-direction: row;
		align-items: center;
		gap: var(--space-2);
	}
	input[type='range'] {
		width: 100%;
	}
</style>
