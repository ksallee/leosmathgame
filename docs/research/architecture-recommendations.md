# Architecture recommendations — evidence-based redesign

## Context

This is a free, offline-first math game built for Léo (7 years old), played on iPad as a PWA. The engine (`src/lib/engine/`) is pure TypeScript with a Leitner scheduler, per-op band sampler, and calibration burst on op unlock. The research brief synthesises cognitive science on 6–9 year old arithmetic learning and identifies 11 specific mismatches between that evidence and the current mechanics. These recommendations translate those mismatches — plus two additional findings from the code audit — into concrete, sequenced changes.

---

## Recommendations

### R1. Wall-clock floors on Leitner buckets

- **Priority:** P0
- **Effort:** M
- **Evidence anchor:** Brief §2 / mismatch 1-2. Cepeda (2008): spacing law operates in real time. Forty answers inside a single session is massed practice, not spaced retrieval.
- **Current state:** `config.ts:28-32` — `LEITNER_INTERVALS` is `{ 0: 2, 1: 12, 2: 40 }` measured in `state.answered` counts. `leitner.ts:24-26` — `scheduleDue` does `state.answered + LEITNER_INTERVALS[bucket]`. There is no wall-clock component at all.
- **Proposed change:** Add a 4th bucket and a `dueAtWallMs` field alongside `dueAtAnswerCount`. Rename `LeitnerBucket` range to `0 | 1 | 2 | 3`. Change `scheduleDue` to set both fields. Change `dueEntries` to gate on both `dueAtAnswerCount <= state.answered` AND `dueAtWallMs <= Date.now()`. Add `LEITNER_WALL_FLOORS_MS` to `config.ts`. On miss (wrong answer), demote one bucket (not back to 0) — current behaviour resets to bucket 0, which is harsher than Anki/SuperMemo.

```ts
// config.ts additions
export type LeitnerBucket = 0 | 1 | 2 | 3;

export const LEITNER_INTERVALS: Record<LeitnerBucket, number> = {
	0: 2,
	1: 12,
	2: 40,
	3: 120
};
export const LEITNER_WALL_FLOORS_MS: Record<LeitnerBucket, number> = {
	0: 10 * 60_000, // 10 min
	1: 24 * 60 * 60_000, // 1 day
	2: 7 * 24 * 60 * 60_000, // 1 week
	3: 30 * 24 * 60 * 60_000 // 1 month
};

// types.ts — LeitnerEntry additions
export interface LeitnerEntry {
	key: string;
	operation: Operation;
	band: Band;
	bucket: LeitnerBucket;
	dueAtAnswerCount: number;
	dueAtWallMs: number; // new
}
```

- **Migration concern:** Existing `LeitnerEntry` records lack `dueAtWallMs`. The `migrate()` function in `persist.ts:40-50` must backfill `dueAtWallMs: 0` (immediately due) and re-clamp `bucket` to the new 0–3 range. This is a one-time migration that is safe: treating all existing entries as immediately due is conservative, not destructive.
- **Expected impact:** Facts learned in a single sitting will now persist across days. Without this, the game cannot produce durable retention regardless of how well the sampler works. This is the single highest-leverage fix in the brief.
- **Open question:** Should `dueAtWallMs` for bucket 0 be shorter (2–3 min) for the within-session immediate retry case, given bucket 0 is currently used for just-missed questions?

---

### R2. Per-fact Leitner keys for addition and subtraction (sums ≤ 20)

- **Priority:** P0
- **Effort:** M
- **Evidence anchor:** Brief §1 / mismatch 3. Siegler (1996): overlapping waves are per-fact. 6+7 and 8+9 sit in add band 4 but cross to retrieval at very different times.
- **Current state:** `config.ts:43-48` — `LEITNER_GRANULARITY` sets `add: 'template'` and `sub: 'template'`. The `keyFor` function in `leitner.ts:12-18` returns `question.template` (i.e., `'add:b4'`) for these ops, meaning all band-4 addition facts share one Leitner card.
- **Proposed change:** Change `LEITNER_GRANULARITY` for `add` and `sub` to `'instance'` unconditionally, OR add a third value `'instance-small'` that uses instance granularity only when both operands are ≤ 9 (sums ≤ 18) and falls back to template for two-digit bands. The simpler option is to just flip to `'instance'` globally — the 2-digit bands (B6–B12) generate fewer repeated question IDs due to their large operand space, so instance tracking is noisier there but harmless.

