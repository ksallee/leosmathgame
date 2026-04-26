<script lang="ts">
	import type { CharacterManifest } from '$lib/sprites/manifest';

	type StateKey = 'idle' | 'run' | 'hit' | 'attack';

	interface Props {
		character: CharacterManifest;
		state?: StateKey;
		height?: number;
		flip?: boolean;
	}

	let { character, state = 'idle', height = 128, flip = false }: Props = $props();

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
</script>

{#key character.id + state}
	<div class="wrap" style:width="{w}px" style:height="{visibleH}px">
		<div
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
		></div>
	</div>
{/key}

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
		background-position: 0 0;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
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
		animation: play var(--dur) steps(var(--frames)) 1 forwards;
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
