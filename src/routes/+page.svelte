<script lang="ts">
	// Placeholder home — real game UI will replace this.
</script>

<main>
	<h1>Maths Game</h1>
	<p>v1 en construction.</p>
	<a href="/levels" class="cta">Jouer</a>
	<a href="/debug" class="cta-secondary">Debug</a>
</main>

<style>
	main {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		padding: var(--space-8);
	}
	h1 {
		font: var(--font-w-bold) var(--text-3xl) / var(--leading-tight) var(--font-display);
	}
	p {
		color: var(--text-muted);
	}
	.cta {
		margin-top: var(--space-8);
		padding: var(--space-4) var(--space-10);
		border-radius: var(--radius-pill);
		background: var(--color-primary-500);
		color: var(--color-bg-900);
		font-weight: var(--font-w-bold);
		font-size: var(--text-xl);
		box-shadow: var(--shadow-md);
		transition: transform var(--motion-fast) var(--ease-out);
	}
	.cta:active {
		transform: scale(0.97);
	}
	.cta-secondary {
		margin-top: var(--space-3);
		padding: var(--space-2) var(--space-4);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
</style>
