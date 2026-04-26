# Arithmetic learning — research brief

**Audience.** Architect agent for `maths_game_7`; eventually a parent-facing "why this game works the way it does" page.

**Scope.** Cognitive/educational research on how 6–9 year olds learn the four basic arithmetic operations. Focus on principles that translate to engine parameters (sampler, scheduler, feedback rules, difficulty ladder), not classroom pedagogy.

**Method caveat.** Structured literature review from web-accessible abstracts, PDFs, and meta-analyses; not a registered systematic review. Effect sizes for game-based interventions are noisy and depend heavily on the comparison condition.

---

## 1. Strategy-choice / overlapping-waves model (Siegler)

**What the research says.** Siegler (1996): children don't "graduate" from counting to retrieval; at any moment they have several strategies (count-all, count-on, decomposition, derived facts, retrieval) and choose adaptively per problem. Distributions overlap as waves — a less-mature strategy peaks then declines. Microgenetic studies (incl. Boom et al., 2012, latent-growth confirmatory study of 98 kids learning multiplication) show this is **per fact**, not per child or per operation: a 7yo may retrieve 2+3 instantly while still counting on for 7+8 in the same minute. Transitions to retrieval are predicted by repeated successful execution of slower strategies on the same problem.

**Strongest evidence.** Siegler (1996), _Emerging Minds_. Boom et al. (2012), _Journal of Experimental Child Psychology_: "frequencies of mathematical solution strategies increase and decrease as the child becomes more proficient … solution strategies resemble waves that rise and fall during development."

**How it maps to game mechanics.**

- **Per-fact tracking for ×/÷ is right; for + and − band-level (`'template'`) is too coarse.** 6+7 and 8+9 sit in the same band but cross to retrieval at very different times. Move to per-fact granularity for sums ≤ 20.
- **Use response latency as the slow→fast strategy estimator.** A correct answer in 8s is counting; in 1s is retrieval. Track silently, never display.
- **Promote a fact out of the "due" pool only when fast-correct hits ~3 in a row** — Siegler's criterion for retrieval becoming dominant.
- **Schedule derived-fact bridges in the sampler.** After fluent 5+5, queue 5+6; after fluent 6×4, queue 6×5. This gives the child the scaffold to _invent_ derived strategies, not memorise outcomes.
- **Don't penalise slow correct.** Counting on fingers is a strategy in transit, not a near-miss.

**Open questions.** Microgenetic data comes from high-exposure school settings; the slow→fast transition rate at ~10 exposures/week for one 7yo is not pinned down. Tune empirically.

---

## 2. Retrieval practice + spacing

**What the research says.** Retrieval practice beats restudy for durable learning across virtually every domain (Roediger & Karpicke, 2006); Ophuis-Cox et al. (2023) replicated this for multiplication facts in an authentic classroom. Spacing is robust: Cepeda et al. (2008), N >1,350, found the optimal inter-study gap is **~10–20% of the desired retention interval** (1-day gap → ~1-week retention; 1-week gap → ~1-month). **Expanding vs equal intervals is essentially a wash** once you control for first-retrieval timing and total study count. The young-child empirical base is thinner — most studies use college students — but Carpenter et al. (2012) reports the effect is robust across ages.

**Strongest evidence.** Cepeda, Vul, Rohrer, Wixted & Pashler (2008), _Psychological Science_, 19(11), 1095–1102. Carpenter, Cepeda, Rohrer, Kang & Pashler (2012), _Educational Psychology Review_, 24, 369–378.

**How it maps to game mechanics.**

- **The current Leitner intervals (2 / 12 / 40 _answers_) are not anchored to retention-interval evidence.** They count trials, not time. A 40-answer gap inside a single 30-fact session is essentially massed practice. **Add wall-clock minimums per bucket: ≥ 10 min, ≥ 1 day, ≥ 1 week.**
- **Add a 4th bucket (≥ 1 month).** Three buckets cap retention horizon at ~hours; a school holiday will bleed retrieved facts.
- **Lapsed cards drop one bucket, not back to bucket 1** — standard SuperMemo/Anki behaviour; reduces frustration, preserves spacing.
- **Don't waste budget on equal-vs-expanding tuning.** The shape (2 / 12 / 40) is fine; the time anchor is the problem.
- **In v2, consider half-life regression** (Settles & Meeder, 2016) once you have enough per-fact data to estimate forgetting curves.

