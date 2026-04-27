<script lang="ts">
	import { onMount } from 'svelte';
	import {
		bandConfig,
		NUMBERLINE_THEMES,
		NUMBER_LINE_BANDS,
		type NumberlineTheme,
		type QuestionKind
	} from '$lib/games/numberline';
	import NumberlineScene from '$lib/games/numberline/NumberlineScene.svelte';
	import { HEROES } from '$lib/sprites/manifest';

	const STORAGE = 'lab.numberline.full';
	const HERO_IDS = Object.keys(HEROES);
	const THEME_IDS: NumberlineTheme[] = ['forest', 'desert', 'cave', 'snow', 'pirate'];

	let bandIdx = $state(1);
	let themeId: NumberlineTheme = $state('forest');
	let heroId = $state('ninja_frog');
	let questionKind: QuestionKind = $state('add');
	let heroHeight = $state(96);
	let questionSeed = $state(1);
	let lastResult = $state('');

	const band = $derived(bandConfig(bandIdx));
	const theme = $derived(NUMBERLINE_THEMES[themeId]);
	const heroChar = $derived(HEROES[heroId] ?? HEROES.ninja_frog);

	onMount(() => {
		const saved = localStorage.getItem(STORAGE);
		if (saved) {
			try {
				const s = JSON.parse(saved);
				if (Number.isFinite(s.bandIdx)) bandIdx = s.bandIdx;
				if (THEME_IDS.includes(s.themeId)) themeId = s.themeId;
				if (HERO_IDS.includes(s.heroId)) heroId = s.heroId;
				if (s.questionKind === 'add' || s.questionKind === 'sub') questionKind = s.questionKind;
				if (Number.isFinite(s.heroHeight)) heroHeight = s.heroHeight;
			} catch {
				/* defaults */
			}
		}
	});

	$effect(() => {
		localStorage.setItem(
			STORAGE,
			JSON.stringify({ bandIdx, themeId, heroId, questionKind, heroHeight })
		);
	});

	function onComplete(correct: boolean) {
		lastResult = correct ? '✓ correct' : '× wrong (corrected)';
		// Auto-advance to next question after a short pause for inspection.
		setTimeout(() => {
			questionSeed += 1;
		}, 800);
	}
</script>

<div class="page">
	<div class="hud">
		<a class="back" href="/lab">← Lab</a>
		<label>
			Band
			<select bind:value={bandIdx}>
				{#each NUMBER_LINE_BANDS as b (b.band)}
					<option value={b.band}>B{b.band} — {b.description}</option>
				{/each}
			</select>
		</label>
		<label>
			Theme
			<select bind:value={themeId}>
				{#each THEME_IDS as id (id)}
					<option value={id}>{id}</option>
				{/each}
			</select>
		</label>
		<label>
			Char
			<select bind:value={heroId}>
				{#each HERO_IDS as id (id)}
					<option value={id}>{id}</option>
				{/each}
			</select>
		</label>
		<label>
			Kind
			<select bind:value={questionKind}>
				<option value="add">Addition</option>
				<option value="sub">Subtraction</option>
			</select>
		</label>
		<label>
			Hero h
			<input type="number" bind:value={heroHeight} min={20} max={200} step={2} />
		</label>
		<button class="next" onclick={() => (questionSeed += 1)}>Next ▶</button>
		<div class="result">{lastResult}</div>
	</div>

	<div class="scene-wrap">
		<NumberlineScene
			{band}
			{theme}
			character={heroChar}
			{questionKind}
			{questionSeed}
			{heroHeight}
			{onComplete}
		/>
	</div>
</div>

<style>
	.page {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		background: #0f172a;
		color: var(--color-fg-50);
	}
	.hud {
		display: flex;
		gap: var(--space-3);
		flex-wrap: wrap;
		align-items: center;
		padding: var(--space-3) var(--space-4);
		background: rgba(15, 23, 42, 0.95);
		font-size: var(--text-sm);
	}
	.hud label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--text-muted);
	}
	.hud select,
	.hud input {
		background: rgba(15, 23, 42, 0.9);
		color: var(--color-fg-50);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: var(--radius-md);
		padding: 4px 8px;
		font-size: var(--text-sm);
	}
	.back {
		color: var(--text-muted);
		text-decoration: none;
	}
	.next {
		padding: 6px 16px;
		background: var(--color-primary-500);
		color: var(--color-bg-900);
		border: none;
		border-radius: var(--radius-pill);
		font-weight: var(--font-w-bold);
		cursor: pointer;
	}
	.result {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
		color: var(--color-primary-300);
	}
	.scene-wrap {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: var(--space-3);
	}
	.scene-wrap :global(.scene) {
		flex: 1;
	}
</style>
