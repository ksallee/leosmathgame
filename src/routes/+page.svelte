<script lang="ts">
	import { clearAll } from '$lib/storage/persist';

	const isDev = import.meta.env.DEV;
	let resetting = $state(false);

	async function resetProfile() {
		if (resetting) return;
		const ok = confirm('Effacer toute la progression ? Cette action est irréversible.');
		if (!ok) return;
		resetting = true;
		await clearAll();
		// Hard reload so any in-memory profile state in /levels or /play is wiped.
		window.location.href = '/';
	}
</script>

<main>
	<h1>Maths Game</h1>
	<p>v1 en construction.</p>
	<a href="/levels" class="cta">Jouer</a>
	<a href="/debug" class="cta-secondary">Debug</a>
	{#if isDev}
		<a href="/lab" class="cta-secondary">Lab (dev)</a>
	{/if}
	<button class="cta-danger" type="button" onclick={resetProfile} disabled={resetting}>
		{resetting ? 'Effacement…' : 'Réinitialiser le profil'}
	</button>
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
	.cta-danger {
		margin-top: var(--space-6);
		padding: var(--space-2) var(--space-4);
		background: transparent;
		border: 1px solid rgba(239, 68, 68, 0.4);
		color: rgba(239, 68, 68, 0.85);
		font-size: var(--text-sm);
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: background var(--motion-fast) var(--ease-out);
	}
	.cta-danger:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.1);
	}
	.cta-danger:disabled {
		opacity: 0.5;
		cursor: wait;
	}
</style>