```ts
// config.ts
export const LEITNER_GRANULARITY: Record<Operation, 'instance' | 'template'> = {
	add: 'instance',
	sub: 'instance',
	mul: 'instance',
	div: 'instance'
};
```

- **Migration concern:** Existing template-keyed Leitner entries for `add`/`sub` become orphaned — they will never fire. They should be pruned on load in `migrate()`. No data loss, only loss of existing spacing history (which was incorrect anyway).
- **Expected impact:** The Leitner loop will now correctly schedule 7+8 as independently mastered or unmastered from 6+7. Without this, a child who has retrieval-fluent 4+3 but is still counting 8+9 is treated identically.
- **Open question:** None blocking. The two-digit bands (B8+) may produce Leitner tables with many thousands of entries over time. Set a max-Leitner-table-size cap (e.g., 500 entries, evict oldest bucket-0 entries) if IDB size becomes a concern.

---

### R3. Promote `choices_easy` out of band intro only

- **Priority:** P0
- **Effort:** S
- **Evidence anchor:** Brief §4 / mismatch 5. Guessing baseline for 4-MCQ is ~75%; `choices_easy` wide-distractor MCQ is below the desirable-difficulty floor and trains only recognition, not retrieval.
- **Current state:** `config.ts:37` — `STAGE_ADVANCE_THRESHOLD = 3` (correct answers to advance from `choices_easy` → `choices_hard` → `numpad`). The `mastery.ts` file currently has `emptyOpMastery()` returning `stages` and `stageProgress` fields that don't exist in the type (`types.ts:27-36` shows `OpMastery` does not have `stages` or `stageProgress`). The presentation-stage logic appears to be partially implemented or live in the play route rather than the engine. The route at `routes/play/+page.svelte` exclusively shows a `Numpad` — there is no MCQ rendering in the play route at all, suggesting MCQ stages may be planned but not yet wired to the main play loop.
- **Proposed change:** When the MCQ stages ship: cap `choices_easy` to the first 3 exposures of any new band (i.e., `stageProgress[band] < 3`), then unconditionally advance to `choices_hard`. Do not require 3 correct answers from `choices_easy` — those answers are near-chance and should not gate progression. Add `CHOICES_EASY_MAX_EXPOSURES = 3` to `config.ts`.
- **Expected impact:** Eliminates a regime where a child can pass an entire stage by lucky guessing, while still giving 3 exposures of the new fact as gentle introduction.
- **Open question:** Is MCQ actually wired to the play loop anywhere today? The route only instantiates `Numpad`. If MCQ is deferred, this recommendation is a no-op until that work lands.

---

### R4. Mid-level demote on error burst

- **Priority:** P1
- **Effort:** S
- **Evidence anchor:** Brief §4 / mismatch 4. The 70–90% accuracy corridor; grind protection. Currently the only demotion trigger is at level boundary after 10 questions.
- **Current state:** `mastery.ts:151-170` — `applySteadyState` adjusts `confidence` per answer and promotes/demotes band when `confidence >= 4` or `<= -3`. This is a per-question confidence accumulator but operates on bands, not stages. There is no mid-level check in `sampler.ts` or the session loop. `session.ts` in `src/lib/game/` tracks `wrong` count but does not feed back into the engine sampler mid-level.
- **Proposed change:** Add a `recentBandErrors` rolling window (window size 5) per band inside `OpMastery`. After each answer, if `recentBandErrors[band]` in the last 5 attempts hits 3, emit a demote signal. This logic belongs in `mastery.ts:recordAnswer`, not the component. The session in `src/lib/game/session.ts` already calls `recordAnswer` per answer (via the play route); the mastery state mutation is already happening. No new call site needed — just additional logic inside `applySteadyState`.

