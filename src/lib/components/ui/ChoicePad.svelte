<script lang="ts">
	interface Props {
		choices: number[];
		onpick: (value: number) => void;
		disabled?: boolean;
	}

	let { choices, onpick, disabled = false }: Props = $props();
</script>

<div class="choices" class:disabled>
	{#each choices as c (c)}
		<button class="choice" {disabled} onclick={() => onpick(c)}>{c}</button>
	{/each}
</div>

<style>
	.choices {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-2);
		width: 100%;
	}
	.choice {
		aspect-ratio: 4 / 3;
		font: var(--font-w-bold) var(--text-2xl) / 1 var(--font-display);
		font-variant-numeric: tabular-nums;
		background: var(--color-bg-800);
		color: var(--text-primary);
		border: none;
		border-radius: var(--radius-lg);
		box-shadow:
			inset 0 2px 0 rgba(255, 255, 255, 0.12),
			inset 0 -4px 0 rgba(0, 0, 0, 0.35),
			0 4px 8px rgba(0, 0, 0, 0.4);
		transition:
			transform 80ms var(--ease-out),
			background-color 80ms var(--ease-out),
			box-shadow 80ms var(--ease-out);
	}
	.choice:active:not(:disabled) {
		transform: translateY(3px) scale(0.97);
		background: var(--color-primary-500);
		color: white;
		box-shadow:
			inset 0 4px 8px rgba(0, 0, 0, 0.4),
			inset 0 -1px 0 rgba(255, 255, 255, 0.08),
			0 1px 2px rgba(0, 0, 0, 0.4);
	}
	.choice:disabled {
		opacity: 0.4;
	}
	.disabled {
		pointer-events: none;
	}
</style>
