# Bridge — design brief

## Context

A third mini-game alongside numpad fact-retrieval (symbolic) and number-line jump (linear-spatial). Bridge teaches the **make-ten / bridging-through-ten strategy** — explicitly walking the kid through the decomposition `8 + 5 = 8 + 2 + 3 = 13`, scaled up to two-digit work via base-10 bundles (`27 + 38 = (20+30) + (7+8)`). Target user is one 7-year-old (Léo) who is mid-second-grade-equivalent, already grinding fact retrieval in a separate game. The design question: what mechanic and band ladder make this game _genuinely complementary_ to facts (retrieval) and number-line (magnitude), rather than redundant.

The earlier "ten-frames tap-to-fill" design was rejected — busywork, no real wrong path, no skill being tested at the kid's level. This brief redesigns around the multi-step scaffolded mechanic that the ITS / worked-example literature supports.

---

## 1. Mechanic: multi-step scaffolded decomposition

**What the research says.** The strongest single piece of evidence is VanLehn (2011, _Educational Psychologist_), a meta-analysis showing **step-based intelligent tutoring produces d ≈ 0.76 over no-tutoring versus d ≈ 0.31 for answer-only computer tutoring** — a ~2.5× gap that survives serious meta-analytic scrutiny. The mechanism, convergent across Anderson et al. (1995) on Cognitive Tutors, Sweller's worked-examples program (Sweller, van Merriënboer & Paas 2019), and Chi et al. (1989) on self-explanation, is that the step is where misconceptions localize and where the learner is forced to retrieve rather than guess. Renkl (2014) reports worked-example + self-explanation effects of d ≈ 0.4–0.7 in arithmetic/algebra; Rittle-Johnson (2006) found explanation-prompted procedural transfer gains of d ≈ 0.4–0.6 in 3rd–5th-graders on equation solving. None of these RCTs is on iPad math games for 7-year-olds specifically — the inferential step is "elementary arithmetic decomposition is a step-structured task and obeys the same regularity," which is short.

The pedagogical content match is supplied by the make-ten literature. Murata (2004, _Cognition and Instruction_) documents Japanese Grade 1 instruction explicitly scaffolding `8+5 → 8+2+3 → 13` with manipulatives. Murata & Fuson (2006, _JRME_) follows up with the same finding. Fuson & Kwon (1992, _Child Development_) shows Korean first-graders, taught the ten-structured decomposition explicitly, use the make-ten strategy on >90% of relevant problems vs. <20% for US peers. The strategy is _learnable as a procedure_, not a stage children pass through spontaneously, and the procedure is exactly the three-step decomposition the mechanic asks for.

The "tap until correct" mechanic this redesign replaces is squarely in the answer-based regime VanLehn identified as weakest. It also lets the kid hit the answer by accident on overshoot/undershoot — there is no path through the strategy itself.

**Strongest evidence.** VanLehn (2011), _Educational Psychologist_, 46(4), 197–221 — meta-analytic d ≈ 0.76 vs 0.31 for step- vs answer-based. Murata (2004), _Cognition and Instruction_, 22(2), 185–218 — direct documentation of the 3-step bridging instruction in Grade 1.

**Recommended mechanic.** Three-step scaffolded bridging for every band. The kid commits each sub-decision explicitly via a single tap from 3–4 multiple-choice options. The visual updates after each commit so the kid _sees_ the decomposition happen, not just the result.

For sums within 20 (`8 + 5 = ?`):

1. **"Complete to 10":** prompt `8 + ? = 10`, options `[1, 2, 3, 4]`. Correct → first ten-frame fills to 10.
2. **"Remainder":** prompt `5 − 2 = ?`, options `[2, 3, 4]`. Correct → second ten-frame shows the remainder.
3. **"Total":** prompt `8 + 5 = ?`, options `[12, 13, 14]`. Correct → both frames visible, answer pinned.

For two-digit sums (`27 + 38 = ?`) with the same 3-step shape:

1. **"Add the tens":** prompt `20 + 30 = ?`, options `[40, 50, 60]`. Correct → tens bundles combine into one row of 5 ten-bundles.
2. **"Add the ones":** prompt `7 + 8 = ?`, options `[14, 15, 16]`. Correct → unit dots bridge and combine.
3. **"Total":** prompt `27 + 38 = ?`, options `[55, 65, 75]`. Correct → full breakdown shown as 6 ten-bundles + 5 dots.

For subtraction (`24 − 7 = ?`):

