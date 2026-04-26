**maths_game_7** is a free, offline-first math game built for Kevin's 7-year-old son. The kid plays on iPad (PWA, "Add to Home Screen"). UI is in French.

## Stack

- SvelteKit + Svelte 5 (runes) + TypeScript
- **No Tailwind, no CSS framework.** Design tokens (CSS custom properties) live on `:root` in `src/app.css`. Atomic UI components in `src/lib/components/ui/` use scoped `<style>` blocks consuming those tokens — same convention as fpt-ai. **Never** write utility-class soup like `class="flex items-center px-4"`.
- `bun` (never `npm` — the preinstall hook will error). Use `bun install`, `bun run dev`, `bun run check`, `bun run test`.
- `@sveltejs/adapter-static` with `fallback: 'index.html'` so the build is a pure SPA that runs from any static host (and from `file://` if needed).
- `vitest` for unit tests. Engine lives in `src/lib/engine/` and is pure TS, no Svelte/DOM deps — easy to test.
- `idb` for IndexedDB persistence of save state.

## Conventions

- French copy in the UI. Almost no text — numbers and icons.
- Generated code must pass `bun run check` (prettier + eslint + svelte-check, no warnings).
- Use the **Svelte MCP** (`mcp__svelte__list-sections`, `mcp__svelte__get-documentation`, `mcp__svelte__svelte-autofixer`) when writing Svelte 5 components. Always run `svelte-autofixer` to convergence before declaring code done.
- No comments unless the WHY is non-obvious. Don't restate what code does.
- No tests for trivial getters / re-exports. The engine math, mastery, Leitner, and sampler all need tests.
- The kid is the user. Big hit targets, no dark patterns, no randomness in rewards (no loot boxes), no time pressure when typing.
- **Strict separation of view and logic.** Svelte components contain only markup, `$props`, `$state`, `$derived`, and thin event handlers that delegate to imported pure functions. All math, sampling, transforms, persistence, and side effects live in pure TS modules under `src/lib/<area>/`. If a component's `<script>` is doing real work beyond wiring, extract it.

## Project structure

- `src/lib/engine/` — pure TS math/curriculum engine. Operations, bands, generators, mastery, Leitner, sampler. No DOM. Fully unit-tested.
- `src/lib/storage/` — IndexedDB persistence (later).
- `src/lib/components/` — Svelte 5 UI components.
- `src/routes/` — SvelteKit pages.
- `src/routes/debug/` — internal page to play through the engine without art. Don't ship in prod build (ok for v1).

## Operation curriculum

- Levels are continuous, infinite (1, 2, 3, …).
- `+` and `−` unlock at level 1. Calibration burst over levels 1–2.
- `×` unlocks at level 20. Calibration burst over levels 20–21.
- `÷` unlocks at level 40. Calibration burst over levels 40–41.
- After calibration, each level is dynamically generated based on current mastery: ~30% Leitner-due reinforcement + ~70% band-weighted sampling around weak ops (60% at-band / 25% band−1 / 15% band+1).
- Bands per op are fine-grained (~10–12 each) so progression feels smooth and demotion isn't a big drop.
- `÷` generators are stubbed in v1. `×` ships with bands B1–B7 in v1 (×0/1/10, ×2/5, ×3/4); harder × bands deferred.

## Reference projects (host machine)

- `~/dev/fpt-ai/` — Kevin's main SaaS. Gold standard for `.claude/` setup and conventions.
- `~/dev/resume/` — Lightweight SvelteKit project. `static/` has free game-style audio (`explosion.mp3`, `wrong_answer.mp3`, `power_up.mp3`, `game_music.mp3`, `game_over.mp3`) we can crib from.
