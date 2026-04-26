export type SpriteSlot = 'hero' | 'monster';

export interface SpriteSkin {
	id: string;
	name: string;
	slot: SpriteSlot;
	price: number;
	unlockLevel?: number;
}
