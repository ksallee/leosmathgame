<script lang="ts">
	// Lab index — list of dev-only test scenes.
</script>

<main>
	<h1>Lab</h1>
	<p>Dev-only sandboxes for tuning new mini-game mechanics before shipping.</p>

	<ul class="scenes">
		<li>
			<a href="/lab/platformer">
				<strong>Platformer tune</strong>
				<span
					>Keyboard-controlled hero on a test level. Sliders for gravity, jump, run physics, scale.
					Copy-config output for production use.</span
				>
			</a>
		</li>
		<li>
			<a href="/lab/numberline">
				<strong>Number-line jump tune</strong>
				<span
					>Number-line mini-game scene. Tap a tick → hero hops to it. Sliders for range, tick
					spacing, hop arc + duration, hero scale. Iterate on level-design feel.</span
				>
			</a>
		</li>
	</ul>

	<a class="back" href="/">← Retour</a>
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: var(--space-8) var(--space-6);
		color: var(--text-primary);
	}
	h1 {
		font: var(--font-w-bold) var(--text-3xl) / 1 var(--font-display);
		margin-bottom: var(--space-3);
	}
	p {
		color: var(--text-muted);
		margin-bottom: var(--space-6);
	}
	.scenes {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.scenes a {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: var(--space-4);
		background: rgba(15, 23, 42, 0.65);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--text-primary);
		border: 1px solid rgba(255, 255, 255, 0.08);
		transition: background var(--motion-fast) var(--ease-out);
	}
	.scenes a:hover {
		background: rgba(15, 23, 42, 0.85);
	}
	.scenes strong {
		font: var(--font-w-bold) var(--text-lg) / 1 var(--font-display);
	}
	.scenes span {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
	.back {
		display: inline-block;
		margin-top: var(--space-8);
		color: var(--text-muted);
		font-size: var(--text-sm);
		text-decoration: none;
	}
</style>
