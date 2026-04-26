import { browser } from '$app/environment';
import { openDB, type IDBPDatabase } from 'idb';
import type { MasteryState, LevelRecord, Operation } from '$lib/engine';
import { createState } from '$lib/engine';
import { DEFAULT_HERO_ID } from '$lib/cosmetics/catalog';

const DB_NAME = 'maths_game_7';
const DB_VERSION = 1;
const STORE = 'kv';
const PROFILE_KEY = 'profile';

export interface Inventory {
	owned: string[];
	equipped: { hero: string };
}

export interface Profile {
	mastery: MasteryState;
	level: number;
	lastViewedLevel: number;
	coins: number;
	inventory: Inventory;
	levelRecords: LevelRecord[];
}

export function emptyProfile(): Profile {
	return {
		mastery: createState(),
		level: 1,
		lastViewedLevel: 1,
		coins: 0,
		inventory: {
			owned: [DEFAULT_HERO_ID],
			equipped: { hero: DEFAULT_HERO_ID }
		},
		levelRecords: []
	};
}

function migrate(p: Partial<Profile>): Profile {
	const empty = emptyProfile();
	return {
		mastery: p.mastery ?? empty.mastery,
		level: p.level ?? empty.level,
		lastViewedLevel: p.lastViewedLevel ?? p.level ?? empty.lastViewedLevel,
		coins: p.coins ?? empty.coins,
		inventory: p.inventory ?? empty.inventory,
		levelRecords: p.levelRecords ?? empty.levelRecords
	};
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
	if (!browser) throw new Error('IndexedDB only available in browser');
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			upgrade(db) {
				if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
			}
		});
	}
	return dbPromise;
}

export async function loadProfile(): Promise<Profile | null> {
	if (!browser) return null;
	try {
		const db = await getDb();
		const value = (await db.get(STORE, PROFILE_KEY)) as Partial<Profile> | undefined;
		if (!value) return null;
		return migrate(value);
	} catch (err) {
		console.error('[persist] loadProfile failed:', err);
		return null;
	}
}

export async function saveProfile(profile: Profile): Promise<void> {
	if (!browser) return;
	try {
		const db = await getDb();
		const plain = JSON.parse(JSON.stringify(profile));
		await db.put(STORE, plain, PROFILE_KEY);
	} catch (err) {
		console.error('[persist] saveProfile failed:', err);
	}
}

export async function clearAll(): Promise<void> {
	if (!browser) return;
	try {
		const db = await getDb();
		await db.clear(STORE);
	} catch (err) {
		console.error('[persist] clearAll failed:', err);
	}
}

// ---- Level record helpers ----

export function findLevelRecord(profile: Profile, level: number): LevelRecord | undefined {
	return profile.levelRecords.find((r) => r.level === level);
}

export function starsForOutcome(wrong: number): number {
	if (wrong === 0) return 3;
	if (wrong <= 2) return 2;
	return 1;
}

const ALL_OPS: readonly Operation[] = ['add', 'sub', 'mul', 'div'];

export function snapshotBands(mastery: MasteryState): Partial<Record<Operation, number>> {
	const out: Partial<Record<Operation, number>> = {};
	for (const op of ALL_OPS) {
		if (mastery[op].band > 0) out[op] = mastery[op].band;
	}
	return out;
}

export function upsertLevelRecord(
	profile: Profile,
	level: number,
	mastery: MasteryState,
	stars: number
): LevelRecord {
	const existing = findLevelRecord(profile, level);
	if (existing) {
		existing.bestStars = Math.max(existing.bestStars, stars);
		existing.timesWon += 1;
		return existing;
	}
	const fresh: LevelRecord = {
		level,
		bandsAtCompletion: snapshotBands(mastery),
		bestStars: stars,
		timesWon: 1
	};
	profile.levelRecords.push(fresh);
	return fresh;
}
