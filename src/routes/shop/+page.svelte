<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, beforeNavigate } from '$app/navigation';
	import { loadProfile, saveProfile, emptyProfile, type Profile } from '$lib/storage/persist';
	import { HERO_SKINS } from '$lib/cosmetics/catalog';
	import { HEROES } from '$lib/sprites/manifest';
	import Sprite from '$lib/components/sprites/Sprite.svelte';
	import { play, unlock } from '$lib/audio/sfx';

	let profile: Profile = $state(emptyProfile());
	let loaded = $state(false);

	onMount(async () => {
		const saved = await loadProfile();
		if (saved) profile = saved;
		loaded = true;
	});

	$effect(() => {
		if (loaded) void saveProfile(profile);
	});

	beforeNavigate(async () => {
		if (loaded) await saveProfile(profile);
	});

	type Status = 'equipped' | 'owned' | 'buyable' | 'too_poor' | 'locked';
	function statusFor(skinId: string, price: number, unlockLevel?: number): Status {
		if (profile.inventory.equipped.hero === skinId) return 'equipped';
		if (profile.inventory.owned.includes(skinId)) return 'owned';
		if (unlockLevel && profile.level < unlockLevel) return 'locked';
		if (profile.coins < price) return 'too_poor';
		return 'buyable';
	}

	function tap(skinId: string, price: number, unlockLevel?: number) {
		const s = statusFor(skinId, price, unlockLevel);
		unlock();
		if (s === 'equipped' || s === 'locked' || s === 'too_poor') return;
		if (s === 'owned') {
			profile.inventory.equipped.hero = skinId;
			play('correct', 0.4);
			return;
		}
		if (s === 'buyable') {
			profile.coins -= price;
			profile.inventory.owned.push(skinId);
			profile.inventory.equipped.hero = skinId;
			play('shop_buy', 0.5);
		}
	}

	async function backLevels() {
		await saveProfile(profile);
		goto('/levels');
	}
</script>

<main>
	<header>
		<button class="back" onclick={backLevels} aria-label="Retour">←</button>
		<h1>Boutique</h1>
		<div class="coins"><span>🪙</span> {profile.coins}</div>
	</header>

	<div class="grid">
		{#each HERO_SKINS as skin (skin.id)}
			{@const character = HEROES[skin.id]}
			{@const s = statusFor(skin.id, skin.price, skin.unlockLevel)}
			<button
				class="card {s}"
				onclick={() => tap(skin.id, skin.price, skin.unlockLevel)}
				disabled={s === 'locked' || s === 'too_poor'}
			>
				<div class="preview">
					{#if character}
						<Sprite {character} state="run" height={120} />
					{/if}
				</div>
				<div class="meta">
					<div class="name">{skin.name}</div>
					{#if s === 'equipped'}
						<div class="badge eq">Équipé</div>
					{:else if s === 'owned'}
						<div class="badge owned">Équiper</div>
					{:else if s === 'locked'}
						<div class="badge locked">Niveau {skin.unlockLevel}</div>
					{:else if s === 'buyable'}
						<div class="badge price"><span>🪙</span> {skin.price}</div>
					{:else}
						<div class="badge too-poor"><span>🪙</span> {skin.price}</div>
					{/if}
				</div>
			</button>
		{/each}
	</div>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background:
			radial-gradient(ellipse at 30% 10%, #1e1b4b 0%, transparent 50%),
			radial-gradient(ellipse at 70% 90%, #312e81 0%, transparent 60%), var(--surface-app);
	}
	header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: rgba(15, 23, 42, 0.85);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	.back {
		font-size: var(--text-2xl);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
	}
	h1 {
		flex: 1;
		font: var(--font-w-bold) var(--text-lg) / 1 var(--font-display);
	}
	.coins {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-coin-500);
		font: var(--font-w-bold) var(--text-base) / 1 var(--font-display);
		font-variant-numeric: tabular-nums;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: var(--space-4);
		padding: var(--space-5);
	}
	.card {
		background: var(--surface-card);
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		border: 2px solid transparent;
		transition: transform var(--motion-fast) var(--ease-out);
	}
	.card:active:not(:disabled) {
		transform: scale(0.97);
	}
	.card.equipped {
		border-color: var(--color-primary-500);
		box-shadow: 0 0 16px rgba(16, 185, 129, 0.3);
	}
	.card.locked {
		opacity: 0.5;
	}
	.card.too_poor {
		opacity: 0.7;
	}
	.preview {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 120px;
	}
	.card.locked .preview {
		filter: grayscale(0.9) brightness(0.5);
	}
	.meta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}
	.name {
		font: var(--font-w-bold) var(--text-base) / 1 var(--font-display);
	}
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		font-weight: var(--font-w-bold);
		font-variant-numeric: tabular-nums;
	}
	.badge.eq {
		background: var(--color-primary-500);
		color: var(--color-bg-900);
	}
	.badge.owned {
		background: rgba(16, 185, 129, 0.2);
		color: var(--color-primary-300);
		border: 1px solid var(--color-primary-500);
	}
	.badge.locked {
		background: var(--color-bg-900);
		color: var(--text-muted);
	}
	.badge.price {
		background: var(--color-coin-500);
		color: var(--color-bg-900);
	}
	.badge.too-poor {
		background: var(--color-bg-900);
		color: var(--color-coin-500);
		border: 1px dashed var(--color-coin-500);
	}
</style>