```ts
// In applySteadyState, after existing confidence logic:
const recentForBand = om.recentByBand[band] ?? [];
const last5 = recentForBand.slice(-5);
if (last5.length >= 5 && last5.filter((v) => !v).length >= 3) {
	om.band = clampBand(op, om.band - 1);
	om.confidence = 0;
}
```

- **Migration concern:** None. Additive logic; no stored state change.
- **Expected impact:** A child will not grind 7 wrong answers at a band that is too hard before the level ends and triggers re-evaluation. Reduces anxiety from extended failure streaks.
- **Open question:** Should the mid-level demote also demote the presentation stage? Or only the band? Probably band only; stage demotion is a larger UX decision.

---

### R5. Band-level mini-burst on first exposure

- **Priority:** P1
- **Effort:** M
- **Evidence anchor:** Brief §3 / mismatch 6. Hwang et al. (2025): interleaving fails for true novices. Fix: 3-question blocked intro when each new band first appears.
- **Current state:** `sampler.ts:64-73` — calibration burst is gated on `calibratingOps(state)` which checks `getCalibration(state, op)`. Calibration is per-operation on unlock, not per-band. When a new band opens mid-steady-state (e.g., the confidence counter tips `om.band` from 3 to 4), it immediately enters the interleaved sampler with no introduction.
- **Proposed change:** Track `seenBands: Partial<Record<Operation, Set<Band>>>` (or a flat `string[]` of `'op:band'` keys) in `MasteryState`. In `sampler.ts:generateLevel`, before the regular sampling loop, check if the target band is unseen for the op; if so, prepend 3 questions from that band before entering the weighted sampler. Mark the band as seen after those 3 questions are emitted. Alternatively, store `introQuestions: number` per band in `OpMastery` and decrement it.

```ts
// types.ts addition to OpMastery
bandIntroRemaining: Record<Band, number>;

// sampler.ts: before the main loop, for each newly-promoted band
if ((om.bandIntroRemaining[targetBand] ?? 3) > 0) {
	// emit a blocked intro question for this band
	// decrement bandIntroRemaining[targetBand]
}
```

- **Migration concern:** `bandIntroRemaining` defaults to absent/0. `migrate()` should initialise it as `{}` (empty = no intro remaining for already-seen bands). For existing profiles this means no intro burst for bands already reached — acceptable.
- **Expected impact:** New band introductions will feel deliberate rather than sudden. Directly addresses the novice-interleaving failure mode at band transitions.
- **Open question:** Should the 3-question burst also lock to `choices_easy` presentation stage regardless of the current stage? That would be the most conservative interpretation of "blocked intro."

---

### R6. Silent latency tracking as mastery signal

- **Priority:** P1
- **Effort:** M
- **Evidence anchor:** Brief §1 / mismatch 9. Response time distinguishes counting strategy (slow-correct) from retrieval (fast-correct). Siegler: promote a fact only when fast-correct ~3 in a row.
- **Current state:** `AnswerEvent` in `types.ts:15-23` already contains `timeMs`, computed in `session.ts:109-111` as `now - session.questionStartedAt`. `mastery.ts:145-148` updates `medianTimeByBand` with an exponential moving average. `mastery.ts:131-136` — `classifySpeed` already classifies answers as `'fast' | 'normal' | 'slow'`. `mastery.ts:158-163` — `applySteadyState` already gives `+2` confidence for fast-correct vs `+1` for normal-correct. So latency tracking and speed classification exist; the gap is that the fast-correct streak that determines retrieval fluency is not separately tracked.
- **Proposed change:** Add `fastCorrectStreakByKey: Record<string, number>` to `MasteryState` (keyed by the same `keyFor` used in Leitner). In `recordAnswer`, when an answer is fast-correct, increment the streak; on any other result, reset to 0. Only promote a Leitner entry from bucket N to N+1 when `fastCorrectStreak >= 3`. This replaces the current logic in `leitner.ts:54-56` where any correct answer promotes regardless of speed.

