# Rotation strategy — research brief

## Context

`maths_game_7` is a single-player offline math game for one 7-year-old (Léo). The current build has one mini-game type (arithmetic-fact retrieval) driven by a per-fact mastery + Leitner sampler (see `arithmetic-learning.md`). We are about to add 2–3 more mini-game types — number-line jump, coin/make-change, equation-balance see-saw — and need to choose how levels rotate between them. Three candidates: **strict cycle** (deterministic order), **weighted random** (fixed distribution per draw), **adaptive** (weakness-driven router using per-game accuracy / Leitner due / band signals). This brief is opinionated: one pick with reasoning.

---

## 1. Variability-of-practice scheduling (Schmidt; Shea & Morgan; Wulf & Lee)

**What the research says.** Shea & Morgan (1979) is the founding result: random schedules hurt acquisition but improve retention/transfer relative to blocked, on motor tasks in _adults_. Wulf & Lee (1993) refined it: contextual-interference (CI) effects appear when tasks recruit _different_ generalised motor programs, not just different parameters. Reviews now distinguish blocked, serial (ABCABC), random; serial counts as high-CI. Recent meta-analyses converge on a medium pooled transfer effect favouring random over blocked in adults (SMD ≈ 0.55), often null at acquisition. **Critically, in children the CI advantage shrinks or disappears.** Brady's 2019 systematic review (25 studies, children) reports "mainly no or conflicting evidence"; aggregate child effect ~ d ≈ 0.10. Several 7–8yo studies _favoured blocked_ on retention. Mechanism: CI depends on cognitive comparison machinery that is still developing under age 9.

**Strongest evidence.** Shea & Morgan (1979); Brady (2019, systematic review of CI in children).

**Mapping.** Weakens "true random" cross-game order; mildly favours strict cycle/serial. Adaptive is orthogonal to this thread.

---

## 2. Interleaving across formats (Rohrer)

**What the research says.** Rohrer & Taylor (2007) and Rohrer, Dedrick & Stershic (2015) show big interleaving wins (d ≈ 1.0) — but _within a single format_, on different problem types presented as the same kind of item. Rohrer, Dedrick & Burgess (2014) extended this to _visually dissimilar_ problems but still within math worksheets. The corpus does _not_ test interleaving across **representational formats** (bare-numeric vs visual number-line vs word-style coin counting). Concreteness-fading (Fyfe et al. 2014) is closest, but it argues for sequenced _progression_ at concept introduction, not rotation during fluency drilling. Mechanism for interleaving — discriminative contrast — requires the learner to discriminate which strategy applies; that doesn't apply when the format itself signals which mini-game you're in.

**Strongest evidence.** Rohrer, Dedrick & Burgess (2014), _Psychon Bull Rev_; Rohrer, Dedrick & Stershic (2015), _J Educ Psychol_.

**Mapping.** The format-rotation question is essentially outside the interleaving evidence base. Mildly favours strict cycle; silent on adaptive.

---

## 3. Adaptive learning systems for early math — production reality

**What the research says.** Production "adaptive" systems do very different things under the hood. **DreamBox** is closest to true per-skill routing. **ALEKS** uses knowledge-space theory (designed for older learners). **ST Math, Khan Academy Kids, Prodigy, Mathletics** are mostly _fixed curricular sequences with adaptive difficulty within a topic_ — closer to a strict cycle of topics with a difficulty knob inside each. Independent evidence is consistently weaker than vendor claims:

- **DreamBox**: WWC Tier 3 (lowest qualifying tier), "potentially positive," K-1 only; one study, g ≈ 0.32 (numeracy) and 0.14 (geometry) in high-poverty CA students.
- **ST Math**: ESSA "moderate evidence" for grades 3–5 — not the K-2 fluency band.
- **ALEKS meta-analysis** (Fang et al. 2021, 33 studies): pooled positive effect, K-5 subset thin and confounded with implementation fidelity.
- A 2023 conceptual replication of supplemental computer-assisted math instruction in elementary school found small effects that did not reliably replicate.
- A 2026 meta-analysis (Wang et al., JCAL) of K-12 adaptive learning reports d ≈ 0.34 — **but the effect largely shrinks when the comparison is "equally engaging fixed practice" rather than "no practice."** In one direct test, _teacher-assigned_ tasks beat _machine-assigned_ tasks among 4th–5th graders (d = 0.13).

