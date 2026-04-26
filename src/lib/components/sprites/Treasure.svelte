<script lang="ts">
	import type { TreasureManifest } from '$lib/sprites/manifest';

	interface Props {
		treasure: TreasureManifest;
		height?: number;
		state?: 'idle' | 'taken';
	}

	let { treasure, height = 36, state = 'idle' }: Props = $props();

	const scale = $derived(height / treasure.frameH);
	const w = $derived(treasure.frameW * scale);
	const h = $derived(treasure.frameH * scale);
	const totalW = $derived(w * treasure.frames);
</script>

<div
	class="treasure"
	class:taken={state === 'taken'}
	style:width="{w}px"
	style:height="{h}px"
	style:--bg="url({treasure.src})"
	style:--w="{w}px"
	style:--h="{h}px"
	style:--total-w="{totalW}px"
	style:--frames={treasure.frames}
	style:--dur="{treasure.durationMs}ms"
></div>

<style>
	.treasure {
		display: inline-block;
		background-image: var(--bg);
		background-size: var(--total-w) var(--h);
		background-repeat: no-repeat;
		background-position: 0 0;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 8px rgba(250, 204, 21, 0.4));
		animation: spin var(--dur) steps(var(--frames)) infinite;
	}
	@keyframes spin {
		from {
			background-position-x: 0;
		}
		to {
			background-position-x: calc(-1 * var(--total-w));
		}
	}
	.treasure.taken {
		animation:
			spin var(--dur) steps(var(--frames)) infinite,
			vanish 0.4s ease-out forwards;
	}
	@keyframes vanish {
		0% {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
		100% {
			transform: scale(0.4) translateY(-30px);
			opacity: 0;
		}
	}
</style>