```ts
// leitner.ts — modified recordForLeitner
if (ev.correct) {
	const streak = state.fastCorrectStreaks[key] ?? 0;
	const isRetrieval = speed === 'fast';
	state.fastCorrectStreaks[key] = isRetrieval ? streak + 1 : 0;
	if (!existing) return;
	if (state.fastCorrectStreaks[key] >= FAST_CORRECT_STREAK_THRESHOLD) {
		const newBucket = Math.min(3, existing.bucket + 1) as LeitnerBucket;
		existing.bucket = newBucket;
		existing.dueAtAnswerCount = scheduleDue(state, newBucket);
		existing.dueAtWallMs = scheduleWall(state, newBucket);
		state.fastCorrectStreaks[key] = 0;
	}
}
```

- **Migration concern:** `fastCorrectStreaks` is a new `MasteryState` field. `migrate()` should default it to `{}`. Existing Leitner entries will re-require the streak before promoting, which is correct behaviour.
- **Expected impact:** The Leitner loop will stop promoting facts that the child is getting correct by counting on fingers. This is arguably the most important behavioural fix — without it, spaced repetition promotes facts that haven't reached retrieval fluency.
- **Open question:** What threshold to use? The brief says "~3 in a row" based on Siegler's criterion. That seems right for within-session; for Leitner bucket promotion (which has wall-clock delays) even 2 fast-correct may suffice. Start at 3, tune empirically.

---

### R7. Decouple coins from per-question correctness

- **Priority:** P1
- **Effort:** S
- **Evidence anchor:** Brief §5 / mismatch 10. Extrinsic reward tied to performance → short-term engagement up, intrinsic motivation down (Deci & Ryan; brief cites Boaler 2014).
- **Current state:** `routes/play/+page.svelte:258-266` — on win, `profile.coins += base + bonus` where `base = 15` (flat per win) and `bonus` is coins collected on track. The flat 15-coin win reward is already decoupled from accuracy (you get it whether you answered 10/10 or 10/18). The coin-on-track mechanic is time/position-based, not correctness-based. The star rating (`starsForOutcome(session.wrong)`) is accuracy-based but cosmetic — it does not gate coins.
- **Proposed change:** This is already substantially correct. One edge case: the `OutcomeCard.svelte:60-65` visually surfaces "Bonnes: N" and "Mauvaises: N" which is informational but not reward-linked. The concern would be if stars were ever wired to coin multipliers — confirm they are not and document that as an invariant in `game/config.ts`. No code change needed; add a comment.
- **Expected impact:** Maintain current design. Calling this out to confirm it holds as the game grows.
- **Open question:** The lose screen shows "Mauvaises: N" in red. Is that a red-flag anxiety trigger or just informational? The brief is agnostic on post-session summaries; the concern is in-session feedback. Probably fine.

---

### R8. Enforce interleaving within op: ≥ 50% band alternation in sampler

- **Priority:** P1
- **Effort:** S
- **Evidence anchor:** Brief §3. Taylor & Rohrer (2010), d ≈ 1.21: interleaving forces discriminative contrast, the actual test skill. The brief says "within multiplication, alternate fact families rather than blocking."
- **Current state:** `sampler.ts:82-86` — the steady-state path uses `rrPick(useOps, opCounter++)` to round-robin across operations, then picks a band offset. With only `add` and `sub` active (levels 1–19), round-robin alternates them. But within a single op across multiple questions, it is possible to draw the same op three times in a row if Leitner review happens to pull the same op repeatedly.
- **Proposed change:** Add a `lastEmittedBands: Partial<Record<Operation, Band>>` tracker within `generateLevel`. When the sampler is about to emit a question for op X at band B, check if the previous question for op X was also at band B. If so, try band B+1 or B-1 first (clamp). This is a weak anti-repeat that handles the most common blocking pattern without breaking the weighted distribution. The goal is ≥ 50% alternation, not strict alternation. This is a 10-line change inside `sampler.ts`.
- **Migration concern:** None. Stateless within `generateLevel`.
- **Expected impact:** Within a 10-question level, prevents the child from seeing 6×7, 6×3, 6×8, 6×4 in a row, which blocks discriminative contrast. Effect size in self-paced play is likely smaller than classroom setting, but the fix is free.
- **Open question:** The brief notes that lab/classroom interleaving effects may shrink in self-paced single-player play. Is this P1 or P2? It's a 10-line change with no downside; ship it.

