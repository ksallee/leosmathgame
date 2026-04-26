<script lang="ts">
	interface Props {
		level: number;
	}
	let { level }: Props = $props();

	const THEMES = ['blue', 'green', 'yellow', 'purple', 'pink', 'brown', 'gray'] as const;
	const theme = $derived(THEMES[Math.floor((level - 1) / 5) % THEMES.length]);
	const isBoss = $derived(level % 5 === 0);
</script>

<div class="world" class:boss={isBoss}>
	<div class="pattern" style:background-image="url(/sprites/bg/{theme}.png)"></div>
	<div class="vignette"></div>
	<div class="ground"></div>
</div>

<style>
	.world {
		position: absolute;
		inset: 0;
		overflow: hidden;
		border-radius: var(--radius-xl);
	}
	.pattern {
		position: absolute;
		inset: 0;
		background-size: 64px 64px;
		background-repeat: repeat;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		opacity: 0.85;
	}
	.vignette {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.45) 90%),
			linear-gradient(180deg, rgba(0, 0, 0, 0.25), transparent 25%);
		pointer-events: none;
	}
	.ground {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 28%;
		background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.55));
		pointer-events: none;
	}
	.world.boss .pattern {
		filter: hue-rotate(-15deg) saturate(1.2) brightness(0.85);
	}
	.world.boss::after {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at 50% 70%, rgba(239, 68, 68, 0.22), transparent 60%);
		pointer-events: none;
		animation: boss-pulse 3s ease-in-out infinite;
	}
	@keyframes boss-pulse {
		0%,
		100% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
	}
</style>
