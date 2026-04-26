/** Tiny SFX module. Cached HTMLAudioElements, fire-and-forget play.
 *  iOS gates audio on first user interaction — silently swallow rejections. */

const cache = new Map<string, HTMLAudioElement>();
let muted = false;
let unlocked = false;

export type SfxName = 'correct' | 'wrong' | 'win' | 'lose' | 'level_up' | 'shop_buy';

function get(name: SfxName): HTMLAudioElement | null {
	if (typeof Audio === 'undefined') return null;
	let a = cache.get(name);
	if (!a) {
		a = new Audio(`/sfx/${name}.mp3`);
		a.preload = 'auto';
		cache.set(name, a);
	}
	return a;
}

/** Call once after the first user interaction so iOS allows playback. */
export function unlock(): void {
	if (unlocked || typeof Audio === 'undefined') return;
	unlocked = true;
	const names: SfxName[] = ['correct', 'wrong', 'win', 'lose', 'level_up', 'shop_buy'];
	for (const n of names) {
		const a = get(n);
		if (!a) continue;
		const wasMuted = a.muted;
		a.muted = true;
		a.play()
			.then(() => {
				a.pause();
				a.currentTime = 0;
				a.muted = wasMuted;
			})
			.catch(() => {
				a.muted = wasMuted;
			});
	}
}

export function play(name: SfxName, volume = 0.6): void {
	if (muted) return;
	const a = get(name);
	if (!a) return;
	a.currentTime = 0;
	a.volume = volume;
	a.play().catch(() => {});
}

export function setMuted(value: boolean): void {
	muted = value;
}

export function isMuted(): boolean {
	return muted;
}