---

### R9. Concrete representations at × unlock (level 20)

- **Priority:** P1
- **Effort:** L
- **Evidence anchor:** Brief §6 / mismatch 7. Concreteness fading is essential at conceptual introduction of × (repeated addition); the kid needs the model. Fyfe et al. (2014): concrete-first with fading produces better transfer than bare-numeral intro.
- **Current state:** × unlocks at level 20 (`config.ts:6-10`). The calibration burst in `sampler.ts` fires per-op on unlock. The current `generate()` call for `mul` returns bare-numeral MCQ/numpad questions immediately. There is no concrete representation layer anywhere in the engine or UI.
- **Proposed change:** Add a `ConcretePresentationStage = 'dot_array' | 'grouped_circles' | 'numeral'` concept to the engine. For `mul` bands B1–B4 specifically (the single-digit fact families), the first 10 exposures should use a `dot_array` or `grouped_circles` representation. This requires: (1) a `concreteExposures: Partial<Record<string, number>>` counter in `MasteryState` (keyed by `'op:band'`), (2) a new Svelte component `ConcreteQuestion.svelte` in `src/lib/components/game/` that renders dot arrays or grouped circles alongside the symbolic prompt, (3) `generateLevel` to annotate returned `Question` objects with a `presentationHint: 'concrete' | 'symbolic'` field.
- **API sketch:**

```ts
// types.ts
export interface Question {
	// ... existing fields
	presentationHint?: 'concrete' | 'symbolic';
}
```

- **Migration concern:** `presentationHint` is optional; existing persisted question data is unaffected. `concreteExposures` defaults to `{}` in migrate.
- **Expected impact:** Directly addresses the conceptual gap for a child hitting × for the first time. Without this, the transition from 10 levels of +/− fluency to bare-numeral × is a conceptual cliff. For ÷ (level 40), this is even more critical (mismatch 7 marks ÷ as "essential, not optional").
- **Open question:** How to render dot arrays for large facts like 9×7 (63 dots)? Grouped circles (9 groups of 7) are clearer than a flat 63-dot grid. Should this be gated strictly on bands B1–B4 (the v1 × bands), or also on B5+ when those ship?

---

### R10. `choices_easy` stage should not mix MCQ and numpad within a level

- **Priority:** P2
- **Effort:** S
- **Evidence anchor:** Brief §3. "Don't interleave presentation stages within a level" — mixing MCQ and numpad in a single level is extraneous discrimination load (which button interface am I using?), not desirable difficulty.
- **Current state:** The play route only shows `Numpad`. If MCQ stages are added, `generateLevel` returns a flat `Question[]` with no presentation-stage tagging, so the rendering component would have to decide per-question which UI to show. This creates the risk of mixing stages mid-level.
- **Proposed change:** When MCQ stages ship, `generateLevel` must not mix stages within a single 10-question level. The stage for a level should be determined once at level start (from `om.stages[band]`) and applied uniformly. Document this constraint in `sampler.ts` with a comment.
- **Migration concern:** None.
- **Expected impact:** Prevents a UX confusion mode where a child switches between tapping MCQ tiles and typing on a numpad within the same level.
- **Open question:** With the current numpad-only play loop, this is a no-op. Flag for when MCQ is implemented.

---

