<script lang="ts">
	import type { SessionOutcome } from '$lib/game/session';

	export type LevelUpKind = 'band' | 'stage' | null;

	interface Props {
		outcome: SessionOutcome;
		correct: number;
		wrong: number;
		stars: number;
		coinsCollected: number;
		coinsTotal: number;
		earnedCoins: number;
		bonusCoins: number;
		isReplay: boolean;
		levelUp?: LevelUpKind;
		onNext: () => void;
		onMap: () => void;
	}

	let {
		outcome,
		correct,
		wrong,
		stars,
		coinsCollected,
		coinsTotal,
		earnedCoins,
		bonusCoins,
		isReplay,
		levelUp = null,
		onNext,
		onMap
	}: Props = $props();

	const won = $derived(outcome === 'won');
</script>

<div class="overlay" role="dialog">
	<div class="card" class:won class:lost={!won}>
		<div class="banner-row">
			<div class="ribbon" class:won class:lost={!won}>
				{won ? 'GAGNÉ !' : 'PERDU !'}
			</div>
		</div>

		{#if won}
			<div class="stars-plaque">
				{#each [0, 1, 2] as i (i)}
					<span class="star" class:on={i < stars}>★</span>
				{/each}
			</div>
		{/if}

		{#if won && levelUp === 'band'}
			<div class="level-up-badge band">⭐ Niveau supérieur !</div>
		{:else if won && levelUp === 'stage'}
			<div class="level-up-badge stage">🔓 Mode débloqué !</div>
		{/if}

		<div class="paper">
			<div class="line">
				<span class="key">Bonnes</span>
				<span class="val good">{correct}</span>
			</div>
			<div class="line">
				<span class="key">Mauvaises</span>
				<span class="val bad">{wrong}</span>
			</div>
			{#if won && earnedCoins > 0}
				<div class="line big">
					<span class="key">Récompense</span>
					<span class="val gold">+{earnedCoins} 🪙</span>
				</div>
			{/if}
			{#if won && bonusCoins > 0}
				<div class="line big">
					<span class="key">Trésors ({coinsCollected}/{coinsTotal})</span>
					<span class="val gold">+{bonusCoins} 🪙</span>
				</div>
			{/if}
			{#if won && isReplay}
				<div class="replay-note">Rejouée — récompense seulement sur trésors</div>
			{/if}
		</div>

		<div class="actions">
			{#if won && isReplay}
				<button class="wood-btn primary" onclick={onMap}>Carte des niveaux</button>
			{:else if won}
				<button class="wood-btn primary" onclick={onNext}>Suivant ▶</button>
				<button class="wood-btn" onclick={onMap}>Carte des niveaux</button>
			{:else}
				<button class="wood-btn primary" onclick={onNext}>Réessayer</button>
				<button class="wood-btn" onclick={onMap}>Carte des niveaux</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: var(--surface-overlay);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-6);
		backdrop-filter: blur(6px);
		animation: overlay-in var(--motion-normal) var(--ease-out);
		z-index: 100;
	}
	@keyframes overlay-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.card {
		position: relative;
		width: min(720px, 90vw);
		min-height: min(560px, 80vh);
		padding: clamp(24px, 4vw, 48px) clamp(20px, 4vw, 56px) clamp(28px, 4vw, 48px);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(16px, 3vh, 28px);
		background:
			repeating-linear-gradient(
				180deg,
				rgba(0, 0, 0, 0.04) 0 6px,
				transparent 6px 24px,
				rgba(0, 0, 0, 0.04) 24px 30px,
				transparent 30px 56px
			),
			linear-gradient(180deg, #d9a26b 0%, #b27a40 50%, #8a5524 100%);
		border-radius: 20px;
		box-shadow:
			inset 0 4px 0 rgba(255, 230, 180, 0.5),
			inset 0 -10px 0 rgba(0, 0, 0, 0.3),
			0 0 0 6px #5a3a1a,
			0 0 0 8px #2a1810,
			0 24px 60px rgba(0, 0, 0, 0.7);
		animation: card-pop 0.45s var(--ease-bounce);
	}
	.card.lost {
		background:
			repeating-linear-gradient(
				180deg,
				rgba(0, 0, 0, 0.05) 0 6px,
				transparent 6px 24px,
				rgba(0, 0, 0, 0.05) 24px 30px,
				transparent 30px 56px
			),
			linear-gradient(180deg, #6b4030 0%, #4a2a1f 60%, #2f1a13 100%);
	}
	@keyframes card-pop {
		0% {
			transform: scale(0.6) translateY(40px);
			opacity: 0;
		}
		70% {
			transform: scale(1.03) translateY(-4px);
			opacity: 1;
		}
		100% {
			transform: scale(1) translateY(0);
		}
	}

	.banner-row {
		margin-top: clamp(-60px, -6vh, -40px);
		display: flex;
		justify-content: center;
		filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.5));
	}
	.ribbon {
		position: relative;
		padding: 14px 56px;
		color: #fff;
		font: var(--font-w-bold) clamp(40px, 6vw, 68px) / 1 var(--font-display);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		text-shadow:
			0 2px 0 rgba(0, 0, 0, 0.6),
			0 4px 8px rgba(0, 0, 0, 0.5);
		clip-path: polygon(0 0, 6% 50%, 0 100%, 100% 100%, 94% 50%, 100% 0);
		box-shadow:
			inset 0 2px 0 rgba(255, 255, 255, 0.4),
			inset 0 -4px 0 rgba(0, 0, 0, 0.3);
	}
	.ribbon.won {
		background: linear-gradient(180deg, #22c55e 0%, #15803d 50%, #14532d 100%);
	}
	.ribbon.lost {
		background: linear-gradient(180deg, #ef4444 0%, #b91c1c 50%, #7f1d1d 100%);
	}

	.stars-plaque {
		display: flex;
		gap: clamp(12px, 2vw, 28px);
		font-size: clamp(60px, 9vw, 110px);
		line-height: 1;
	}
	.star {
		color: rgba(0, 0, 0, 0.3);
		text-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
		transform: scale(0.85);
	}
	.star.on {
		color: #facc15;
		text-shadow:
			0 0 18px rgba(252, 211, 77, 0.8),
			0 4px 0 #78350f,
			0 6px 8px rgba(0, 0, 0, 0.5);
		animation: star-pop 0.6s var(--ease-bounce) backwards;
	}
	.star.on:nth-child(1) {
		animation-delay: 0.25s;
	}
	.star.on:nth-child(2) {
		animation-delay: 0.45s;
	}
	.star.on:nth-child(3) {
		animation-delay: 0.65s;
	}
	@keyframes star-pop {
		0% {
			transform: scale(0) rotate(-180deg);
			opacity: 0;
		}
		70% {
			transform: scale(1.3) rotate(8deg);
			opacity: 1;
		}
		100% {
			transform: scale(1.1);
			opacity: 1;
		}
	}

	.paper {
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: min(460px, 90%);
		padding: clamp(16px, 2.5vh, 24px) clamp(20px, 3vw, 32px);
		background:
			radial-gradient(ellipse at top left, rgba(255, 255, 255, 0.15), transparent 60%),
			linear-gradient(180deg, #fef3c7, #fde68a);
		border-radius: 12px;
		box-shadow:
			inset 0 2px 4px rgba(255, 255, 255, 0.6),
			inset 0 -2px 4px rgba(0, 0, 0, 0.15),
			0 0 0 3px #5a3a1a,
			0 4px 0 rgba(0, 0, 0, 0.3);
	}
	.line {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font: var(--font-w-medium) clamp(18px, 2.4vw, 24px) / 1.2 var(--font-display);
		color: #5a3a1a;
	}
	.line.big {
		font-size: clamp(22px, 3vw, 30px);
		padding-top: 8px;
		border-top: 2px dashed rgba(90, 58, 26, 0.25);
		margin-top: 4px;
	}
	.key {
		color: rgba(90, 58, 26, 0.7);
	}
	.val {
		color: #3a2410;
		font-weight: var(--font-w-bold);
		font-variant-numeric: tabular-nums;
	}
	.val.good {
		color: #15803d;
	}
	.val.bad {
		color: #b91c1c;
	}
	.val.gold {
		color: #b45309;
	}
	.replay-note {
		text-align: center;
		font-style: italic;
		color: rgba(90, 58, 26, 0.6);
		font-size: clamp(13px, 1.5vw, 17px);
		margin-top: 4px;
	}
	.level-up-badge {
		padding: 8px 24px;
		font: var(--font-w-bold) clamp(20px, 2.6vw, 28px) / 1 var(--font-display);
		color: #fff;
		text-shadow:
			0 2px 0 rgba(0, 0, 0, 0.5),
			0 4px 8px rgba(0, 0, 0, 0.4);
		border-radius: var(--radius-pill);
		box-shadow:
			inset 0 2px 0 rgba(255, 255, 255, 0.3),
			inset 0 -3px 0 rgba(0, 0, 0, 0.3),
			0 6px 14px rgba(0, 0, 0, 0.5);
		animation: badge-pop 0.5s var(--ease-bounce) backwards;
		animation-delay: 0.7s;
	}
	.level-up-badge.band {
		background: linear-gradient(180deg, #a855f7 0%, #7e22ce 50%, #581c87 100%);
		box-shadow:
			inset 0 2px 0 rgba(255, 255, 255, 0.3),
			inset 0 -3px 0 rgba(0, 0, 0, 0.3),
			0 0 0 3px #4c1d95,
			0 6px 14px rgba(0, 0, 0, 0.5);
	}
	.level-up-badge.stage {
		background: linear-gradient(180deg, #38bdf8 0%, #0284c7 50%, #075985 100%);
		box-shadow:
			inset 0 2px 0 rgba(255, 255, 255, 0.3),
			inset 0 -3px 0 rgba(0, 0, 0, 0.3),
			0 0 0 3px #0c4a6e,
			0 6px 14px rgba(0, 0, 0, 0.5);
		font-size: clamp(18px, 2.3vw, 24px);
	}
	@keyframes badge-pop {
		0% {
			transform: scale(0) rotate(-8deg);
			opacity: 0;
		}
		70% {
			transform: scale(1.15) rotate(2deg);
			opacity: 1;
		}
		100% {
			transform: scale(1) rotate(0);
		}
	}

	.actions {
		display: flex;
		gap: clamp(12px, 2vw, 24px);
		flex-wrap: wrap;
		justify-content: center;
		margin-top: auto;
		padding-top: clamp(16px, 3vh, 28px);
	}
	.wood-btn {
		position: relative;
		padding: clamp(14px, 2vh, 22px) clamp(28px, 4vw, 48px);
		min-width: clamp(180px, 22vw, 240px);
		font: var(--font-w-bold) clamp(20px, 2.4vw, 26px) / 1 var(--font-display);
		color: #fef9c3;
		text-shadow:
			0 1px 0 rgba(0, 0, 0, 0.4),
			0 2px 4px rgba(0, 0, 0, 0.3);
		background: linear-gradient(180deg, #b45309 0%, #92400e 60%, #78350f 100%);
		border: none;
		border-radius: 10px;
		box-shadow:
			inset 0 2px 0 rgba(255, 200, 130, 0.5),
			inset 0 -3px 0 rgba(0, 0, 0, 0.4),
			0 0 0 3px #4a2c0e,
			0 5px 0 #4a2c0e,
			0 8px 12px rgba(0, 0, 0, 0.5);
		cursor: pointer;
		transition: transform 0.08s var(--ease-out);
	}
	.wood-btn.primary {
		background: linear-gradient(180deg, #16a34a 0%, #15803d 60%, #14532d 100%);
		box-shadow:
			inset 0 2px 0 rgba(180, 240, 180, 0.5),
			inset 0 -3px 0 rgba(0, 0, 0, 0.4),
			0 0 0 3px #14532d,
			0 5px 0 #14532d,
			0 8px 12px rgba(0, 0, 0, 0.5);
	}
	.wood-btn:active {
		transform: translateY(4px);
		box-shadow:
			inset 0 2px 0 rgba(255, 200, 130, 0.5),
			inset 0 -3px 0 rgba(0, 0, 0, 0.4),
			0 0 0 3px #4a2c0e,
			0 1px 0 #4a2c0e;
	}
	.wood-btn.primary:active {
		box-shadow:
			inset 0 2px 0 rgba(180, 240, 180, 0.5),
			inset 0 -3px 0 rgba(0, 0, 0, 0.4),
			0 0 0 3px #14532d,
			0 1px 0 #14532d;
	}
</style>
