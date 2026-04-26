<script lang="ts">
	import { worldThemeFor, type WorldTheme } from '$lib/game/levelConfig';

	interface Props {
		level: number;
	}
	let { level }: Props = $props();

	const theme = $derived(worldThemeFor(level));
	const isBoss = $derived(level % 5 === 0);

	const SKY: Record<WorldTheme, string> = {
		forest: 'linear-gradient(180deg, #4ade80 0%, #86efac 35%, #bef264 70%, #d9f99d 100%)',
		desert: 'linear-gradient(180deg, #fde047 0%, #fbbf24 35%, #f97316 70%, #ea580c 100%)',
		cave: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 40%, #4f46e5 80%, #6366f1 100%)',
		snow: 'linear-gradient(180deg, #cbd5e1 0%, #94a3b8 50%, #64748b 100%)',
		pirate: 'linear-gradient(180deg, #38bdf8 0%, #0ea5e9 35%, #0369a1 70%, #075985 100%)'
	};

	const SUN_GLOW: Record<WorldTheme, string> = {
		forest: 'radial-gradient(ellipse at 75% 18%, rgba(255, 255, 200, 0.55), transparent 40%)',
		desert: 'radial-gradient(ellipse at 80% 16%, rgba(255, 240, 180, 0.7), transparent 45%)',
		cave: 'radial-gradient(ellipse at 30% 12%, rgba(180, 200, 255, 0.4), transparent 50%)',
		snow: 'radial-gradient(ellipse at 50% 14%, rgba(255, 255, 255, 0.5), transparent 55%)',
		pirate: 'radial-gradient(ellipse at 70% 18%, rgba(255, 240, 200, 0.6), transparent 45%)'
	};
</script>

<div class="world" class:boss={isBoss}>
	<div class="sky" style:background={SKY[theme]}></div>
	<div class="sun" style:background={SUN_GLOW[theme]}></div>
	<div class="vignette"></div>
</div>

<style>
	.world {
		position: absolute;
		inset: 0;
		overflow: hidden;
		border-radius: var(--radius-xl);
	}
	.sky {
		position: absolute;
		inset: 0;
	}
	.sun {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.vignette {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.45) 95%),
			linear-gradient(180deg, rgba(0, 0, 0, 0.18), transparent 30%);
		pointer-events: none;
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