### R11. Derived-fact bridge scheduling in sampler

- **Priority:** P2
- **Effort:** M
- **Evidence anchor:** Brief §1. Siegler: scaffold the invention of derived strategies. After fluent 5+5, queue 5+6. After fluent 6×4, queue 6×5.
- **Current state:** No derived-fact bridge logic exists anywhere. The sampler picks bands by weighted offset; it has no awareness of which specific facts are fluent and which near-neighbour facts would benefit from bridging.
- **Proposed change:** Add a `derivedBridges` map to `config.ts` or a new `src/lib/engine/bridges.ts` file:

```ts
// bridges.ts
export const DERIVED_BRIDGES: Array<{ from: string; to: string }> = [
	{ from: 'add:b3:5+5', to: 'add:b4:5+6' },
	{ from: 'add:b3:5+5', to: 'add:b4:6+5' },
	// doubles → doubles+1 for B3/B4 addition facts
	{ from: 'mul:b2:2+2', to: 'mul:b4:2+3' } // etc.
];
```

In `recordAnswer`, when `fastCorrectStreak >= FAST_CORRECT_STREAK_THRESHOLD` for a fact, look up its `derivedBridges` and queue those target question IDs for priority sampling in the next level. Store queued bridge targets in `MasteryState.pendingBridges: string[]`.

- **Migration concern:** `pendingBridges` defaults to `[]` in migrate.
- **Expected impact:** The game actively scaffolds derived-strategy invention rather than waiting for it to emerge. Directly implements Siegler's mechanism for the slow→fast transition.
- **Open question:** The bridge map for all 100 single-digit + and all 45 × table facts is non-trivial to maintain. Is P2 right, or should this be deferred to v2 after per-fact tracking (R2, R6) is validated?

---

### R12. Error feedback: show correct answer, neutral tone, 1.5s

- **Priority:** P2
- **Effort:** S
- **Evidence anchor:** Brief §5 / mismatch 11 (growth-mindset copy) and §5 directly. Fyfe & Rittle-Johnson (2016): immediate correct-answer feedback beat summative feedback in 2nd graders. Red flash + screen shake is anxiety-inducing.
- **Current state:** `routes/play/+page.svelte:499-538` — on wrong answer, a `flash-wrong` CSS class applies both a red overlay flash AND a `shake` animation (translate left/right). The current feedback does not display the correct answer at all — the child sees a shake and gets a new question. There is no "correct answer was X" display.
- **Proposed change:** On wrong answer: (1) show the correct answer for ~1.5s in the prompt area (e.g., green highlight on the answer slot showing the correct number), (2) keep the wrong-sound play, (3) remove the screen shake or reduce it to a very subtle 2px movement. The flash is borderline — a brief neutral colour is fine, a red punishing flash is not. The correct-answer display is the highest-value part: it drives the retrieval-practice benefit even on missed questions.

```ts
// session.ts — add to SessionState
correctAnswerDisplayUntil: number | null;
```

- **Migration concern:** None. Session-only state.
- **Expected impact:** Turns every wrong answer into a learning event (the correct answer is shown). Removes the most anxiety-triggering animation (screen shake). Aligns with the brief's "brief, neutral, show the correct answer, move on" specification.
- **Open question:** How long to show the correct answer? 1.5s is the brief's suggestion. Should the monster continue moving during this display (arguably adds time pressure) or pause (arguably correct, since the kid is absorbing the right answer)?

---

## Build order

Dependencies determine the sequence. Items that can proceed in parallel are marked.