**Open questions.** Most spacing data is from adults; optimal intervals for a 7yo with developing working memory are not well-characterised.

---

## 3. Interleaving vs blocked practice

**What the research says.** Rohrer & Taylor (2007), Taylor & Rohrer (2010): 4th graders practicing four problem types interleaved scored ~77% next-day vs ~38% blocked, **d ≈ 1.21**. Replicated with 7th graders over 9 weeks (Rohrer, Dedrick & Stershic, 2015), **d ≈ 1.05** — one of the largest effect sizes in education research. Mechanism: **discriminative contrast** (interleaving forces strategy choice, the actual real-test skill) plus **distributed practice**. Interleaving hurts practice-session performance, helps delayed retention.

**Critical novice caveat.** Hwang et al. (2025) and Foster et al. (2022) show interleaving can backfire for true novices who haven't built form–meaning associations. Pattern: **brief blocked intro (~3 trials), then interleave**.

**Strongest evidence.** Rohrer & Taylor (2007), _Instructional Science_, 35(6), 481–498. Taylor & Rohrer (2010), _Applied Cognitive Psychology_, 24(6), 837–848.

**How it maps to game mechanics.**

- **Interleave more aggressively _within_ an operation.** Within multiplication, alternate fact families (×3 then ×7 then ×4) rather than blocking ×3 in a row.
- **Add a mini blocked burst when a new band/template unlocks** — ~3 questions, then dump into the regular interleaved mix. Same logic as the existing operation-level calibration burst, applied at band granularity.
- **Within a 10-question level, target ≥ 50% problem-type alternation.** That's the interleaving-active threshold the literature implies.
- **Don't interleave presentation stages within a level.** A single level should not mix MCQ and numpad — that's extraneous discrimination load, not desirable difficulty.

**Open questions.** Lab/classroom effects are huge; in self-paced single-player play they likely shrink, and the frustration cost of a discriminative miss is higher than in a graded setting.

---

## 4. Desirable difficulties + the 85% rule

**What the research says.** Bjork & Bjork (2011, 2020): conditions that slow acquisition often improve long-term retention — spacing, interleaving, generation, varied conditions, _moderate_ error rates. Wilson et al. (2019) "85% rule": for SGD learners on binary perceptual classification, learning rate is maximised at ~85% training accuracy. The result is tight for that class of learner; generalisation to humans is **suggestive, not proven**, strongest analogue in perceptual learning not fact retrieval. Classroom/tutoring research consistently lands on a **70–85% practice-accuracy band** as the sweet spot.

**Strongest evidence.** Wilson, Shenhav, Straccia & Cohen (2019), _Nature Communications_, 10, 4646. Bjork & Bjork (2020), _Journal of Applied Research in Memory and Cognition_, 9(4), 475–479.

**How it maps to game mechanics.**

- **Target ~80% rolling accuracy as the trigger for promotion/demotion** on both bands and presentation stages: rolling-20 < 70% → demote; > 90% → promote.
- **Keep the level-boundary evaluation cadence**, but add a hard mid-level demote if 3 errors in 5 questions in the same band. A child shouldn't grind 9 wrong answers before re-evaluation.
- **`choices_easy` (wide-distractor 4-MCQ) is below the desirable-difficulty floor.** Guessing baseline is ~75%; trains nothing. Use it only for first ~3 exposures of a new band, then promote unconditionally.
- **The "no time pressure on input" rule is correct for fluency _acquisition_** but inconsistent with fluency _measurement_ (speed = strategy signal). Resolution: keep no-pressure typing, but log latency silently and use it in the mastery estimator. Never show a clock.
- **Don't stealth-ease.** Desirable difficulty only works if the learner stays in the loop; the kid should _feel_ the climb.

