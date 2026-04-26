<script lang="ts">
	interface Props {
		value: string;
		onchange: (v: string) => void;
		onsubmit: () => void;
		disabled?: boolean;
	}

	let { value, onchange, onsubmit, disabled = false }: Props = $props();

	const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

	function press(digit: string) {
		if (disabled) return;
		if (value.length >= 4) return;
		onchange(value + digit);
	}

	function pressZero() {
		if (disabled) return;
		if (value.length >= 4) return;
		onchange(value + '0');
	}

	function backspace() {
		if (disabled) return;
		onchange(value.slice(0, -1));
	}

	function submit() {
		if (disabled || value.length === 0) return;
		onsubmit();
	}
</script>

<div class="pad" class:disabled>
	<div class="grid">
		{#each KEYS as k (k)}
			<button class="key" onclick={() => press(k)} disabled={disabled || value.length >= 4}>
				{k}
			</button>
		{/each}
		<button
			class="key fn back"
			onclick={backspace}
			disabled={disabled || value.length === 0}
			aria-label="Effacer"
		>
			⌫
		</button>
		<button class="key" onclick={pressZero} disabled={disabled || value.length >= 4}> 0 </button>
		<button
			class="key fn ok"
			onclick={submit}
			disabled={disabled || value.length === 0}
			aria-label="Valider"
		>
			✓
		</button>
	</div>
</div>

<style>
	.pad {
		width: 100%;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-3);
	}
	.key {
		aspect-ratio: 3 / 2;
		font: var(--font-w-bold) var(--text-3xl) / 1 var(--font-display);
		background: var(--color-bg-800);
		color: var(--text-primary);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		transition:
			transform var(--motion-fast) var(--ease-out),
			background var(--motion-fast) var(--ease-out);
		font-variant-numeric: tabular-nums;
	}
	.key:active:not(:disabled) {
		transform: scale(0.94);
		background: var(--color-bg-900);
	}
	.key:disabled {
		opacity: 0.35;
	}
	.key.fn {
		font-size: var(--text-2xl);
	}
	.key.back {
		background: var(--color-bg-900);
	}
	.key.ok {
		background: var(--color-primary-500);
		color: var(--color-bg-900);
	}
	.disabled {
		pointer-events: none;
	}
</style>