1. **R1** (wall-clock Leitner + 4th bucket) — foundational. All spacing-dependent improvements build on real-time scheduling. Includes the one-bucket demote-on-miss behaviour change.
2. **R2** (per-fact keys for +/−) — independent of R1 but should land together since both touch `LeitnerEntry` shape and the `migrate()` function. Do in the same PR as R1.
3. **R6** (silent latency / fast-correct streak) — depends on the `LeitnerEntry` shape being stable (R1 done). Touches `MasteryState` and `recordAnswer`.
4. **R4** (mid-level demote on error burst) — parallel with R3 / R6. Touches only `mastery.ts:applySteadyState`. No dependencies.
5. **R3** (choices_easy cap at 3 exposures) — parallel with R4. Touches `config.ts` only; no-op until MCQ is wired to the play route.
6. **R8** (interleaving anti-repeat in sampler) — parallel with R4/R3. Touches only `sampler.ts:generateLevel`. Ten-line change.
7. **R5** (band-level mini-burst) — after R2 (needs stable per-fact seen-band tracking). Touches `sampler.ts` and adds `bandIntroRemaining` to `MasteryState`.
8. **R12** (error feedback — show correct answer, remove shake) — parallel at any point. Pure UI; no engine changes.
9. **R7** (coin/reward audit) — confirm and document; likely no code change. Parallel at any point.
10. **R9** (concrete representations at × unlock) — after R5 (band intro burst) is validated. Requires new Svelte component and `presentationHint` on `Question`. Largest single effort item; schedule for a dedicated session.
11. **R10** (no stage mixing within a level) — at the time MCQ is wired to the play route. Prerequisite: MCQ rendering exists.
12. **R11** (derived-fact bridges) — last; depends on R2 (per-fact tracking) and R6 (fluency signal) both being in production and validated.

---

## Out of scope

- **Growth-mindset copy and coaching.** Meta-analysis d = 0.05, d = 0.02 in high-quality subset (Macnamara & Burgoyne 2022). For one advantaged, well-parented 7-year-old this is noise. Keep copy behavioural ("encore !"); spend zero design time on characterological framing.
- **Streak counters and daily-login bonuses.** Well-evidenced to drive playtime, not learning (brief §7). They also introduce scheduling anxiety ("I have to play today"), which is antithetical to the low-pressure design.
- **Number-line mini-mode.** The brief cites Siegler & Ramani (2009): ~1 hour of cumulative play yields measurable gains. Worth considering in v2 for numeracy foundation, but it is off the critical learning path for the +/−/× fact retrieval this game targets. Defer until the core engine improvements are validated.
- **Half-life regression / SRS model upgrade.** Brief §2 mentions Settles & Meeder (2016). Requires enough per-fact data to estimate individual forgetting curves. Not applicable until the game has months of real-session data from Léo. Premature optimisation of the scheduler.
- **Avatar customisation, narrative, badges.** Brief §7: these add d ≈ 0.2–0.4 in controlled studies but do not improve math learning specifically; the effect collapses when the control group uses targeted retrieval practice. The game's adaptive loop is the value; cosmetic additions should remain cosmetic and should not consume engine design time.

---

## Open questions for Kevin before implementation begins

1. **Session length target.** The brief favours 10–15 min/day over weekly massing. Does Léo play daily? If sessions are irregular and long, the wall-clock floors in R1 need to account for this (bucket 0 at "10 min" may never fire within a session if he plays for 5 min and stops).

2. **MCQ stage status.** The play route exclusively shows `Numpad` today. `OpMastery` has `stages` and `stageProgress` fields in the source but they are not in `types.ts` and are not rendered. Are MCQ stages still planned? R3 and R10 are no-ops until that decision is resolved.

3. **÷ timeline.** The brief flags ÷ concrete representation as "essential, not optional" (R9). If ÷ ships in v1 without concreteness fading, that's a meaningful regression from the evidence. What is the timeline for ÷, and is there a hard commitment to add concrete representations before it ships?

4. **Concrete representation medium.** R9 requires a new `ConcreteQuestion.svelte` component with dot-array or grouped-circle rendering. Should this use SVG (clean, accessible) or Canvas (more flexible for animation)? This is a design call before any implementation begins.

5. **Coin reward audit.** The play route awards 15 base coins per win plus track-coin bonuses. Are there any other coin award sites (daily login? streaks?) planned? Confirm the invariant that coins are never per-question-correctness-gated before those features are added.
