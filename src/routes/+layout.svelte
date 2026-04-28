<script lang="ts">
	import { onMount } from 'svelte';
	import { unlock } from '$lib/audio/sfx';
	import '../app.css';

	let { children } = $props();

	// Warm up audio on the very first user interaction. Without this, the
	// first in-game `play()` call races the unlock and gets swallowed — the
	// kid hears no sound on their first win/lose, only from the second on.
	onMount(() => {
		const handler = () => {
			unlock();
			window.removeEventListener('pointerdown', handler);
			window.removeEventListener('keydown', handler);
		};
		window.addEventListener('pointerdown', handler, { once: false });
		window.addEventListener('keydown', handler, { once: false });
		return () => {
			window.removeEventListener('pointerdown', handler);
			window.removeEventListener('keydown', handler);
		};
	});
</script>

{@render children()}

<!-- Mobile-too-small overlay. The game's hit targets, prompt sizing and
     pad layout are tuned for iPad (~768px+). Anything smaller becomes a
     thumb-fight and the kid will hate it. -->
<div class="too-small" role="alertdialog" aria-label="Écran trop petit">
	<div class="ts-card">
		<div class="ts-emoji">📱→💻</div>
		<div class="ts-title">Écran un peu petit !</div>
		<div class="ts-body">Léo joue mieux sur tablette ou ordinateur.</div>
	</div>
</div>

<style>
	.too-small {
		display: none;
	}
	@media (max-width: 767px) {
		.too-small {
			display: flex;
			position: fixed;
			inset: 0;
			z-index: 9999;
			align-items: center;
			justify-content: center;
			background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%), #0f172a;
			padding: 24px;
		}
		.ts-card {
			max-width: 380px;
			padding: 32px 24px;
			text-align: center;
			background:
				repeating-linear-gradient(180deg, rgba(0, 0, 0, 0.04) 0 6px, transparent 6px 24px),
				linear-gradient(180deg, #d9a26b 0%, #b27a40 50%, #8a5524 100%);
			border-radius: 20px;
			box-shadow:
				inset 0 4px 0 rgba(255, 230, 180, 0.5),
				inset 0 -10px 0 rgba(0, 0, 0, 0.3),
				0 0 0 6px #5a3a1a,
				0 0 0 8px #2a1810,
				0 24px 60px rgba(0, 0, 0, 0.7);
		}
		.ts-emoji {
			font-size: 64px;
			line-height: 1;
			margin-bottom: 16px;
		}
		.ts-title {
			font:
				700 22px / 1.2 system-ui,
				sans-serif;
			color: #fef3c7;
			text-shadow: 0 2px 0 rgba(0, 0, 0, 0.5);
			margin-bottom: 12px;
		}
		.ts-body {
			font:
				500 16px / 1.4 system-ui,
				sans-serif;
			color: #fde68a;
		}
	}
</style>
