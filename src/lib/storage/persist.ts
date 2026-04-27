import { browser } from '$app/environment';
import { openDB, type IDBPDatabase } from 'idb';
import type { MasteryState, LevelRecord, Operation } from '$lib/curriculum';
import { createState } from '$lib/curriculum';
import { DEFAULT_HERO_ID } from '$lib/cosmetics/catalog';

const DB_NAME = 'maths_game_7';
// v2: per-op stages refactor + per-fact Leitner keys + wall-clock spacing.
// Old saves are wiped — pre-v2 profiles had per-band stage maps and template-
// keyed +/− Leitner cards that would be inconsistent post-migration. Léo
// hadn't really started yet, so a clean slate is cleaner than a half-migrated
// save state. If you ever need to migrate (e.g., real users), bump version
// and add an upgrade path here.
const DB_VERSION = 2;
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
	// Defensive backfill: even with DB_VERSION bumps, an open IDB connection
	// from a prior session can keep the old data alive past a code change.
	// Always reconcile the saved mastery against the empty shape so missing
	// required fields (introduced after the save was written) don't crash
	// downstream readers.
	const mastery: MasteryState = p.mastery
		? {
				...empty.mastery,
				...p.mastery,
				fastCorrectStreaks: p.mastery.fastCorrectStreaks ?? {},
				pendingBridges: p.mastery.pendingBridges ?? [],
				numberline: p.mastery.numberline ?? { band: {} }
			}
		: empty.mastery;
	return {
		mastery,
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
			upgrade(db, oldVersion) {
				// On any version bump from < 2, wipe the store. The schema
				// changed in incompatible ways (per-op stages, per-fact Leitner
				// keys, wall-clock due times) and migration would leave a
				// half-baked save. Pre-v2 users hadn't really started.
				if (oldVersion < 2 && db.objectStoreNames.contains(STORE)) {
					db.deleteObjectStore(STORE);
				}
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
