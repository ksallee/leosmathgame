<script lang="ts">
	/** Visual scaffold for early multiplication: render a × b as `a` rows of
	 *  `b` dots (or vice versa for visual balance — fewer rows on the smaller
	 *  axis). Concreteness fading research (Fyfe et al. 2014): concrete-first
	 *  with explicit fading produces better transfer than bare-numeral intro.
	 *  We show this only while mul stage is choices_easy AND the product is
	 *  small enough to render cleanly. */
	interface Props {
		a: number;
		b: number;
	}
	let { a, b }: Props = $props();

	const rows = $derived(Math.min(a, b));
	const cols = $derived(Math.max(a, b));

	const D = 18;
	const GAP = 6;
	const ROW_GAP = 10;
	const width = $derived(cols * (D + GAP) - GAP);
	const height = $derived(rows * (D + ROW_GAP) - ROW_GAP);

	const points = $derived.by(() => {
		const out: Array<{ cx: number; cy: number }> = [];
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				out.push({
					cx: c * (D + GAP) + D / 2,
					cy: r * (D + ROW_GAP) + D / 2
				});
			}
		}
		return out;
	});
</script>

{#if rows > 0 && cols > 0}
	<svg class="aid" viewBox="0 0 {width} {height}" {width} {height} aria-hidden="true">
		{#each points as p, i (i)}
			<circle cx={p.cx} cy={p.cy} r={D / 2} fill="#facc15" stroke="#78350f" stroke-width="1.5" />
		{/each}
	</svg>
{/if}

<style>
	.aid {
		display: block;
		margin: 0 auto var(--space-3);
		max-width: 100%;
		height: auto;
		filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4));
	}
</style>