**Open questions.** Wilson's 85% is binary classification; 4-MCQ and numpad don't map cleanly. The 70–90% corridor is a pragmatic gloss, not a derivation.

---

## 5. Math anxiety / mindset

**What the research says.** Math anxiety is measurable as early as Grade 1 and bidirectionally predicts performance — it consumes working memory needed for arithmetic (Beilock & Maloney, 2015; Ramirez et al., 2013). Dominant triggers in young children: **timed tests, public scoring, high-stakes error feedback** (Boaler, 2014). One-to-one cognitive tutoring reduced math anxiety _and_ right-amygdala reactivity in 7–9yos (Supekar et al., 2015). Math-game meta-analyses find a small anxiety reduction, moderated by adaptive difficulty, safe error handling, and absence of ranking.

**Growth mindset is largely deflated.** Sisk et al. (2018): d = 0.08 for achievement. Macnamara & Burgoyne (2022) across 63 studies: d = 0.05; d = 0.02 in the high-quality subset. Effects concentrate in disadvantaged populations. **For one advantaged 7yo, growth-mindset framing does little; anxiety-prevention affordances do much more.**

**Strongest evidence.** Beilock & Maloney (2015), _Policy Insights from the Behavioral and Brain Sciences_, 2(1), 4–12. Supekar, Iuculano, Chen & Menon (2015), _Journal of Neuroscience_, 35(36), 12574–12583. Sisk et al. (2018), _Psychological Science_, 29(4), 549–571.

**How it maps to game mechanics.**

- **Keep no-time-pressure; mark it load-bearing.** Visible countdowns are the most consistently anxiety-inducing UI element in this literature.
- **Error feedback: brief, neutral, show the correct answer, move on** (~1.5s). No sad sounds, no red flashes. Fyfe & Rittle-Johnson (2016): immediate correct-answer feedback beat summative feedback in 2nd graders.
- **No public scoring, no leaderboards.** Already correct.
- **Decouple coins from accuracy.** Tie to questions completed and time spent, not correctness. The literature on extrinsic-reward-tied-to-performance is consistent: short-term engagement up, intrinsic motivation down.
- **No mindset speeches.** Keep copy behavioural ("encore !") not characterological ("tu es intelligent !"). Worth almost nothing for this kid; the budget is better spent on consistent low-anxiety practice.

**Open questions.** Whether parent presence/co-play helps or hurts. Maloney et al. (2015): math-anxious parents transmit anxiety, so the parent channel matters.

---

## 6. Concreteness fading

**What the research says.** Goldstone & Son (2005): starting concrete and fading to abstract produces better transfer for novel math principles than either extreme alone. Fyfe et al. (2014) systematic review confirms benefits especially on delayed-transfer tests, largest for conceptual material the child doesn't yet understand. For pure **fact retrieval** (7×8 = 56), concreteness is largely irrelevant — once retrieval is the strategy, the symbolic form is what's stored. Concreteness fading matters at _introduction_ of new operations, not during fluency drilling.

**Strongest evidence.** Fyfe, McNeil, Son & Goldstone (2014), _Educational Psychology Review_, 26, 9–25. Goldstone & Son (2005), _Journal of the Learning Sciences_, 14(1), 69–110.

**How it maps to game mechanics.**

- **The presentation-stage ladder is _not_ concreteness fading** — it's distractor-narrowing. They're different design tools and complementary.
- **At × unlock (level 20), add a brief concrete representation stage:** dot arrays for ×2, grouped circles for ×3, etc., for ~10 trials per new band. Then fade to bare numerals. × is conceptually new (repeated addition); the kid needs the model.
- **At ÷ unlock (level 40), this is essential, not optional.** ÷ as "sharing into N piles" with concrete groups, then "how many groups of N", then bare numerals. Don't ship ÷ as bare-numeral MCQ.
- **For + and − above the count-on threshold, fading is unnecessary** — the kid has the model from school.
- **Add a number-line widget for early bands** (per Siegler & Ramani, 2009). It's concrete representation _and_ magnitude scaffold; ~1 hour of cumulative play with linear number-line games has produced measurable arithmetic gains.

