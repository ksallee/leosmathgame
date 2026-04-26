<script lang="ts">
	import {
		generateLevel,
		recordAnswer,
		recordForLeitner,
		dueEntries,
		type Question,
		type AnswerEvent
	} from '$lib/engine';
	import { opLabel, opSummaries, makeAnswerEvent, summarizeLevel } from '$lib/engine/debug';
	import {
		loadProfile,
		saveProfile,
		clearAll,
		emptyProfile,
		type Profile
	} from '$lib/storage/persist';
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';

	let profile: Profile = $state(emptyProfile());
	let loaded = $state(false);

	onMount(async () => {
		const saved = await loadProfile();
		if (saved) profile = saved;
		loaded = true;
	});

	$effect(() => {
		if (loaded) void saveProfile(profile);
	});

	beforeNavigate(async () => {
		if (loaded) await saveProfile(profile);
	});

	let questions: Question[] = $state([]);
	let qIndex = $state(0);
	let userAnswer = $state('');
	let lastFeedback: 'correct' | 'wrong' | null = $state(null);
	let questionStartedAt = $state(0);
	let levelEvents: AnswerEvent[] = $state([]);
	let inputEl: HTMLInputElement | undefined = $state();

	const summaries = $derived(opSummaries(profile.mastery));
	const currentQuestion = $derived<Question | null>(questions[qIndex] ?? null);
	const levelInProgress = $derived(questions.length > 0 && qIndex < questions.length);
	const levelDone = $derived(questions.length > 0 && qIndex >= questions.length);
	const lastSummary = $derived(levelDone ? summarizeLevel(levelEvents) : null);

	$effect(() => {
		if (currentQuestion) inputEl?.focus();
	});

	function startLevel() {
		questions = generateLevel(profile.mastery, profile.level);
		qIndex = 0;
		userAnswer = '';
		lastFeedback = null;
		levelEvents = [];
		questionStartedAt = Date.now();
	}

	function submit() {
		if (!currentQuestion || userAnswer === '') return;
		const elapsed = Date.now() - questionStartedAt;
		const ev = makeAnswerEvent(currentQuestion, Number(userAnswer), elapsed);
		recordAnswer(profile.mastery, ev);
		recordForLeitner(profile.mastery, ev);
		levelEvents = [...levelEvents, ev];
		lastFeedback = ev.correct ? 'correct' : 'wrong';
		qIndex += 1;
		userAnswer = '';
		questionStartedAt = Date.now();
	}

	function forceWrong() {
		if (!currentQuestion) return;
		const elapsed = Date.now() - questionStartedAt;
		const wrongAnswer = currentQuestion.answer + 1;
		const ev = makeAnswerEvent(currentQuestion, wrongAnswer, elapsed);
		recordAnswer(profile.mastery, ev);
		recordForLeitner(profile.mastery, ev);
		levelEvents = [...levelEvents, ev];
		lastFeedback = 'wrong';
		qIndex += 1;
		userAnswer = '';
		questionStartedAt = Date.now();
	}

	function nextLevel() {
		profile.level += 1;
		startLevel();
	}

	async function resetAll() {
		await clearAll();
		profile = emptyProfile();
		questions = [];
		qIndex = 0;
		userAnswer = '';
		lastFeedback = null;
		levelEvents = [];
	}

	function fastForwardCorrect(n: number) {
		for (let i = 0; i < n; i++) {
			const qs = generateLevel(profile.mastery, profile.level);
			for (const q of qs) {
				const ev = makeAnswerEvent(q, q.answer, 1500);
				recordAnswer(profile.mastery, ev);
				recordForLeitner(profile.mastery, ev);
			}
			profile.level += 1;
		}
		questions = [];
		qIndex = 0;
	}
</script>

