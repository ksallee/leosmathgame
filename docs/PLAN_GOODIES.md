# Goodies / cosmetics roadmap

## Hard rules (non-negotiable)

- **No randomness in rewards.** No loot boxes, no gacha, no random drops.
- **No daily-login streaks.** Discourages compulsion patterns.
- **All prices visible and deterministic.** "X coins → Y skin" is the only model.
- **No pay-to-win.** Cosmetics never affect difficulty, lives, or progression.
- **No real-money transactions, ever.** This is a free game.

## Architecture (already in place)

```
src/lib/cosmetics/
├── types.ts        SpriteSlot, SpriteSkin
└── catalog.ts      HERO_SKINS, MONSTER_SKINS, pickMonsterForLevel(), DEFAULT_HERO_ID

src/lib/storage/persist.ts
└── Profile { mastery, level, coins, inventory: { owned, equipped } }
```

A `SpriteSkin` is just `{ id, name, slot, src, price, unlockLevel? }`. Anything renderable in the game is one of these. Adding a new skin = drop a PNG, append to the catalog. No code changes.

`pickMonsterForLevel(level)` already rotates monsters per level and gates "boss" monsters (dragon, skull) at every 5th level — this is the only structural use of unlocks today. Hero is whatever's equipped.

## Tier 1 — coins + hero skins (next thing to build)

- **Coin earning** (already wired): +10 + correct-count per won level. Fast tunable in `play/+page.svelte`.
- **Shop page** at `/shop`: list `HERO_SKINS`, show owned/equipped/locked, buy with coins, equip. Maybe also let kid preview (full-size sprite) before buying.
- **Skin equip** persists in `Profile.inventory.equipped.hero`. `/play` already reads from there.
- **Level-gated skins** (`unlockLevel`) shown but disabled until reached.

Estimate: half a day. Mostly route + UI.

## Tier 2 — environments (worlds)

- **World themes** every 5 levels: dungeon (current), forest, ice cave, space.
- Each world has its own background tile pair (wall + floor) plus theme-specific monsters.
- `DungeonBg.svelte` becomes generic with a `theme` prop driving which tiles to load.
- Monster pool per world: dungeon = slime/rat/orc, forest = goblin/spider, etc. Need more sprites — Kenney has packs for each (forest, sci-fi).

Estimate: 1 day per world (mostly art curation + theme variants).

## Tier 3 — depth (what keeps a 7yo coming back)

- **Star ratings per level**: 3 stars = no wrongs, 2 = ≤2 wrongs, 1 = won. Stars unlock cosmetics.
- **Boss every 5 levels**: bigger sprite (rendered 1.5×), more lives, special reward (rare skin).
- **Pet companions**: small sprite that idles next to hero. Buy with coins. Cosmetic only.
- **Achievements** (badges): "100 correct in a row," "beat boss without losing a heart," "play with every hero." Visible-only, no mechanical effect.

## What I would NOT add even if asked

- Time-limited offers ("save 50% today only!")
- "Energy" systems ("come back in 2 hours")
- Cosmetics that visually mark "premium" players
- Pop-up shop reminders during play
- Multiplayer / social pressure features
