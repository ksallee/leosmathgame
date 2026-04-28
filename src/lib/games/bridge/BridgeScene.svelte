<script lang="ts">
	import { crossfade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { play, unlock } from '$lib/audio/sfx';
	import {
		generateQuestion,
		makeRngFromSeed,
		type BridgeBand,
		type BridgeQuestion,
		type BridgeStep,
		type BridgeThemeStyle,
		type BridgeToken
	} from '$lib/games/bridge';

	// Crossfade ties an `out:send` element to an `in:receive` element with the
	// same key — so when B's supply-dot unmounts in one place and the same key
	// mounts in A's cell, the sprite physically moves between positions. For
	// elements that send without a matching receive (e.g., A's tokens "removed"
	// via subtraction), the fallback runs — fade + slight shrink.
	const [send, receive] = crossfade({
		duration: 650,
		easing: cubicOut,
		fallback() {
			return {
				duration: 360,
				easing: cubicOut,
				css: (t) =>
					`opacity: ${t}; transform: scale(${0.5 + t * 0.5}) translateY(${(1 - t) * 12}px);`
			};
		}
	});

	interface Props {
		band: BridgeBand;
		theme: BridgeThemeStyle;
		token: BridgeToken;
		/** Bump to generate a new question deterministically. */
		questionSeed: number;
		/** Fires immediately on each sub-step tap so the parent can update HUD
		 *  state (e.g., lives counter) in real time, not only at question end. */
		onStep?: (wasCorrect: boolean) => void;
		/** Fires once after the last sub-step resolves. `wrongSteps` is the count
		 *  of sub-steps the kid got wrong on first try. */
		onComplete: (wrongSteps: number) => void;
	}

	let { band, theme, token, questionSeed, onStep, onComplete }: Props = $props();

	const question: BridgeQuestion = $derived(
		generateQuestion(band, makeRngFromSeed(questionSeed || 1))
	);

	let currentStepIdx = $state(0);
	/** Number of steps whose visual has been applied. When `appliedSteps === N`
	 *  the canvas shows the post-step-N state. Starts at 0 (initial layout). */
	let appliedSteps = $state(0);
	type Phase = 'idle' | 'feedback' | 'apply' | 'done';
	let phase = $state<Phase>('idle');
	let lastTapped = $state<number | null>(null);
	let stepResults: ('correct' | 'wrong')[] = $state([]);
	let completionFired = false;

	// Reset only when questionSeed actually changes — `question` can re-fire
	// spuriously when ancestor reactives notify (e.g., parent mutating mastery
	// during finishLevel). Without this guard the scene resets mid-celebration.
	let lastSeenSeed = -1;
	$effect(() => {
		const seed = questionSeed;
		if (seed === lastSeenSeed) return;
		lastSeenSeed = seed;
		void question;
		currentStepIdx = 0;
		appliedSteps = 0;
		phase = 'idle';
		lastTapped = null;
		stepResults = [];
		completionFired = false;
	});

	const currentStep: BridgeStep = $derived(question.steps[currentStepIdx]);

	function tapOption(v: number) {
		if (phase !== 'idle') return;
		unlock();
		lastTapped = v;
		const correct = v === currentStep.answer;
		stepResults = [...stepResults, correct ? 'correct' : 'wrong'];
		play(correct ? 'correct' : 'wrong', 0.4);
		// Notify parent immediately so the HUD (lives counter) updates per step,
		// not only at question end.
		onStep?.(correct);
		phase = 'feedback';
		const feedbackMs = correct ? 400 : 1000;
		setTimeout(() => {
			phase = 'apply';
			appliedSteps = currentStepIdx + 1;
			// Hold the post-step state longer when the next step is 'confirm' —
			// the kid needs to absorb the final filled state before the visual
			// resets back to the original equation for the confirmation tap.
			const nextStep = question.steps[currentStepIdx + 1];
			const applyMs = nextStep?.kind === 'confirm' ? 1200 : 600;
			setTimeout(() => {
				if (currentStepIdx < question.steps.length - 1) {
					currentStepIdx += 1;
					phase = 'idle';
					lastTapped = null;
				} else {
					phase = 'done';
					if (!completionFired) {
						completionFired = true;
						const wrongSteps = stepResults.filter((r) => r === 'wrong').length;
						onComplete(wrongSteps);
					}
				}
			}, applyMs);
		}, feedbackMs);
	}

	// ---- visual state ----
	// Within20: two ten-frames + a "supply" of the second-addend tokens that
	// gets consumed step by step, so the kid SEES the decomposition happen.

	function within20State(q: BridgeQuestion, applied: number) {
		// Per-cell state tracking: each cell is intact, fromB (added), or
		// removed (subtracted but stays visible with a tint).
		const empty = {
			f1Intact: 0,
			f1FromB: 0,
			f1Removed: 0,
			f2Intact: 0,
			f2FromB: 0,
			f2Removed: 0,
			supplyUsed: 0,
			supplyRemaining: q.b
		};
		if (q.op === 'add') {
			const bond = 10 - q.a;
			const remainder = q.b - bond;
			if (applied === 0) return { ...empty, f1Intact: q.a };
			if (applied === 1) {
				return {
					...empty,
					f1Intact: q.a,
					f1FromB: bond,
					supplyUsed: bond,
					supplyRemaining: q.b - bond
				};
			}
			return {
				...empty,
				f1Intact: q.a,
				f1FromB: bond,
				f2FromB: remainder,
				supplyUsed: q.b,
				supplyRemaining: 0
			};
		}
		const aOnes = q.a - 10;
		const remainder = q.b - aOnes;
		if (applied === 0) return { ...empty, f1Intact: 10, f2Intact: aOnes };
		if (applied === 1) {
			return {
				...empty,
				f1Intact: 10,
				f2Removed: aOnes,
				supplyUsed: aOnes,
				supplyRemaining: q.b - aOnes
			};
		}
		return {
			...empty,
			f1Intact: 10 - remainder,
			f1Removed: remainder,
			f2Removed: aOnes,
			supplyUsed: q.b,
			supplyRemaining: 0
		};
	}

	interface BundleComp {
		intact: number;
		fromB: number;
		removed: number;
		/** Per-cell crossfade source keys for the from-b cells (length === fromB).
		 *  Used for COMPOSITE bundles where individual cells need to crossfade
		 *  separately (e.g., B3 step 2's "8 from A + 2 from B" bundle). */
		bSourceKeys: string[];
		/** When set, the WHOLE bundle is a single crossfade target — it moved
		 *  as one unit from a B-bundle. (e.g., B4/B5 step 1 where B's bundles
		 *  fly intact to A's bundles row.) Per-cell keys are ignored. */
		bWholeKey?: string;
	}

	function makeBundle(
		intact = 0,
		fromB = 0,
		removed = 0,
		bSourceKeys: string[] = [],
		bWholeKey?: string
	): BundleComp {
		return { intact, fromB, removed, bSourceKeys, bWholeKey };
	}

	function bundleKeys(bIdx: number): string[] {
		return Array.from({ length: 10 }, (_, c) => `b-bundle-${bIdx}-cell-${c}`);
	}
	function bOnesKeys(start: number, count: number): string[] {
		return Array.from({ length: count }, (_, i) => `b-ones-${start + i}`);
	}

	interface TdState {
		bundles: BundleComp[];
		onesIntact: number;
		onesFromB: number;
		onesRemoved: number;
		/** Source keys for the ones-frame's from-b cells (length === onesFromB). */
		onesBSourceKeys: string[];
		aRunningLabel: number;
		bTens: number;
		bOnes: number;
		bTensUsed: number;
		bOnesUsed: number;
		bRemainingLabel: number;
	}

	function twoDigitState(q: BridgeQuestion, applied: number): TdState {
		const aTens = Math.floor(q.a / 10);
		const aOnes = q.a % 10;
		const bTens = Math.floor(q.b / 10);
		const bOnes = q.b % 10;
		const step1Kind = q.steps[0].kind;

		// Initial: A's bundles all intact, ones all intact.
		let bundles: BundleComp[] = [];
		for (let i = 0; i < aTens; i++) bundles.push(makeBundle(10, 0, 0));
		let onesIntact = aOnes;
		let onesFromB = 0;
		let onesRemoved = 0;
		let onesBSourceKeys: string[] = [];
		let aValue = q.a;
		let bTensUsed = 0;
		let bOnesUsed = 0;

		if (applied >= 1) {
			if (step1Kind === 'add-tens') {
				bTensUsed = bTens;
				for (let i = 0; i < bTens; i++) {
					// Whole-bundle move: tag it with bWholeKey so it animates as one
					// unit rather than 10 separate cells.
					bundles.push(makeBundle(0, 10, 0, bundleKeys(i), `b-bundle-${i}`));
				}
				if (applied >= 2) {
					bOnesUsed = bOnes;
					const combinedOnes = aOnes + bOnes;
					if (combinedOnes < 10) {
						onesFromB = bOnes;
						onesBSourceKeys = bOnesKeys(0, bOnes);
						aValue = q.total;
					} else {
						const bond = 10 - aOnes;
						bundles.push(makeBundle(aOnes, bond, 0, bOnesKeys(0, bond)));
						onesIntact = 0;
						onesFromB = bOnes - bond;
						onesBSourceKeys = bOnesKeys(bond, onesFromB);
						aValue = q.total;
					}
				} else {
					aValue = q.a + bTens * 10;
				}
			} else if (step1Kind === 'complete-to-ten') {
				const nextTen = (aTens + 1) * 10;
				const bond = nextTen - q.a;
				bOnesUsed = applied === 1 ? bond : bOnes;
				if (applied === 1) {
					onesIntact = aOnes;
					onesFromB = bond;
					onesBSourceKeys = bOnesKeys(0, bond);
				} else {
					bundles.push(makeBundle(aOnes, bond, 0, bOnesKeys(0, bond)));
					onesIntact = 0;
					onesFromB = bOnes - bond;
					onesBSourceKeys = bOnesKeys(bond, onesFromB);
				}
				aValue = applied === 1 ? nextTen : q.total;
			} else if (step1Kind === 'sub-tens') {
				// SUB: removed pieces stay rendered with a tinted "removed" state
				// so the kid sees what was taken away. Remove from the END (right
				// side of the row) — feels like "taking from the pile".
				bTensUsed = bTens;
				for (let i = 0; i < bTens; i++) bundles[aTens - 1 - i] = makeBundle(0, 0, 10);
				aValue = applied === 1 ? q.a - bTens * 10 : q.total;
				if (applied >= 2) {
					bOnesUsed = bOnes;
					if (aOnes >= bOnes) {
						onesIntact = aOnes - bOnes;
						onesRemoved = bOnes;
					} else {
						// Need to break a bundle (the last intact one) to remove the
						// remainder.
						let breakIdx = -1;
						for (let i = bundles.length - 1; i >= 0; i--) {
							if (bundles[i].intact === 10) {
								breakIdx = i;
								break;
							}
						}
						if (breakIdx >= 0) {
							const removeFromBundle = bOnes - aOnes;
							bundles[breakIdx] = makeBundle(10 - removeFromBundle, 0, removeFromBundle);
						}
						onesIntact = 0;
						onesRemoved = aOnes;
					}
				}
			} else if (step1Kind === 'sub-to-ten') {
				bOnesUsed = applied === 1 ? aOnes : bOnes;
				onesIntact = 0;
				onesRemoved = aOnes;
				if (applied >= 2) {
					// Break the last intact bundle to remove the remainder.
					const remainder = bOnes - aOnes;
					let breakIdx = -1;
					for (let i = bundles.length - 1; i >= 0; i--) {
						if (bundles[i].intact === 10) {
							breakIdx = i;
							break;
						}
					}
					if (breakIdx >= 0) {
						bundles[breakIdx] = makeBundle(10 - remainder, 0, remainder);
					}
				}
				aValue = applied === 1 ? aTens * 10 : q.total;
			}
		}

		const bRemainingLabel = (bTens - bTensUsed) * 10 + (bOnes - bOnesUsed);

		return {
			bundles,
			onesIntact,
			onesFromB,
			onesRemoved,
			onesBSourceKeys,
			aRunningLabel: aValue,
			bTens,
			bOnes,
			bTensUsed,
			bOnesUsed,
			bRemainingLabel
		};
	}

	// On a 'confirm' step's idle phase, reset the visual to the original
	// problem state so the kid sees the full equation fresh. Once they commit,
	// jump back to the fully-applied state and the spawn animation re-fills
	// the tokens, walking the answer in.
	const displayedApplied = $derived(
		currentStep.kind === 'confirm' && phase === 'idle' ? 0 : appliedSteps
	);
	const w20 = $derived(
		question.visual === 'within20' ? within20State(question, displayedApplied) : null
	);
	const td = $derived(
		question.visual === 'twoDigit' ? twoDigitState(question, displayedApplied) : null
	);

	// Persistent goal — the original equation always visible at the top.
	const goalEquation = $derived(`${question.a} ${question.op === 'add' ? '+' : '−'} ${question.b}`);
	const goalAnswer = $derived(phase === 'done' ? `${question.total}` : '?');
</script>

<div
	class="scene"
	style="background: {theme.bgGradient};"
	style:--tint-from-b={theme.tintFromB}
	style:--tint-from-b-border={theme.tintFromBBorder}
	style:--tint-removed={theme.tintRemoved}
	style:--tint-removed-border={theme.tintRemovedBorder}
>
	<!-- Persistent goal: the original equation, always visible -->
	<div class="goal" style="color: {theme.promptColor};">
		<span class="g-eq">{goalEquation}</span>
		<span class="g-eq dim"> = </span>
		<span class="g-ans" class:revealed={phase === 'done'}>{goalAnswer}</span>
	</div>

	<!-- Step trail: completed steps remain visible above the current one. -->
	<div class="trail" style="color: {theme.promptColor};">
		{#each question.steps as s, i (i)}
			{#if i < currentStepIdx || (i === currentStepIdx && (phase === 'apply' || phase === 'done'))}
				<!-- Completed step: equation with answer filled in. -->
				<div class="trail-row done" class:wrong={stepResults[i] === 'wrong'}>
					<span class="trail-mark">{stepResults[i] === 'wrong' ? '✗' : '✓'}</span>
					<span class="trail-instr">{s.instruction}</span>
					<span class="trail-eq">{s.equation.replace('?', String(s.answer))}</span>
				</div>
			{:else if i === currentStepIdx}
				<!-- Active step: instruction + equation, no answer yet. -->
				<div class="trail-row active">
					<span class="trail-mark">◯</span>
					<span class="trail-instr">{s.instruction}</span>
					<span class="trail-eq">{s.equation}</span>
				</div>
			{/if}
		{/each}
	</div>

	<!-- Visual canvas -->
	<div class="canvas">
		{#if w20}
			<div class="frame-pair">
				{@render tenFrame(w20.f1Intact, w20.f1FromB, w20.f1Removed, 0, 'a-f1', 0)}
				{@render tenFrame(
					w20.f2Intact,
					w20.f2FromB,
					w20.f2Removed,
					10,
					'a-f2',
					question.op === 'add' ? 10 - question.a : 0
				)}
			</div>
			<div class="supply" aria-label="à ajouter">
				<div class="supply-label" style="color: {theme.promptColor};">
					{question.op === 'add' ? '+' : '−'}{w20.supplyRemaining}
				</div>
				<div class="supply-row">
					{#each Array(question.b) as _, i (i)}
						<div class="supply-dot" class:used={i < w20.supplyUsed}>
							<!-- Ghost: always rendered, dimmed + X-overlaid when used so the
							     kid still sees the sprite outline after it "moved away". -->
							<div class="supply-ghost">{@render tokenSprite()}</div>
							{#if i >= w20.supplyUsed}
								<!-- Active: stacks on top of the ghost. Crossfades to A's cell
								     on unmount (out:send → matching in:receive in A). -->
								<div class="supply-token" out:send={{ key: `b-${i}` }}>
									{@render tokenSprite()}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
		{#if td}
			<!-- A's pieces are tinted per cell: intact (default), from-b (added),
			     or removed (subtracted but stays visible). B's label shows
			     remaining so the kid tracks consumption directly. -->
			<div class="operand-row">
				{@render numberBlockComposite(
					td.bundles,
					td.onesIntact,
					td.onesFromB,
					td.onesRemoved,
					td.onesBSourceKeys,
					String(td.aRunningLabel),
					0
				)}
				<div class="op-sym" style="color: {theme.promptColor};">
					{question.op === 'add' ? '+' : '−'}
				</div>
				{@render numberBlockMarked(
					td.bTens,
					td.bOnes,
					td.bTensUsed,
					td.bOnesUsed,
					String(td.bRemainingLabel),
					100
				)}
			</div>
		{/if}
	</div>

	<!-- Multiple-choice buttons -->
	<div class="options">
		{#each currentStep.options as opt (opt)}
			<button
				class="opt"
				class:correct={phase === 'feedback' && opt === currentStep.answer && lastTapped === opt}
				class:wrong={phase === 'feedback' &&
					opt === lastTapped &&
					lastTapped !== currentStep.answer}
				class:reveal={phase === 'feedback' && opt === currentStep.answer && lastTapped !== opt}
				disabled={phase !== 'idle'}
				onclick={() => tapOption(opt)}
				style:--btn-bg={theme.buttonBg}
				style:--btn-border={theme.buttonBorder}
				style:--btn-hover={theme.buttonHoverBg}
			>
				{opt}
			</button>
		{/each}
	</div>
</div>

{#snippet tenFrame(
	intact: number,
	fromB: number,
	removed: number,
	indexOffset: number,
	frameKey: string,
	bIdxBase: number
)}
	<div
		class="ten-frame"
		style:--frame-bg={theme.frameBg}
		style:--frame-border={theme.frameBorder}
		style:--cell-empty={theme.cellEmpty}
		style:--cell-border={theme.cellBorder}
	>
		{#each Array(10) as _, i (i)}
			{@const isIntact = i < intact}
			{@const isFromB = !isIntact && i < intact + fromB}
			{@const isRemoved = !isIntact && !isFromB && i < intact + fromB + removed}
			<div
				class="cell"
				class:filled={isIntact || isFromB}
				class:from-b={isFromB}
				class:removed={isRemoved}
			>
				{#if isIntact}
					<!-- A's own tokens: when removed by sub, out:send fires fallback fade. -->
					<div
						class="cell-token"
						out:send={{ key: `${frameKey}-${i}` }}
						style:--spawn-delay="{(indexOffset + i) * 50}ms"
					>
						{@render tokenSprite()}
					</div>
				{:else if isFromB}
					<!-- From B: receive matches the supply-dot's send → physical move. -->
					<div
						class="cell-token"
						in:receive={{ key: `b-${bIdxBase + (i - intact)}` }}
						style:--spawn-delay="{(indexOffset + i) * 50}ms"
					>
						{@render tokenSprite()}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/snippet}

{#snippet onesFrame(fill: number, indexOffset: number)}
	<div
		class="ones-frame"
		style:--frame-bg={theme.frameBg}
		style:--frame-border={theme.frameBorder}
		style:--cell-empty={theme.cellEmpty}
		style:--cell-border={theme.cellBorder}
	>
		{#each Array(10) as _, i (i)}
			<div class="ones-cell" class:filled={i < fill}>
				{#if i < fill}
					<div class="cell-token" style:--spawn-delay="{(indexOffset + i) * 50}ms">
						{@render tokenSprite()}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/snippet}

{#snippet numberBlockComposite(
	bundles: BundleComp[],
	onesIntact: number,
	onesFromB: number,
	onesRemoved: number,
	onesBSourceKeys: string[],
	label: string,
	baseDelay: number
)}
	<div class="num-block">
		{#if bundles.length > 0}
			<div class="bundles">
				{#each bundles as bundle, t (t)}
					{#if bundle.bWholeKey}
						<!-- Whole bundle came from B as one unit — wrap with a slot so
						     the outgoing B-bundle and incoming A-bundle crossfade as
						     a single element. -->
						<div class="bundle-slot">
							<div
								class="bundle from-b-whole"
								in:receive={{ key: bundle.bWholeKey }}
								style:--frame-bg={theme.frameBg}
								style:--frame-border={theme.frameBorder}
							>
								{#each Array(10) as _, c (c)}
									<div class="bundle-cell from-b">{@render tokenSprite()}</div>
								{/each}
							</div>
						</div>
					{:else}
						<div
							class="bundle"
							class:has-from-b={bundle.fromB > 0}
							style:--frame-bg={theme.frameBg}
							style:--frame-border={theme.frameBorder}
							style:--spawn-delay="{baseDelay + t * 80}ms"
						>
							{#each Array(bundle.intact) as _, c (c)}
								<div class="bundle-cell">{@render tokenSprite()}</div>
							{/each}
							{#each Array(bundle.fromB) as _, c (bundle.intact + c)}
								<div class="bundle-cell from-b">
									<div class="cell-token" in:receive={{ key: bundle.bSourceKeys[c] }}>
										{@render tokenSprite()}
									</div>
								</div>
							{/each}
							{#each Array(bundle.removed) as _, c (bundle.intact + bundle.fromB + c)}
								<div class="bundle-cell removed"></div>
							{/each}
						</div>
					{/if}
				{/each}
			</div>
		{/if}
		{#if onesIntact + onesFromB + onesRemoved > 0}
			<div
				class="ones-frame"
				style:--frame-bg={theme.frameBg}
				style:--frame-border={theme.frameBorder}
				style:--cell-empty={theme.cellEmpty}
				style:--cell-border={theme.cellBorder}
			>
				{#each Array(10) as _, i (i)}
					{@const isIntact = i < onesIntact}
					{@const isFromB = !isIntact && i < onesIntact + onesFromB}
					{@const isRemoved = !isIntact && !isFromB && i < onesIntact + onesFromB + onesRemoved}
					<div
						class="ones-cell"
						class:filled={isIntact || isFromB}
						class:from-b={isFromB}
						class:removed={isRemoved}
					>
						{#if isIntact}
							<div
								class="cell-token"
								style:--spawn-delay="{baseDelay / 50 + bundles.length * 2 + i * 50}ms"
							>
								{@render tokenSprite()}
							</div>
						{:else if isFromB}
							<div class="cell-token" in:receive={{ key: onesBSourceKeys[i - onesIntact] }}>
								{@render tokenSprite()}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
		<div class="num-label" style="color: {theme.promptColor};">{label}</div>
	</div>
{/snippet}

{#snippet numberBlockMarked(
	tens: number,
	ones: number,
	tensUsed: number,
	onesUsed: number,
	label: string,
	baseDelay: number
)}
	<div class="num-block">
		{#if tens > 0}
			<div class="bundles">
				{#each Array(tens) as _, t (t)}
					<!-- Slot wrapper holds both ghost (always visible at low opacity
					     when used) and active (whole-bundle crossfade target). -->
					<div class="bundle-slot" class:used={t < tensUsed}>
						<div
							class="bundle b-ghost-bundle"
							style:--frame-bg={theme.frameBg}
							style:--frame-border={theme.frameBorder}
						>
							{#each Array(10) as __, c (c)}
								<div class="bundle-cell">{@render tokenSprite()}</div>
							{/each}
						</div>
						{#if t >= tensUsed}
							<div
								class="bundle b-active-bundle"
								out:send={{ key: `b-bundle-${t}` }}
								style:--frame-bg={theme.frameBg}
								style:--frame-border={theme.frameBorder}
								style:--spawn-delay="{baseDelay + t * 80}ms"
							>
								{#each Array(10) as __, c (c)}
									<div class="bundle-cell">{@render tokenSprite()}</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
		{#if ones > 0}
			{@render onesFrameMarked(ones, onesUsed, baseDelay / 50 + tens * 2)}
		{/if}
		<div class="num-label" style="color: {theme.promptColor};">{label}</div>
	</div>
{/snippet}

{#snippet onesFrameMarked(fill: number, used: number, indexOffset: number)}
	<div
		class="ones-frame"
		style:--frame-bg={theme.frameBg}
		style:--frame-border={theme.frameBorder}
		style:--cell-empty={theme.cellEmpty}
		style:--cell-border={theme.cellBorder}
	>
		{#each Array(10) as _, i (i)}
			<div class="ones-cell" class:filled={i < fill} class:used={i < used}>
				{#if i < fill}
					<!-- Ghost: always rendered for filled cells; visible after the
					     active sprite "leaves" via crossfade. -->
					<div class="b-ghost cell-token-ghost">{@render tokenSprite()}</div>
					{#if i >= used}
						<div
							class="b-active cell-token"
							out:send={{ key: `b-ones-${i}` }}
							style:--spawn-delay="{(indexOffset + i) * 50}ms"
						>
							{@render tokenSprite()}
						</div>
					{/if}
				{/if}
			</div>
		{/each}
	</div>
{/snippet}

{#snippet numberBlock(tens: number, ones: number, label: string, baseDelay: number)}
	<div class="num-block">
		{#if tens > 0}
			<div class="bundles">
				{#each Array(tens) as _, t (t)}
					<div
						class="bundle"
						style:--frame-bg={theme.frameBg}
						style:--frame-border={theme.frameBorder}
						style:--spawn-delay="{baseDelay + t * 80}ms"
					>
						{#each Array(10) as __, c (c)}
							<div class="bundle-cell">{@render tokenSprite()}</div>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
		{#if ones > 0}
			{@render onesFrame(ones, baseDelay / 50 + tens * 2)}
		{/if}
		<div class="num-label" style="color: {theme.promptColor};">{label}</div>
	</div>
{/snippet}

{#snippet tokenSprite()}
	<!-- Sprite animation via transform on an inner img, NOT background-position.
	     Reason: background-position percentages are non-linear when the image is
	     wider than the container — animating from 0% to -1700% in steps(17) does
	     NOT cleanly snap to each frame. Translating an img by -100% of its own
	     width DOES, because translate-percent is element-relative. -->
	<span class="token" style:aspect-ratio="{token.frameW} / {token.frameH}">
		<img
			class="token-sheet"
			class:animated={token.frames > 1}
			src={token.src}
			alt=""
			draggable="false"
			style:--token-frames={token.frames}
			style:--token-duration="{token.durationMs}ms"
		/>
	</span>
{/snippet}

<style>
	.scene {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-5) var(--space-4);
		gap: var(--space-3);
		overflow: hidden;
	}
	.goal {
		font: var(--font-w-bold) clamp(36px, 6vw, 64px) / 1 var(--font-display);
		font-variant-numeric: tabular-nums;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
		letter-spacing: 0.02em;
	}
	.g-ans {
		display: inline-block;
		min-width: 1.4ch;
		text-align: center;
		opacity: 0.55;
	}
	.g-ans.revealed {
		opacity: 1;
		animation: ans-pop 500ms var(--ease-out);
	}
	@keyframes ans-pop {
		0% {
			transform: scale(0.6);
			opacity: 0.4;
		}
		60% {
			transform: scale(1.15);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
	.g-eq.dim {
		opacity: 0.55;
	}
	.trail {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		justify-content: flex-end;
		gap: 10px;
		min-width: 320px;
		max-width: 560px;
		/* Reserve enough vertical space to fit 3 rows (max steps per question)
		   so adding rows doesn't push the canvas around. Bottom-justified so
		   the active step is at a stable visual anchor. */
		min-height: 220px;
	}
	.trail-row {
		display: grid;
		grid-template-columns: 28px 1fr;
		align-items: center;
		gap: 4px var(--space-3);
		padding: var(--space-2) var(--space-4);
		background: rgba(15, 23, 42, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: var(--radius-md);
		font-variant-numeric: tabular-nums;
	}
	.trail-row .trail-instr {
		grid-column: 2;
		font: var(--font-w-bold) clamp(11px, 1.5vw, 14px) / 1 var(--font-display);
		opacity: 0.7;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.trail-row .trail-eq {
		grid-column: 2;
		font: var(--font-w-bold) clamp(20px, 3vw, 28px) / 1 var(--font-display);
	}
	.trail-row .trail-mark {
		grid-row: 1 / 3;
		grid-column: 1;
		align-self: center;
		font: var(--font-w-bold) var(--text-xl) / 1 var(--font-display);
		text-align: center;
	}
	.trail-row.done {
		opacity: 0.65;
	}
	.trail-row.done .trail-mark {
		color: #4ade80;
	}
	.trail-row.done.wrong .trail-mark {
		color: #fca5a5;
	}
	.trail-row.active {
		background: rgba(15, 23, 42, 0.85);
		border-color: rgba(125, 211, 252, 0.55);
		padding: var(--space-3) var(--space-5);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
		animation: trail-in 320ms var(--ease-out);
	}
	.trail-row.active .trail-mark {
		color: rgba(125, 211, 252, 0.85);
	}
	.trail-row.active .trail-instr {
		opacity: 0.85;
	}
	.trail-row.active .trail-eq {
		font-size: clamp(28px, 4.4vw, 40px);
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
	}
	@keyframes trail-in {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.canvas {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-5);
		width: 100%;
		/* Lock minimum canvas height so transitions between layouts (stacked
		   → tensMerged → final) and supply depletion don't reflow the rest of
		   the scene. */
		min-height: 320px;
	}
	.frame-pair {
		display: flex;
		gap: var(--space-4);
		min-width: 360px;
		min-height: 220px;
		align-items: center;
	}
	.ten-frame {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		grid-template-rows: repeat(2, 1fr);
		gap: 6px;
		padding: 10px;
		background: var(--frame-bg);
		border: 3px solid var(--frame-border);
		border-radius: var(--radius-lg);
	}
	.cell {
		width: clamp(48px, 7vw, 80px);
		height: clamp(48px, 7vw, 80px);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--cell-empty);
		border: 1px solid var(--cell-border);
		border-radius: var(--radius-md);
	}
	.cell-token,
	.supply-dot {
		display: flex;
		align-items: center;
		position: relative;
		z-index: 100;
		justify-content: center;
		animation: spawn 320ms var(--ease-out) backwards;
		animation-delay: var(--spawn-delay, 0ms);
	}
	/* Disable the spawn animation on cell-tokens that have crossfade in:receive
	   — the CSS animation's transform: scale(...) overrides crossfade's inline
	   transform, which made sprites appear to shrink to ~0 during transit. */
	.cell.from-b .cell-token,
	.bundle-cell.from-b .cell-token,
	.ones-cell.from-b .cell-token {
		animation: none;
	}
	/* Bundles containing from-b cells skip their own spawn animation too —
	   parent transform: scale(...) compounds with the children's crossfade
	   transforms and shrinks them visually. */
	.bundle.has-from-b {
		animation: none;
	}
	/* B-side ghost + active stacking (mirrors supply ghost). The ghost stays
	   visible (faded) after the active sprite has crossfaded to A. */
	.b-ghost,
	.b-active {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.b-ghost {
		z-index: 1;
		opacity: 0;
		transition: opacity var(--motion-fast) var(--ease-out);
	}
	.ones-cell.used .b-ghost {
		opacity: 0.5;
		filter: grayscale(0.85);
	}
	.b-active {
		z-index: 100;
	}
	.bundle-cell,
	.ones-cell {
		position: relative;
	}
	.cell-token {
		width: 78%;
		height: 78%;
	}
	.supply {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		/* Fixed width so the layout doesn't shift when the supply depletes. */
		min-width: clamp(80px, 11vw, 120px);
	}
	.supply-label {
		font: var(--font-w-bold) clamp(20px, 3vw, 28px) / 1 var(--font-display);
		opacity: 0.9;
		font-variant-numeric: tabular-nums;
	}
	.supply-row {
		/* Row-major flow (left → right, then top → bottom), left-aligned so
		   the remainder always anchors to the same starting position and the
		   layout stays stable regardless of how many tokens are present. */
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 4px;
		max-width: 320px;
		justify-content: flex-start;
		align-content: flex-start;
		min-height: 80px;
	}
	.supply-dot {
		width: clamp(36px, 5vw, 56px);
		height: clamp(36px, 5vw, 56px);
		position: relative;
		transition:
			opacity var(--motion-fast) var(--ease-out),
			filter var(--motion-fast) var(--ease-out);
	}
	.supply-token,
	.supply-ghost {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.supply-token {
		z-index: 100;
	}
	.supply-ghost {
		z-index: 1;
		/* Hidden under the active sprite; only revealed when the active has
		   moved away (.supply-dot gains .used). */
		opacity: 0;
		transition: opacity var(--motion-fast) var(--ease-out);
	}
	.supply-dot.used .supply-ghost {
		opacity: 0.5;
		filter: grayscale(0.85);
	}
	.supply-dot.used {
		opacity: 0.45;
		filter: grayscale(0.7);
	}
	.supply-dot.used::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(
				to top right,
				transparent calc(50% - 2px),
				#ef4444 calc(50% - 2px),
				#ef4444 calc(50% + 2px),
				transparent calc(50% + 2px)
			),
			linear-gradient(
				to top left,
				transparent calc(50% - 2px),
				#ef4444 calc(50% - 2px),
				#ef4444 calc(50% + 2px),
				transparent calc(50% + 2px)
			);
		pointer-events: none;
		animation: x-fade 240ms var(--ease-out);
	}
	@keyframes x-fade {
		from {
			opacity: 0;
			transform: scale(0.6);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	.operand-row {
		display: flex;
		/* Bottom-align so the ones-frames line up across operands even when
		   one side has bundles stacking above. The operation symbol (+/−)
		   floats with the row. */
		align-items: flex-end;
		gap: var(--space-4);
		justify-content: center;
		min-height: 280px;
	}
	.operand-row > .op-sym {
		/* Vertically center the operator on the ones-frame baseline (which
		   is now bottom-aligned). */
		align-self: center;
		margin-bottom: 36px;
	}
	.op-sym {
		font: var(--font-w-bold) clamp(28px, 4vw, 48px) / 1 var(--font-display);
	}
	.num-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		min-width: 200px;
	}
	.bundles {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: center;
		min-height: 50px;
	}
	.bundle {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		grid-template-rows: repeat(2, 1fr);
		gap: 2px;
		padding: 4px;
		background: var(--frame-bg);
		border: 2px solid var(--frame-border);
		border-radius: var(--radius-md);
		animation: spawn 320ms var(--ease-out) backwards;
		animation-delay: var(--spawn-delay, 0ms);
		position: relative;
		transition:
			opacity var(--motion-fast) var(--ease-out),
			filter var(--motion-fast) var(--ease-out);
	}
	/* Slot wrapper holds ghost + active layered. Sized by the ghost. */
	.bundle-slot {
		position: relative;
		display: inline-block;
	}
	.b-ghost-bundle,
	.b-active-bundle {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		grid-template-rows: repeat(2, 1fr);
		gap: 2px;
		padding: 4px;
		background: var(--frame-bg);
		border: 2px solid var(--frame-border);
		border-radius: var(--radius-md);
	}
	.b-active-bundle {
		position: absolute;
		inset: 0;
		z-index: 100;
	}
	.b-ghost-bundle {
		opacity: 0;
		transition: opacity var(--motion-fast) var(--ease-out);
	}
	.bundle-slot.used .b-ghost-bundle {
		opacity: 0.5;
		filter: grayscale(0.85);
	}
	.bundle-cell.from-b,
	.ones-cell.from-b,
	.cell.from-b {
		background: var(--tint-from-b);
		border-radius: 4px;
		box-shadow: inset 0 0 0 1.5px var(--tint-from-b-border);
	}
	.bundle-cell.from-b,
	.ones-cell.from-b {
		/* Slide-in for two-digit cells that don't have crossfade. Within-20
		   .cell.from-b is excluded because its child .cell-token uses crossfade,
		   and the parent's transform: scale(...) would compound with crossfade's
		   own transform → sprite shrinks dramatically during transit. */
		animation: slide-from-right 480ms var(--ease-out) backwards;
		animation-delay: var(--spawn-delay, 0ms);
	}
	.bundle-cell.removed,
	.ones-cell.removed,
	.cell.removed {
		background: var(--tint-removed);
		border-radius: 4px;
		box-shadow: inset 0 0 0 1.5px var(--tint-removed-border);
		/* Removed pieces puff in — the kid sees the X/tint appearing where the
		   token used to be. */
		animation: removed-puff 360ms var(--ease-out) backwards;
		animation-delay: var(--spawn-delay, 0ms);
	}
	@keyframes slide-from-right {
		from {
			transform: translateX(60px) scale(0.6);
			opacity: 0;
		}
		60% {
			transform: translateX(-4px) scale(1.05);
			opacity: 1;
		}
		to {
			transform: translateX(0) scale(1);
			opacity: 1;
		}
	}
	@keyframes removed-puff {
		from {
			transform: scale(1.4);
			opacity: 0;
		}
		60% {
			transform: scale(0.92);
			opacity: 1;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
	.bundle-slot.used::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(
				to top right,
				transparent calc(50% - 3px),
				#ef4444 calc(50% - 3px),
				#ef4444 calc(50% + 3px),
				transparent calc(50% + 3px)
			),
			linear-gradient(
				to top left,
				transparent calc(50% - 3px),
				#ef4444 calc(50% - 3px),
				#ef4444 calc(50% + 3px),
				transparent calc(50% + 3px)
			);
		pointer-events: none;
		animation: x-fade 240ms var(--ease-out);
		z-index: 200;
	}
	.ones-cell.used {
		opacity: 0.45;
		filter: grayscale(0.7);
		position: relative;
	}
	.ones-cell.used::after {
		content: '';
		position: absolute;
		inset: 4px;
		background-image:
			linear-gradient(
				to top right,
				transparent calc(50% - 1.5px),
				#ef4444 calc(50% - 1.5px),
				#ef4444 calc(50% + 1.5px),
				transparent calc(50% + 1.5px)
			),
			linear-gradient(
				to top left,
				transparent calc(50% - 1.5px),
				#ef4444 calc(50% - 1.5px),
				#ef4444 calc(50% + 1.5px),
				transparent calc(50% + 1.5px)
			);
		pointer-events: none;
		animation: x-fade 240ms var(--ease-out);
	}
	.bundle-cell {
		width: clamp(14px, 2vw, 22px);
		height: clamp(14px, 2vw, 22px);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ones-frame {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		grid-template-rows: repeat(2, 1fr);
		gap: 4px;
		padding: 6px;
		background: var(--frame-bg);
		border: 2px solid var(--frame-border);
		border-radius: var(--radius-md);
	}
	.ones-cell {
		width: clamp(28px, 4.5vw, 48px);
		height: clamp(28px, 4.5vw, 48px);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--cell-empty);
		border: 1px solid var(--cell-border);
		border-radius: var(--radius-sm);
	}
	.num-label {
		margin-top: 4px;
		font: var(--font-w-bold) clamp(16px, 2.5vw, 22px) / 1 var(--font-display);
		font-variant-numeric: tabular-nums;
		opacity: 0.85;
	}
	@keyframes spawn {
		0% {
			transform: scale(0.2);
			opacity: 0;
			box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.85);
		}
		60% {
			transform: scale(1.15);
			opacity: 1;
			box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.7);
		}
		100% {
			transform: scale(1);
			opacity: 1;
			box-shadow: 0 0 0 0 transparent;
		}
	}
	.token {
		display: block;
		width: 100%;
		height: 100%;
		overflow: hidden;
		position: relative;
	}
	.token-sheet {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		width: auto;
		image-rendering: pixelated;
		pointer-events: none;
	}
	.token-sheet.animated {
		animation: token-bob var(--token-duration) steps(var(--token-frames)) infinite;
	}
	@keyframes token-bob {
		from {
			transform: translateX(0);
		}
		to {
			/* The img is `frames × containerW` wide; translateX(-100%) shifts by
			   the img's own width. With steps(N), each step = -1/N of img width
			   = -1 frame width. */
			transform: translateX(-100%);
		}
	}
	.options {
		display: flex;
		gap: var(--space-3);
		justify-content: center;
		width: 100%;
		max-width: 480px;
	}
	.opt {
		flex: 1;
		min-width: 0;
		padding: var(--space-3) var(--space-2);
		font: var(--font-w-bold) clamp(24px, 4vw, 40px) / 1 var(--font-display);
		font-variant-numeric: tabular-nums;
		background: var(--btn-bg);
		color: var(--color-fg-50);
		border: 2px solid var(--btn-border);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition:
			background var(--motion-fast) var(--ease-out),
			transform var(--motion-fast) var(--ease-out);
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
	.opt:not(:disabled):hover {
		background: var(--btn-hover);
	}
	.opt:not(:disabled):active {
		transform: scale(0.94);
	}
	.opt.correct {
		background: rgba(34, 197, 94, 0.55);
		border-color: rgba(74, 222, 128, 0.95);
		color: white;
	}
	.opt.wrong {
		background: rgba(220, 38, 38, 0.55);
		border-color: rgba(248, 113, 113, 0.95);
		color: white;
	}
	.opt.reveal {
		background: rgba(34, 197, 94, 0.4);
		border-color: rgba(74, 222, 128, 0.85);
		color: white;
		animation: reveal-pulse 600ms ease-out;
	}
	@keyframes reveal-pulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