<main>
	<header>
		<h1>Engine debug</h1>
		<button class="reset" onclick={resetAll}>Reset</button>
	</header>

	<section>
		<h2>State</h2>
		<div class="grid">
			<div><span class="k">Level</span><span class="v">{profile.level}</span></div>
			<div><span class="k">Answered</span><span class="v">{profile.mastery.answered}</span></div>
			<div>
				<span class="k">Unlocked</span><span class="v">{profile.mastery.unlockedOps.length}</span>
			</div>
			<div>
				<span class="k">Leitner due</span><span class="v">{dueEntries(profile.mastery).length}</span
				>
			</div>
		</div>

		<table>
			<thead><tr><th>Op</th><th>Band</th><th>Conf.</th><th>State</th></tr></thead>
			<tbody>
				{#each summaries as s (s.op)}
					<tr class:dim={!s.unlocked}>
						<td class="sym">{opLabel(s.op)}</td>
						<td>{s.band || '–'}</td>
						<td>{s.confidence}</td>
						<td>
							{#if !s.unlocked}locked
							{:else if s.calibrating}calibrating
							{:else}steady{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<section>
		{#if !levelInProgress && !levelDone}
			<button class="primary" onclick={startLevel}>Start level {profile.level}</button>
			<div class="ff">
				<button onclick={() => fastForwardCorrect(1)}>+1 lvl all-correct</button>
				<button onclick={() => fastForwardCorrect(5)}>+5 lvl all-correct</button>
				<button onclick={() => fastForwardCorrect(20)}>+20 lvl all-correct</button>
			</div>
		{/if}

		{#if levelInProgress && currentQuestion}
			<div class="q-meta">
				Q{qIndex + 1} / {questions.length} · {opLabel(currentQuestion.operation)} · band {currentQuestion.band}
			</div>
			<div class="prompt">{currentQuestion.prompt} = ?</div>
			<input
				type="number"
				inputmode="numeric"
				bind:this={inputEl}
				bind:value={userAnswer}
				onkeydown={(e) => e.key === 'Enter' && submit()}
			/>
			<div class="actions">
				<button class="primary" onclick={submit}>Submit</button>
				<button class="danger" onclick={forceWrong}>Force wrong</button>
			</div>
			{#if lastFeedback}
				<div class="feedback {lastFeedback}">
					{lastFeedback === 'correct' ? '✓' : '✗'}
				</div>
			{/if}
		{/if}

		{#if levelDone && lastSummary}
			<div class="summary">
				<div>Level {profile.level} done</div>
				<div>{lastSummary.correct} / {lastSummary.total} correct</div>
				<div>avg {Math.round(lastSummary.avgMs)}ms</div>
				<button class="primary" onclick={nextLevel}>Next level</button>
			</div>
		{/if}
	</section>
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	h1 {
		font: var(--font-w-bold) var(--text-2xl) / var(--leading-tight) var(--font-display);
	}
	h2 {
		font: var(--font-w-medium) var(--text-lg) / var(--leading-tight) var(--font-sans);
		margin-bottom: var(--space-3);
		color: var(--text-muted);
	}
	section {
		background: var(--surface-card);
		border-radius: var(--radius-lg);
		padding: var(--space-5);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}
	.grid > div {
		display: flex;
		justify-content: space-between;
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-900);
		border-radius: var(--radius-sm);
	}
	.k {
		color: var(--text-muted);
	}
	.v {
		font-weight: var(--font-w-bold);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		text-align: left;
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-bg-900);
	}
	th {
		color: var(--text-muted);
		font-weight: var(--font-w-medium);
	}
	tr.dim {
		opacity: 0.4;
	}
	.sym {
		font-size: var(--text-xl);
		font-weight: var(--font-w-bold);
		color: var(--color-primary-300);
	}
	.q-meta {
		color: var(--text-muted);
		font-size: var(--text-sm);
		margin-bottom: var(--space-3);
	}
	.prompt {
		font: var(--font-w-bold) var(--text-4xl) / 1 var(--font-display);
		text-align: center;
		padding: var(--space-6) 0;
		font-variant-numeric: tabular-nums;
	}
	input {
		width: 100%;
		padding: var(--space-4);
		font-size: var(--text-2xl);
		text-align: center;
		background: var(--color-bg-900);
		border: 2px solid var(--color-bg-800);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}
	input:focus {
		outline: none;
		border-color: var(--color-primary-500);
	}
	.actions {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
	button {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		font-weight: var(--font-w-medium);
		font-size: var(--text-base);
		background: var(--color-bg-900);
		color: var(--text-primary);
		transition: transform var(--motion-fast) var(--ease-out);
	}
	button:active {
		transform: scale(0.97);
	}
	button.primary {
		background: var(--color-primary-500);
		color: var(--color-bg-900);
		flex: 1;
	}
	button.danger {
		background: var(--color-negative-500);
		color: var(--color-bg-900);
	}
	button.reset {
		background: transparent;
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
	.ff {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-3);
		flex-wrap: wrap;
	}
	.ff button {
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-3);
	}
	.feedback {
		text-align: center;
		font-size: var(--text-3xl);
		margin-top: var(--space-3);
	}
	.feedback.correct {
		color: var(--color-positive-500);
	}
	.feedback.wrong {
		color: var(--color-negative-500);
	}
	.summary {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		text-align: center;
		font-size: var(--text-lg);
	}
</style>