1. **"Subtract to next-lower ten":** `24 − ? = 20`, options `[3, 4, 5]`. Correct → 4 dots removed.
2. **"Remainder to subtract":** `7 − 4 = ?`, options `[2, 3, 4]`. Correct.
3. **"Total":** `24 − 7 = ?`, options `[16, 17, 18]`. Correct.

The mechanic is consistent across bands; only the sub-step content adapts to the question type.

---

## 2. Band ladder

**What the research says.** Difficulty in bridging problems is driven by three orthogonal factors. (a) **Complement-to-10 size:** Murata (2004) and the broader Japanese-curriculum descriptions document that kids find sums where the first addend is _close to 10_ easier (`9 + X` requires a +1 bond; `5 + X` requires a +5 bond — much harder mental decomposition). (b) **Range:** Friso-van den Bos et al. (2014) and Siegler & Booth (2004), already cited in the number-line brief, place 0–20 in the empirical sweet spot for a mid-2nd-grade kid and 0–100 within reach but harder. (c) **Two-digit complexity:** Two-digit + two-digit problems (`27 + 38`) introduce a tens-decomposition layer on top of the unit bridging — this is where Singapore Math's split-strategy / "left-to-right" instructional sequence places the next gate after within-20 fluency.

Subtraction bridging (`24 − 7 = (24 − 4) − 3 = 17`) is structurally inverse to addition bridging — decompose the subtrahend to land on the previous ten. The verified literature on ten-frame subtraction is thinner than for addition (most ten-frame work is additive; the closest support is Baroody's think-addition / subtract-from-ten work in derived-fact strategies). Treat subtraction bands as later in the ladder, both because of weaker evidence and because Léo will be more fluent on addition first.

**Recommended ladder.** Eight bands, all bridging-focused. No subitize bands — Léo is past that developmental window, and a single-tap subitize mechanic does not earn its slot when the facts game already covers 1-tap recall.

- **B1: Bridging within 20, easy/medium bonds.** First addend ≥ 6 (`9+4, 8+5, 7+6, 9+7`). Bond-to-10 is small (1–4). The foundational band; visual = literal ten-frames.
- **B2: Bridging within 20, hard bonds.** First addend ≤ 5 (`5+8, 4+9, 3+9`). Bond is 5+; cognitive flip — the kid usually wants to start from the bigger addend, but here it's second. Same visual.
- **B3: Two-digit + one-digit bridging.** `28+5, 47+8, 76+9`. Same units pattern as B1, plus tens scaffold. Visual switches to mixed bundles + loose dots — `28` rendered as 2 ten-bundles + 8 unit dots; `5` as 5 unit dots.
- **B4: Two-digit + two-digit, no unit bridging.** `23+15, 41+27`. Introduces tens-addition cleanly without overloading — the unit sum stays under 10, so no bridge at the units level. Visual: bundles + dots.
- **B5: Two-digit + two-digit with unit bridging.** `17+38, 26+47, 58+34`. Full complexity within 100 — both tens decomposition and unit bridging happen. Visual: bundles + dots, with the unit bridge animated.
- **B6: Subtraction bridging within 20.** `13−5, 17−9`. Decompose subtrahend to land on 10. Visual: literal ten-frames, dots removing.
- **B7: Subtraction two-digit + one-digit bridging.** `24−7, 41−5, 82−6`. Visual: bundles + dots.
- **B8: Subtraction two-digit + two-digit bridging.** `52−37, 81−24`. Visual: bundles + dots.

**Difficulty ordering rationale.** The within-20 bands (B1–B2) split by complement size because that's the most variable difficulty axis at small sums; B3 introduces tens without changing the unit pattern; B4 introduces tens-addition without bridging; B5 stacks both. Subtraction follows the same shape but starts at within-20 (B6) because the inverse-decomposition is a separate cognitive move worth introducing without two-digit complexity.

---

## 3. Visual representation: per-world animated tokens, base-10 bundles

**The principle.** Plain dots / spheres are visually inert and don't carry through to the harder bands without the metaphor breaking. The literal ten-frame works for sums ≤ 20; for two-digit work the dot vocabulary scales naturally to **base-10 bundles** (each 10 = a compressed 2×5 mini-frame of the same token, units = individual loose tokens). This is the Singapore Math / Cuisenaire / MAB representation; Bruner's CPA framework names it as the iconic stage between physical counters and symbolic notation. Using the _same token_ for individual dots and for the bundles preserves the metaphor: the kid sees "8 dots + 2 dots = a full 10 (a bundle), and 3 dots left over," and at higher bands "2 bundles + 7 dots + 3 bundles + 8 dots = 5 bundles + 15 dots = 6 bundles + 5 dots."

**Per-world tokens** (consistent with `worldThemeFor(level)` already used by the other games):

- Forest → **apple** (red on dark green; high contrast, animated bobbing idle)
- Desert → **pineapple** (yellow on burnt orange)
- Cave → **blue diamond** (gem in cave)
- Snow → **strawberry** (red on light slate)
- Pirate → **golden skull**

Token sources: Pixel Adventure 1 / Items / Fruits (apple, pineapple, strawberry — 17-frame bobbing sprite sheets) and Treasure Hunters / Pirate Treasure (blue diamond 4-frame, golden skull 8-frame). All are animated idle states; the cell shows constant subtle motion, much more appealing than static dots.

**Bundle visualization.** A "10-bundle" renders as a small filled 2×5 grid of tokens (a literal compressed ten-frame). The 5+5 structure inside the bundle stays visible at a glance — the kid recognizes "that's a full ten" instantly because it looks like the within-20 bands' frames in miniature. At B5 the kid sees `2 bundles + 7 loose tokens + 3 bundles + 8 loose tokens` arranged spatially, then watches them combine into `5 bundles + 5 loose tokens` after the unit bridge.

Shop integration was considered and dropped — replacing the per-world default token via shop choice is unintuitive (the kid expects the world theme to drive the visual). Per-world tokens are fixed in v1.

---

## 4. Wrong-answer feedback

The same principle as the number-line and the prior ten-frames brief: the corrective signal is the right configuration, not a verdict overlay. For a multi-step mechanic the wrong-answer behavior is per-step:

1. **~400 ms pause** on the kid's wrong selection. Neutral _miss_ tone (matches `numberline-design.md` §2 convention).
2. **Reveal the correct option** by highlighting it among the choices for ~600 ms.
3. **Apply the correct step's visual** (e.g., for step 1 of `8+5`, fill the ten-frame to 10) over ~400 ms.
4. **Advance to the next step** with the correct state in place.

Total ~1.4 s per wrong sub-step — slightly tighter than the number-line's 1.8 s because the visual change is smaller. The kid sees the right answer take effect, then the strategy continues from the correct branch — not abandoned, not restarted. This matches the worked-example literature (Renkl 2014): seeing the correct intermediate step is the learning event.

The whole-question is marked "wrong" if the kid missed any sub-step; mastery uses first-attempt-correct on each step. This gives the engine three signals per question (one per sub-step), a richer mastery picture than facts-style single-tap recall.

---

## 5. Session length and band-gating

**Why 4 questions per level instead of 10.** Each bridging question is 3 sub-step taps, so 10 questions × 3 steps = 30 commit-points. That is more than the facts game's 10 single-tap answers, and the literature on session length for tablet math interventions (Outhwaite et al. 2019; Schacter & Jo 2017) suggests 8 minutes is well within engagement envelopes for 7-year-olds — but matching the _length_ of a facts level is the right design call for cross-game pacing. **Four questions × 3 steps = 12 commit-points,** comparable to the 10 single-tap answers of a facts level, and well above the testing-effect threshold (Karpicke & Roediger 2008) below which retrieval-practice gains plateau.

**Expertise-reversal gating** (Kalyuga 2007, _Educational Psychology Review_). The expertise reversal effect is real and well-replicated: scaffolding designed for novices becomes redundant load for fluent solvers and can _hurt_ their performance relative to no-scaffold formats. Léo is described as already fluent on within-20 facts retrieval. For sums he can already retrieve, the 3-step scaffold may feel like busywork. The defensible mitigation is **adaptive fading** (Salden et al. 2010, _Instructional Science_): once a kid demonstrates mastery on a sum class within a band (e.g., 5 consecutive correct first-attempt totals on a `9+X` family), the engine drops the intermediate steps for that family and shows only the total prompt. This converts forced scaffolding into scaffolding-that-retracts, which Salden showed beats both fixed-scaffold and no-scaffold conditions. v1 ships without adaptive fading (one mechanic, all 3 steps); v2 adds the fade.

---

## Synthesis: the design rules

1. **Multi-step scaffolded bridging is the only mechanic.** Every band, every question, three sub-step taps. No subitize bands, no tap-to-fill, no auto-complete. The step is the unit of mastery and feedback, per VanLehn 2011 and the worked-example literature.
2. **Eight bands, all bridging-focused.** Within-20 (B1–B2) → two-digit add (B3–B5) → subtraction (B6–B8). Difficulty ordered by complement-to-10 size first, then range, then operation.
3. **Visual is per-world animated tokens with base-10 bundles for two-digit work.** The literal ten-frame metaphor scales by compressing each 10 into a 2×5 mini-frame of the same token. The dot vocabulary is preserved end-to-end.
4. **Wrong-answer feedback is per-step KCR with no verdict overlay.** ~1.4 s dwell per wrong sub-step, the strategy continues from the correct branch.
5. **4 questions per level.** Matches the commit-count of a facts level (12 vs 10) and respects the longer per-question time of the multi-step mechanic.
6. **Expertise-reversal flagged for v2 adaptive fading.** v1 ships fixed-3-steps; v2 drops the intermediate steps for sum classes the kid demonstrates mastery on, per Salden 2010.

---

## Sources

- Anderson, J. R., Corbett, A. T., Koedinger, K. R., & Pelletier, R. (1995). Cognitive Tutors: Lessons learned. _Journal of the Learning Sciences_, 4(2), 167–207. https://doi.org/10.1207/s15327809jls0402_2
- Chi, M. T. H., Bassok, M., Lewis, M. W., Reimann, P., & Glaser, R. (1989). Self-explanations: How students study and use examples in learning to solve problems. _Cognitive Science_, 13(2), 145–182. https://doi.org/10.1016/0364-0213(89)90002-5
- Friso-van den Bos, I., Kolkman, M. E., Kroesbergen, E. H., & Leseman, P. P. M. (2014). Explaining variability: Numerical representations in 4- to 8-year-old children. _Journal of Cognition and Development_. https://pmc.ncbi.nlm.nih.gov/articles/PMC3344704/
- Fuson, K. C., & Kwon, Y. (1992). Korean children's understanding of multidigit addition and subtraction. _Child Development_, 63(2), 491–506. https://doi.org/10.2307/1131494
- Kalyuga, S. (2007). Expertise reversal effect and its implications for learner-tailored instruction. _Educational Psychology Review_, 19(4), 509–539. https://doi.org/10.1007/s10648-007-9054-3
- Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. _Science_, 319(5865), 966–968. https://doi.org/10.1126/science.1152408
- Koedinger, K. R., & Aleven, V. (2007). Exploring the assistance dilemma in experiments with Cognitive Tutors. _Educational Psychology Review_, 19(3), 239–264. https://doi.org/10.1007/s10648-007-9049-0
- Murata, A. (2004). Paths to learning ten-structured understanding of teen sums: Addition solution methods of Japanese Grade 1 students. _Cognition and Instruction_, 22(2), 185–218. https://doi.org/10.1207/s1532690Xci2202_2
- Murata, A., & Fuson, K. (2006). Teaching as assisting individual constructive paths within an interdependent class learning zone. _Journal for Research in Mathematics Education_, 37(5), 421–456. https://www.jstor.org/stable/30034861
- Outhwaite, L. A., Faulder, M., Gulliford, A., & Pitchford, N. J. (2019). Raising early achievement in math with interactive apps: A randomized control trial. _Journal of Educational Psychology_, 111(2), 284–298. https://pmc.ncbi.nlm.nih.gov/articles/PMC6366442/
- Renkl, A. (2014). Toward an instructionally oriented theory of example-based learning. _Cognitive Science_, 38(1), 1–37. https://doi.org/10.1111/cogs.12086
- Rittle-Johnson, B. (2006). Promoting transfer: Effects of self-explanation and direct instruction. _Child Development_, 77(1), 1–15. https://doi.org/10.1111/j.1467-8624.2006.00852.x
- Salden, R. J. C. M., Aleven, V., Schwonke, R., & Renkl, A. (2010). The expertise reversal effect and worked examples in tutored problem solving. _Instructional Science_, 38, 289–307. https://doi.org/10.1007/s11251-009-9107-8
- Schacter, J., & Jo, B. (2017). Improving preschoolers' mathematics achievement with tablets: A randomized controlled trial. _Mathematics Education Research Journal_, 29(3), 313–327. https://eric.ed.gov/?id=EJ1151803
- Siegler, R. S., & Booth, J. L. (2004). Development of numerical estimation in young children. _Child Development_, 75(2), 428–444.
- Sweller, J., van Merriënboer, J. J. G., & Paas, F. (2019). Cognitive architecture and instructional design: 20 years later. _Educational Psychology Review_, 31, 261–292. https://doi.org/10.1007/s10648-019-09465-5
- VanLehn, K. (2011). The relative effectiveness of human tutoring, intelligent tutoring systems, and other tutoring systems. _Educational Psychologist_, 46(4), 197–221. https://doi.org/10.1080/00461520.2011.611369