**Strongest evidence.** WWC DreamBox snapshot (IES, intervention #627); Wang et al. (2026), _J Computer Assisted Learning_.

**Mapping.** The independent literature does **not** support a strong claim that _cross-game-type_ adaptive routing beats a sensible fixed schedule for 6–9yo arithmetic. Where adaptive wins, it's almost always _within_ a topic (which the existing engine already does via per-band sampling + Leitner). Weakly favours strict cycle / weighted random over adaptive at the cross-game-type level.

---

## 4. Predictability and agency for young children (SDT; Skinner; Reeve)

**What the research says.** SDT (Deci & Ryan; Ryan & Deci 2020) names autonomy, competence, relatedness as basic needs; recent work argues for novelty as a fourth (González-Cutre et al. 2020). **Structure** (clear expectations, predictable contingencies) and **autonomy support** are _complementary_, not opposed (Jang, Reeve & Deci 2010; Skinner & Belmont 1993). For children, structure consistently predicts _behavioural_ engagement — staying on task, lower disaffection — while autonomy support drives _agentic_ engagement. Predictability is not the enemy of motivation; opacity and chaos are. Novelty operates _on top of_ a predictable frame, not as a substitute.

**Strongest evidence.** Skinner & Belmont (1993), _J Educ Psychol_; Jang, Reeve & Deci (2010), _J Educ Psychol_.

**Mapping.** Léo benefits from being able to predict the shape of the next 5 minutes — "after typing, the see-saw" — even if the _content_ in each level is novel. Strict cycle wins this thread cleanly. Weighted random sacrifices predictability for no documented gain. Adaptive is worst here: opaque routing logic ("why see-saw four times in a row? because I'm bad at it") is a narrative kids detect and resent.

---

## 5. Desirable difficulty / 85% rule × rotation

**What the research says.** Bjork & Bjork (2020) and Wilson et al.'s 85% rule (2019) say optimal learning sits at moderate difficulty with moderate error rates. Variability-of-practice manipulations _add_ difficulty — desirable in the zone, undesirable when struggling. The novice-interleaving caveat (Foster et al. 2022; Hwang et al. 2025; flagged in `arithmetic-learning.md` §3) generalises: when a kid is at the floor of competence on a new mini-game, mixing it aggressively compounds load.

**Strongest evidence.** Bjork & Bjork (2020), _J Appl Res Mem Cogn_; Wilson et al. (2019), _Nature Communications_.

**Mapping.** This is the strongest thread _for_ adaptive — but only at the granularity already implemented (within-game band tuning). It does not argue that whether to show coins vs balance should depend on weakness. Neutral on cross-game rotation; strongly favours preserving existing within-game adaptive mastery.

---

## 6. Cognitive load of context switching (Monsell; child task-switching)

**What the research says.** Adult task-switching has measurable RT/error costs (Monsell 2003). Children's switch costs are _larger_ than adults' and decline through childhood (Cragg & Chevalier 2012; Crone et al. 2006), with substantial reductions between ages 7–10. Per-trial costs are millisecond-scale and don't aggregate to a learning deficit when switches are infrequent. The bigger practical risk for a 7yo is _re-orientation friction_: every new mini-game type re-loads "what am I supposed to do here" in working memory.

**Strongest evidence.** Monsell (2003), _Trends in Cog Sci_; Cragg & Chevalier (2012), _QJEP_.

**Mapping.** Switching _between sessions_ is essentially free. Switching _between levels_ is cheap if predictable, more expensive if unpredictable. Switching _within a level_ is bad and we should never do it. Favours strict cycle (predictable, spaced) > adaptive (unpredictable, possibly clustered) > weighted random (random clustering).

---

## What production systems do

| System                                | Cross-topic rotation             | Within-topic adaptivity         | Independent evidence quality               |
| ------------------------------------- | -------------------------------- | ------------------------------- | ------------------------------------------ |
| DreamBox                              | Mostly fixed sequence            | Genuine per-skill routing       | WWC Tier 3, K-1, g ≈ 0.11–0.32 (one study) |
| ALEKS                                 | Adaptive (knowledge space)       | Adaptive                        | Fang 2021 meta; K-5 subset thin            |
| ST Math                               | Fixed visual sequence            | Difficulty progression          | ESSA "moderate" for 3–5; not K-2           |
| Khan Academy Kids                     | Fixed thematic units             | Light adaptation                | Vendor-described; minimal RCT              |
| Prodigy                               | Fixed grade-aligned curriculum   | Difficulty within topic         | Vendor whitepapers only                    |
| Mathletics                            | Fixed topic sequence             | Difficulty within topic         | No strong independent K-2 RCT              |
| The Number Race (Wilson/Dehaene 2006) | **Fixed rotation of mini-games** | Adaptive difficulty within each | Peer-reviewed RCTs; medium magnitude gains |

**Honest read.** The system whose architecture is closest to ours — The Number Race — uses a **fixed rotation of mini-games** with adaptive difficulty _inside_ each, and it is the most rigorously evaluated math intervention in this age band. No production system has independent evidence that _cross-game-type adaptive routing_ beats a fixed cycle for 6–9yo arithmetic. Vendor "adaptive" marketing almost always refers to within-topic difficulty, which we already do.

---

## Recommendation

**Ship a strict cycle.** A fixed deterministic order such as `facts, number-line, facts, coins, facts, balance, facts, number-line, ...` — facts every other level (densest skill, most Leitner-due-driven), the other three rotating ABCABC. The "boss every 5 levels" pattern (e.g., balance see-saw on every 5th) is fully compatible and gives the kid a predictable landmark.

Three reasons, in order of strength:

1. **Independent evidence for cross-game-type adaptive routing is essentially absent for this age and skill.** The strongest meta-analytic effects shrink to near-zero when the control is "equally engaging fixed practice." DreamBox's strongest WWC-rated effect is g ≈ 0.32 in one K-1 study with high-poverty learners — not a finding that generalises to a single 7yo at home. A router buys an effect the literature has not demonstrated, at 3–5 engineering days you could spend on within-game adaptivity that _is_ well-evidenced.
2. **Predictability is a feature for a 7yo, not a bug.** SDT structure research and child task-switching research both say: predictable structure with novelty _inside_ each unit beats unpredictable structure. Léo can anticipate the see-saw, get a small boost from that, and the see-saw itself is novel within the level.
3. **The contextual-interference literature in children is weak and trends _against_ high-randomness schedules.** Adult CI (d > 0.5) shrinks to d ≈ 0.10 in children, with several 7yo studies favouring blocked/serial on retention. Combined with the format-rotation point — these aren't "different problem types of the same skill," so Rohrer's discriminative-contrast mechanism doesn't apply — the case for _any_ randomisation across mini-game types is weak.

Architectural rule: **adaptive _inside_ a mini-game, deterministic _across_ mini-games.** Keep all within-game adaptivity already specified (per-fact tracking, time-anchored Leitner, ~80% rolling-accuracy promote/demote, blocked intro for new bands).

---

## What would change the recommendation

Three signals from a few weeks of Léo's play that should push toward weighted random or adaptive:

1. **Boredom-driven disengagement on a predictable schedule.** If Léo skips or rage-quits on level boundaries because he can predict the next mini-game and dislikes one, predictability is a liability. Symptom: session length collapses on levels he can predict will be coins. _Response_: shift to weighted random with strong (~60%) facts weight and 13/13/14% on the others, keeping the floor that facts always come at least every other level.
2. **One mini-game becomes a sustained weakness pocket.** If Léo's per-game-type accuracy on (say) coins stalls below 60% rolling-50 while others are 80%+, fixed cycle gives him too few coin reps to dig out. _Response_: targeted boost (not a full router) — promote one of every two non-facts levels to the weak game until the pocket closes. ~30 lines.
3. **Cross-format transfer evidence in our own data.** If exposure to number-line correlates measurably with later facts-band promotion in our latency data, formats are interacting in a learning-positive way and the variability case strengthens. _Response_: increase variety frequency, possibly via weighted random; still not full per-game-weakness adaptive routing.

What would _not_ change it: vendor whitepapers, anecdotal "personalised learning works," generic adaptive-learning meta-analyses lumping K-12 + higher ed together. Bar is independent K-2 evidence with comparable controls.

---

## Sources

- Bjork, R. A., & Bjork, E. L. (2020). Desirable difficulties in theory and practice. _Journal of Applied Research in Memory and Cognition_, 9(4), 475–479.
- Brady, F. (2019). The role of practice order: A systematic review about contextual interference in children. https://pmc.ncbi.nlm.nih.gov/articles/PMC6342307/
- Cragg, L., & Chevalier, N. (2012). The processes underlying flexibility in childhood. _Quarterly Journal of Experimental Psychology_, 65(2), 209–232.
- Crone, E. A., Bunge, S. A., van der Molen, M. W., & Ridderinkhof, K. R. (2006). Switching between tasks and responses: A developmental study. _Developmental Science_, 9(3), 278–287.
- Fang, Y., Ren, Z., Hu, X., & Graesser, A. C. (2021). The effects of ALEKS on mathematics learning in K-12 and higher education: A meta-analysis. _Investigations in Mathematics Learning_, 13(3), 207–224. https://www.tandfonline.com/doi/full/10.1080/19477503.2021.1926194
- Foster, N. L., Mueller, M. L., Was, C., Rawson, K. A., & Dunlosky, J. (2022). Why does interleaving improve math learning? _Memory & Cognition_, 47, 1088–1101.
- Fyfe, E. R., McNeil, N. M., Son, J. Y., & Goldstone, R. L. (2014). Concreteness fading in mathematics and science instruction. _Educational Psychology Review_, 26, 9–25.
- González-Cutre, D., et al. (2020). Testing the need for novelty as a candidate need in basic psychological needs theory. _Motivation and Emotion_, 44, 295–314. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.01535/full
- Hwang, H., et al. (2025). Undesirable difficulty of interleaved practice. _Language Learning_. https://onlinelibrary.wiley.com/doi/10.1111/lang.12659
- Institute of Education Sciences. (n.d.). _DreamBox Learning intervention report_. What Works Clearinghouse. https://ies.ed.gov/ncee/wwc/EvidenceSnapshot/627
- Jang, H., Reeve, J., & Deci, E. L. (2010). Engaging students in learning activities: It is not autonomy support or structure but autonomy support and structure. _Journal of Educational Psychology_, 102(3), 588–600.
- Lenard, M., & Rhea, A. (2022). Adaptive math and student achievement: Evidence from a randomized controlled trial of DreamBox Learning. https://www.semanticscholar.org/paper/ae0f69d3032ff5325e289af1fdd5b82faf466f29
- Monsell, S. (2003). Task switching. _Trends in Cognitive Sciences_, 7(3), 134–140.
- Rohrer, D., Dedrick, R. F., & Burgess, K. (2014). The benefit of interleaved mathematics practice is not limited to superficially similar kinds of problems. _Psychonomic Bulletin & Review_, 21, 1323–1330. https://gwern.net/doc/psychology/spaced-repetition/2014-rohrer.pdf
- Rohrer, D., Dedrick, R. F., & Stershic, S. (2015). Interleaved practice improves mathematics learning. _Journal of Educational Psychology_, 107(3), 900–908. https://files.eric.ed.gov/fulltext/ED557355.pdf
- Ryan, R. M., & Deci, E. L. (2020). Intrinsic and extrinsic motivation from a self-determination theory perspective. _Contemporary Educational Psychology_, 61, 101860. https://selfdeterminationtheory.org/wp-content/uploads/2020/04/2020_RyanDeci_CEP_PrePrint.pdf
- Shea, J. B., & Morgan, R. L. (1979). Contextual interference effects on the acquisition, retention, and transfer of a motor skill. _Journal of Experimental Psychology: Human Learning and Memory_, 5, 179–187. https://gwern.net/doc/psychology/spaced-repetition/1979-shea.pdf
- Skinner, E. A., & Belmont, M. J. (1993). Motivation in the classroom: Reciprocal effects of teacher behavior and student engagement across the school year. _Journal of Educational Psychology_, 85, 571–581.
- SRI Education. (2021). _ST Math: Nonregulatory ESSA standards evidence review_. https://www.sri.com/publication/education-learning-pubs/stem-and-computer-science-pubs/st-math-nonregulatory-essa-standards-evidence-review-what-works-clearinghouse-standards-review/
- Wang, H., et al. (2026). A meta-analysis of moderators of the effects of technology-enhanced adaptive learning on primary and secondary students' learning outcomes. _Journal of Computer Assisted Learning_. https://onlinelibrary.wiley.com/doi/10.1002/jcal.70168
- Wilson, A. J., Dehaene, S., Pinel, P., Revkin, S. K., Cohen, L., & Cohen, D. (2006). Principles underlying the design of "The Number Race". _Behavioral and Brain Functions_, 2, 19. https://pmc.ncbi.nlm.nih.gov/articles/PMC1550244/
- Wilson, R. C., Shenhav, A., Straccia, M., & Cohen, J. D. (2019). The eighty five percent rule for optimal learning. _Nature Communications_, 10, 4646.
- Wulf, G., & Lee, T. D. (1993). Contextual interference in movements of the same class: Differential effects on program and parameter learning. _Journal of Motor Behavior_, 25(4), 254–263.
