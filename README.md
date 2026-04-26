# Leo's Math Game

A free, offline-first math game built for my 7-year-old son. Web app, French UI, designed to play on iPad as a Home-Screen PWA.

## What it is

- 4 operations across infinite levels: addition (B1-B12), subtraction (B1-B12), multiplication (introduced at lvl 20, B1-B11), division (introduced at lvl 40, B1-B6).
- Per-level **calibration burst** when an op first unlocks; the engine bands the kid into the right difficulty within ~5 questions, then continuously updates from every answer.
- **Spaced-repetition Leitner queue** — the engine resurfaces specific instances (×, ÷ facts) and templates (+, − procedures) the kid has missed.
- **Worlds** every 10 levels — forest, desert, cave, snow, pirate — with their own sky, ground, and atmospheric props.
- **Boss every 5 levels** with a bigger / faster monster.
- **Per-level coin pickups** + a **shop** for hero skins.
- **Captain shooter mechanic** — equip the Captain skin and you throw a spinning sword at the monster on every correct answer.

## Stack

- SvelteKit + Svelte 5 (runes) + TypeScript
- `bun` (never `npm` — preinstall hook errors)
- `@sveltejs/adapter-static` — pure SPA, runs from any static host
- `idb` for IndexedDB persistence (single Profile blob)
- `vitest` for the engine (61 tests covering generators, mastery, Leitner, sampler, session)

## Sprite assets

All CC0 (public domain):

- **Pixel Adventure 1 + 2** by Pixel Frog — heroes, monsters, backgrounds  
  https://pixelfrog-assets.itch.io/pixel-adventure-1
- **Treasure Hunters** by Pixel Frog — Captain hero, sword projectile, coins, diamonds, UI tiles  
  https://pixelfrog-assets.itch.io/treasure-hunters

Sound effects pulled from another personal project.

## Run locally

```sh
bun install
bun run dev
```

Open http://localhost:5173.

Useful routes:

- `/` — home
- `/levels` — world map
- `/play` — current level
- `/play?level=N` — preview/play any level (dev escape hatch)
- `/play?replay=N` — replay a beaten level at its snapshot bands
- `/shop` — buy hero skins
- `/debug` — engine debug page (mastery state, Leitner queue, fast-forward)

## Tests + check

```sh
bun run test:run    # 61 vitest tests
bun run check       # prettier + eslint + svelte-check
```

## Deploy

Deploys as a static SPA. `vercel.json` is configured for Vercel + bun + `adapter-static`. Connecting the GitHub repo to Vercel should be enough.