**Open questions.** Whether on-screen tap "concreteness" matches physical manipulatives. Manches & O'Malley (2016): roughly yes; Carbonneau et al. (2013): physical wins for the youngest learners.

---

## 7. Game-based learning / educational game design

**What the research says.** Honestly: game-based math learning beats no practice but only marginally beats well-designed non-game retrieval practice. Mayer's "value-added" research (Mayer, 2019): individual game features (narrative, points, avatars) add small effects (d ≈ 0.2–0.4) in isolation. The largest digital-game-based STEM meta-analysis (Wang et al., 2023) reports g ≈ 0.66 over conventional instruction, but math is among the weaker domains and the effect collapses when controls also use targeted retrieval practice. **The Number Race** (Wilson, Dehaene et al., 2006), the most rigorously evaluated math game for this age, produces medium gains in numerical magnitude and small/inconsistent gains in arithmetic facts. What _doesn't_ transfer: avatars, narrative, badges, competitive elements. What _does_: targeted retrieval practice, adaptive difficulty, immediate corrective feedback, low extraneous cognitive load (Mayer's coherence/signalling principles).

**Strongest evidence.** Mayer (2019), _Annual Review of Psychology_, 70, 531–549. Wilson, Dehaene, Pinel, Revkin, Cohen & Cohen (2006), _Behavioral and Brain Functions_, 2, 19. Wang et al. (2023), _International Journal of STEM Education_, 10, 36.

**How it maps to game mechanics.**

- **Strip extraneous cognitive load.** Mayer's coherence principle: no narrative, characters, or background music on the practice screen unless they directly cue the math. Current minimal French UI is correctly aligned — keep it.
- **Coin/shop reward should be cosmetic-only and untied to per-question accuracy** (see §5). No randomness in payouts (already a stated rule).
- **The single highest-leverage game-design move is _adaptive difficulty done well_.** The engine's per-band sampler + Leitner reinforcement is the mechanism the Number Race RCTs validated. Stay disciplined about not adding "fun" features that compete with the adaptive loop.
- **Add a number-line / magnitude mini-mode** off the critical path. ~1 hour of cumulative play has produced measurable arithmetic gains in low-numeracy children.
- **Resist streak counters, daily-login bonuses, and avatar customisation.** Well-evidenced to drive _playtime_, not _learning_.

**Open questions.** Optimal session length isn't game-specifically pinned, but general spacing evidence favours 10–15 min/day over weekly massing.

---

## Synthesis

Five high-leverage principles for the architect:

1. **Per-fact tracking, not per-band, for facts ≤ 20.** Strategy choice and retrieval transitions happen per fact (Siegler). The `'instance'` granularity for ×/÷ is right; `'template'` for +/− is too coarse.
2. **Time-anchored spacing.** Cepeda's ridgeline is in real time; a 40-trial gap that fits in 12 minutes is not a 40-trial gap across two days. Add wall-clock floors per Leitner bucket.
3. **Brief blocked introduction, then interleave.** Within a level, ≥ 50% problem-type alternation. New templates get ~3 blocked trials before being mixed in.
4. **Target ~80% rolling accuracy** as promote/demote trigger on both bands and presentation stages (70/90 corridor).
5. **Anxiety-prevention beats mindset coaching** for this kid: no timers, no public scoring, neutral error feedback, decouple rewards from accuracy. Concreteness fading at × and ÷ unlock; not for +/−.

---

## Where current mechanics are out of step with the evidence

- **Leitner intervals count answers, not time.** Cepeda's spacing law is in real time. A 40-answer gap inside a single session ≈ massed practice. _Fix: wall-clock floors per bucket (≥ 10 min, ≥ 1 day, ≥ 1 week)._
- **Only 3 Leitner buckets** caps retention horizon at ~hours. Insufficient for 1+ week retention. _Fix: 4–5 buckets, top bucket ≥ 1 month._
- **`'template'` granularity for + and − loses per-fact information.** Siegler's waves are per-fact. _Fix: per-fact tracking for sums ≤ 20._
- **Stage transitions evaluated only at level boundaries (10 questions).** Too coarse — 9 wrong answers before re-evaluation. _Fix: keep level-boundary eval, add hard mid-level demote on 3 errors in 5 in the same band._
- **`choices_easy` wide-distractor 4-MCQ is below the desirable-difficulty floor** (~75% guess baseline). _Fix: use it only for first ~3 exposures of a new band, then promote unconditionally._
- **Calibration burst is per-operation only.** A new × band cold-started without blocked intro will trigger the novice-interleaving failure mode. _Fix: 3-question mini-burst when each new band first appears._
- **No concrete representation at × and ÷ unlock.** × at level 20 is conceptually new; jumping straight to MCQ is unsupported. _Fix: dot-array / grouped-circle representation for first ~10 trials of each new × band; required for ÷ unlock._
- **No magnitude / number-line component.** Siegler's board-game intervention shows ~1 hour of cumulative play yields measurable gains; one of the few free lunches in the literature. _Fix: number-line mini-mode, separate from main loop._
- **No silent latency tracking.** "No time pressure" is correct UX, but the engine should still record response time per fact to estimate strategy (slow = counting, fast = retrieval). _Fix: log latency per answer; feed mastery estimator; never show._
- **Verify coin reward isn't tied to per-question correctness.** If it is, that's the documented intrinsic-motivation failure mode. _Fix: tie coins to questions completed and time played._
- **Any growth-mindset copy is wasted budget.** Meta-analysis d ≈ 0.05; effect concentrates in disadvantaged kids, which this child is not. _Fix: keep French copy behavioural ("encore !"), not characterological._

---

## Sources

- Beilock, S. L., & Maloney, E. A. (2015). Math anxiety: A factor in math achievement not to be ignored. _Policy Insights from the Behavioral and Brain Sciences_, 2(1), 4–12.
- Bjork, R. A., & Bjork, E. L. (2020). Desirable difficulties in theory and practice. _Journal of Applied Research in Memory and Cognition_, 9(4), 475–479.
- Boaler, J. (2014). Fluency without fear: Research evidence on the best ways to learn math facts. YouCubed. https://www.youcubed.org/evidence/fluency-without-fear/
- Boom, J., ter Laak, J., & Hoijtink, H. (2012). Microgenetic patterns of children's multiplication learning: Confirming the overlapping waves model by latent growth modeling. _Journal of Experimental Child Psychology_. https://www.sciencedirect.com/science/article/abs/pii/S0022096512000239
- Carbonneau, K. J., Marley, S. C., & Selig, J. P. (2013). A meta-analysis of the efficacy of teaching mathematics with concrete manipulatives. _Journal of Educational Psychology_, 105(2), 380–400.
- Carpenter, S. K., Cepeda, N. J., Rohrer, D., Kang, S. H. K., & Pashler, H. (2012). Using spacing to enhance diverse forms of learning. _Educational Psychology Review_, 24, 369–378. https://pdf.retrievalpractice.org/spacing/Carpenter_etal_2012_EDPR.pdf
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. _Psychological Bulletin_, 132(3), 354–380.
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. _Psychological Science_, 19(11), 1095–1102. https://laplab.ucsd.edu/articles/Cepeda%20et%20al%202008_psychsci.pdf
- Fyfe, E. R., McNeil, N. M., Son, J. Y., & Goldstone, R. L. (2014). Concreteness fading in mathematics and science instruction: A systematic review. _Educational Psychology Review_, 26, 9–25. https://link.springer.com/article/10.1007/s10648-014-9249-3
- Fyfe, E. R., & Rittle-Johnson, B. (2016). The benefits of computer-generated feedback for mathematics problem solving. _Journal of Experimental Child Psychology_, 147, 140–151.
- Goldstone, R. L., & Son, J. Y. (2005). The transfer of scientific principles using concrete and idealized simulations. _Journal of the Learning Sciences_, 14(1), 69–110.
- Hwang, H., et al. (2025). Undesirable difficulty of interleaved practice. _Language Learning_. https://onlinelibrary.wiley.com/doi/10.1111/lang.12659
- Macnamara, B. N., & Burgoyne, A. P. (2022). Do growth mindset interventions impact students' academic achievement? _Psychological Bulletin_. https://pubmed.ncbi.nlm.nih.gov/36326645/
- Maloney, E. A., Ramirez, G., Gunderson, E. A., Levine, S. C., & Beilock, S. L. (2015). Intergenerational effects of parents' math anxiety on children's math achievement and anxiety. _Psychological Science_, 26(9), 1480–1488.
- Mayer, R. E. (2019). Computer games in education. _Annual Review of Psychology_, 70, 531–549.
- Ophuis-Cox, F. H. E., Catrysse, L., & Camp, G. (2023). The effect of retrieval practice on fluently retrieving multiplication facts in an authentic elementary school setting. _Applied Cognitive Psychology_. https://onlinelibrary.wiley.com/doi/10.1002/acp.4141
- Ramirez, G., Gunderson, E. A., Levine, S. C., & Beilock, S. L. (2013). Math anxiety, working memory, and math achievement in early elementary school. _Journal of Cognition and Development_, 14(2), 187–202.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. _Psychological Science_, 17(3), 249–255.
- Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning. _Instructional Science_, 35(6), 481–498. http://uweb.cas.usf.edu/~drohrer/pdfs/Rohrer&Taylor2007IS.pdf
- Rohrer, D., Dedrick, R. F., & Stershic, S. (2015). Interleaved practice improves mathematics learning. _Journal of Educational Psychology_, 107(3), 900–908. https://files.eric.ed.gov/fulltext/ED557355.pdf
- Siegler, R. S. (1996). _Emerging Minds: The Process of Change in Children's Thinking_. Oxford University Press.
- Siegler, R. S., & Ramani, G. B. (2009). Playing linear number board games improves low-income preschoolers' numerical understanding. _Journal of Educational Psychology_, 101(3), 545–560. https://www.cmu.edu/dietrich/psychology/cs/research-teaching/docs/SieglerBoardGamesCDPerp2009.pdf
- Sisk, V. F., Burgoyne, A. P., Sun, J., Butler, J. L., & Macnamara, B. N. (2018). To what extent and under which circumstances are growth mind-sets important to academic achievement? _Psychological Science_, 29(4), 549–571. https://journals.sagepub.com/doi/10.1177/0956797617739704
- Supekar, K., Iuculano, T., Chen, L., & Menon, V. (2015). Remediation of childhood math anxiety and associated neural circuits through cognitive tutoring. _Journal of Neuroscience_, 35(36), 12574–12583. https://pmc.ncbi.nlm.nih.gov/articles/PMC4563039/
- Taylor, K., & Rohrer, D. (2010). The effects of interleaved practice. _Applied Cognitive Psychology_, 24(6), 837–848.
- Wang, L. H., Chen, B., Hwang, G. J., Guan, J. Q., & Wang, Y. Q. (2023). Effectiveness of digital educational game and game design in STEM learning: a meta-analytic review. _International Journal of STEM Education_, 10, 36. https://stemeducationjournal.springeropen.com/articles/10.1186/s40594-023-00424-9
- Wilson, A. J., Dehaene, S., Pinel, P., Revkin, S. K., Cohen, L., & Cohen, D. (2006). Principles underlying the design of "The Number Race". _Behavioral and Brain Functions_, 2, 19. https://pmc.ncbi.nlm.nih.gov/articles/PMC1550244/
- Wilson, R. C., Shenhav, A., Straccia, M., & Cohen, J. D. (2019). The Eighty Five Percent Rule for optimal learning. _Nature Communications_, 10, 4646. https://www.nature.com/articles/s41467-019-12552-4
