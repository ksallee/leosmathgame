<script lang="ts">
	import type { CharacterManifest } from '$lib/sprites/manifest';

	type StateKey = 'idle' | 'run' | 'hit' | 'attack' | 'jump' | 'fall';

	interface Props {
		character: CharacterManifest;
		state?: StateKey;
		height?: number;
		flip?: boolean;
	}

	let { character, state = 'idle', height = 128, flip = false }: Props = $props();

	// Pre-decode every state's sprite sheet for the current character so the
	// browser has them in cache by the time the platformer / number-line
	// scene swaps state mid-jump. Without this, a state change triggers an
	// async image fetch+decode and the sprite is briefly invisible.
	$effect(() => {
		void character.id;
		const states = ['idle', 'run', 'hit', 'attack', 'jump', 'fall'] as const;
		for (const k of states) {
			const s = character[k];
			if (!s) continue;
			const img = new Image();
			img.decoding = 'async';
			img.src = s.src;
		}
	});

	const current = $derived(character[state] ?? character.idle);
	// XOR with the manifest's native facing so callers don't need to know which
	// direction the source art was drawn in. `<Sprite />` always means "face
	// right", `<Sprite flip />` always means "face left".
	const effectiveFlip = $derived(character.facingLeft ? !flip : flip);
	const bodyH = $derived(current.frameH - (current.bottomPad ?? 0));
	const scale = $derived(height / bodyH);
	const w = $derived(current.frameW * scale);
	const h = $derived(current.frameH * scale);
	const visibleH = $derived(bodyH * scale);
	const totalW = $derived(w * current.frames);

	// Force the CSS frame-stepping animation to restart whenever the sprite
	// sheet changes. CSS `steps(n)` doesn't accept dynamic values — and
	// changing animation params on a running animation doesn't reset its
	// timeline — so we briefly null `animation` then unset to retrigger.
	// Doing this without unmounting the DOM (which the previous {#key}
	// approach did) avoids the 1-frame "hero disappears" gap during fast
	// idle ↔ run ↔ jump ↔ fall transitions.
	let spriteEl: HTMLDivElement | undefined;
	$effect(() => {
		void current.src;
		void current.frames;
		void current.durationMs;
		void current.loop;
		if (!spriteEl) return;
		spriteEl.style.animation = 'none';
		void spriteEl.offsetWidth;
		spriteEl.style.animation = '';
	});
</script>

<div class="wrap" style:width="{w}px" style:height="{visibleH}px">
	<div
		bind:this={spriteEl}
		class="sprite"
		class:flip={effectiveFlip}
		class:loop={current.loop}
		class:once={!current.loop}
		style:--bg="url({current.src})"
		style:--w="{w}px"
		style:--h="{h}px"
		style:--total-w="{totalW}px"
		style:--frames={current.frames}
		style:--dur="{current.durationMs}ms"
		style:--rest-x="{current.frames <= 1 ? 0 : -(totalW - w)}px"
	></div>
</div>

<style>
	.wrap {
		display: inline-block;
		position: relative;
	}
	.sprite {
		width: var(--w);
		height: var(--h);
		background-image: var(--bg);
		background-size: var(--total-w) var(--h);
		background-repeat: no-repeat;
		/* Resting bg-x is 0 for single-frame states (just show frame 0) and
		   -(N-1)*W for multi-frame "once" states (hold the last frame after
		   the animation finishes). The animation keyframes override this
		   while running; once the animation property no longer applies (no
		   `forwards`), bg-position-x reverts to this base value. */
		background-position-x: var(--rest-x);
		background-position-y: 0;
		image-rendering: pixelated;
		filter: drop-shadow(0 6px 4px rgba(0, 0, 0, 0.55));
		transform-origin: 50% 100%;
	}
	.sprite.flip {
		transform: scaleX(-1);
	}
	.sprite.loop {
		animation: play var(--dur) steps(var(--frames)) infinite;
	}
	.sprite.once {
		/* No `forwards` — after one cycle the property reverts to the inline
		   --rest-x value (the last frame), instead of snapping to -total-w
		   which is off the end of the sheet and shows nothing. */
		animation: play var(--dur) steps(var(--frames)) 1;
	}
	@keyframes play {
		from {
			background-position-x: 0;
		}
		to {
			background-position-x: calc(-1 * var(--total-w));
		}
	}
</style>
