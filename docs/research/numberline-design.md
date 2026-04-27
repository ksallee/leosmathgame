# Number-line jump — design brief

## Context

A complementary mini-game to the main fact-retrieval loop: a hero hops along a horizontal number line to a tapped tick, used to teach addition and subtraction visually for one 7-year-old. Two questions: how the line should widen and sparsify with progression, and how to behave when the kid taps the wrong tick.

---

## 1. Range progression + label density

**What the research says.** A 7-year-old in mid-second grade sits in the empirical sweet spot for 0–20 and 0–100 work and is on the wrong side of the curve for 0–1000. Friso-van den Bos et al. (2014) tested 0–20 in British Years 1–3: linearity dominated by Year 2 (mean age 7.3, 75% best-fit linear). Siegler & Booth (2004) locate the log-to-linear shift on 0–100 between K and Grade 2 and the same shift on 0–1000 between Grades 2 and 4 — so 0–1000 is premature and would teach magnitude compression rather than fluency. The critical mediator is _strategy_: 6yo use only the origin, 7yo start using both endpoints, and a true internal midpoint emerges around late Year 2 — which gates how usefully a child can read sparsified ticks.

The label-density question has a sharp empirical answer that contradicts intuition. Peeters, Verschaffel & Luwel (2017) ran the exact contrast the candidate ladder assumes — empty line vs unlabeled quartile ticks vs labeled quartile ticks, on 0–1000. **Unlabeled benchmarks hurt third graders (~8yo)** (error 8% unlabeled vs 3% labeled vs 9% control); sixth graders benefited but third graders could not link a bare tick to its implied numerical value. The implication is unambiguous: every tick a 7yo needs to _use_ must carry its number until they have a fluent internal midpoint. Sparsifying labels does not "force magnitude estimation" at this age — it removes the handhold and demotes the child back to a logarithmic guess.

**Strongest evidence.** Peeters, Degrande, Ebersbach, Verschaffel & Luwel (2017), _Frontiers in Psychology_, 8:1082 — quartile-labeling experiment, decisive on label density at age 8. Friso-van den Bos, Kolkman, Kroesbergen & Leseman (2014), _Educational Studies in Mathematics_ — 0–20 linearity by Year 2.

**Recommended band ladder.** Eight bands:

- **B1: 0–10, every tick labeled.** Warmup; first-grade evidence shows linear fit dominates by ~64% on 0–10 by end of Year 1.
- **B2: 0–20, every tick labeled.** The Friso-van den Bos sweet spot; spend real time here.
- **B3: 0–20, every tick, target numbers biased to 11–14.** Same line, harder questions — sampler forces midpoint use without visual change. Booth & Siegler (2008) showed seeing magnitudes on a number line produced direct addition-fact gains; exploit that here.
- **B4: 0–30, every tick labeled.** First widening. Jumping straight to 0–50 sparsified is what Peeters warns against; keep all integers labeled.
- **B5: 0–50, label every 5, unlabeled minor ticks for 1–4.** First sparsification. Labeled ticks at multiples of 5 (a number the kid already chunks); minor ticks remain _visible_ as countable steps from an anchor, so a tap on 23 is "three past the 20" rather than abstract estimation.
- **B6: 0–100, label every 10, minor ticks every 1.** Second-grade linear-on-0–100 norm. Decade-anchors are familiar from school; minor ticks stay visible.
- **B7: 0–100, label every 10, minor ticks every 5.** Genuine sparsification: the child must interpolate between 5- and 10-ticks. Per Peeters, at the edge of 7–8yo capability; gate behind rolling-20 ≥ 90% on B6.
- **B8: 0–100, label every 10, no minor ticks.** First band that tests magnitude estimation rather than tick-counting. Stretch ceiling, not a routine target for a 7yo.

No 0–1000 band in v1. The evidence says it would teach the wrong representation.

**Where to push back on the candidate ladder.** Three changes:

1. **Drop candidate B3 (0–15).** No literature draws a meaningful threshold at 15; the standard teen-numbers range is 0–20. Collapse into B2/B4.
2. **Insert a "same line, harder targets" band before widening.** The candidate widens every band, but the strongest cognitive jump for a 7yo on number lines is _learning to use the midpoint within a familiar range_, not seeing a new range. The proposed B3 (0–20, targets 11–14) supplies that without visual change.
3. **Candidate B5 "0–30, every 5" is the single biggest mistake.** It sparsifies one band too early — Peeters' result is that unlabeled marks _hurt_ 8yo until the child can map position→number unaided. Keep all ticks labeled at 0–30; sparsify only when range hits 50+. Equivalently: tie sparsification to _labeled-tick count_, not range. >20 labeled ticks forces sparsification, but sparsification must preserve minor ticks as countable units, never blank them.

---

## 2. Wrong-answer feedback

**What the research says.** Three converging lines point the same way. First, Booth & Siegler (2008) showed that _placing the correct sum at its magnitude position on a 0–100 line_ produced direct first-grader gains on trained addition facts after only three 15-minute sessions — seeing where the right answer lives in space is the learning event itself. Second, computer-tutor work with 6–8yos finds **knowledge-of-correct-response feedback outperforms knowledge-of-results feedback**, and that verification cues (red-X / green-check overlays) layered on top of correct-answer feedback actively _reduced_ persistence and strategy variety in low-knowledge children (Cobb-Moore et al., 2024; Fyfe & Rittle-Johnson, 2016). Third, the Number Race RCTs (Wilson, Dehaene et al., 2006) built corrective feedback as visible movement of a token to the correct magnitude position, not as text. Embodied-cognition work (Gilligan-Lee et al., 2023) suggests _seeing the correct trajectory_ aids spatial-numerical mapping more than seeing the correct endpoint alone — weaker evidence but consistent.

**Strongest evidence.** Booth & Siegler (2008), _Child Development_, 79(4), 1016–1031 — direct evidence that visualised correct-answer position on a number line produces arithmetic learning gains in 7-year-olds. Cobb-Moore, Fyfe, Borriello & Mielicki (2024), _Journal of Experimental Child Psychology_ — verification cues hurt persistence at age 7–8.

**Recommended behavior.** **Option (c), with a calibrated animation.** When the kid taps a wrong tick:

1. Hero pauses on the wrong tick ~400 ms with a neutral _miss_ tone (no sad sound, no red flash; per existing brief §5).
2. Hero hops _along the line_ to the correct tick over ~600 ms, decelerating into the landing.
3. Correct tick stays highlighted ~800 ms with the answer numeral above it, then advances.

Total ~1.8 s. The animation _is_ the feedback channel — no "Wrong" overlay, no verification cue (Cobb-Moore et al. show those degrade learning). Option (a) wastes the magnitude-mapping opportunity Booth & Siegler quantified. Option (b) — hop back to start, then reveal — duplicates trajectory information without adding signal and burns ~1 s of attention budget.

**Specific UX choice: hop-back-first or direct hop?** **Direct hop, from wrong tick to correct tick.** Three reasons:

1. The trajectory the kid needs to internalise is _answer-position-relative-to-question_, not _relative-to-start_. A direct hop shows the signed error vector — "you were three too far right" — the exact cognitive object that needs updating. Hopping back to 0 then forward replays the question, not the correction.
2. Hop-back-first adds 500–800 ms of motion before the corrective signal lands. At one question per ~5 s, a 1 s feedback overhead is 20% of session time on redundant animation — the extraneous-cognitive-load case Mayer's coherence principle is built on.
3. "Show me where I was wrong THEN where right is" is adult intuition, not child cognition. The kid already knows where they tapped (their finger is still on the screen). The missing information is the correct position; the shortest visual path to it is the best feedback.

One refinement: the _direction_ of the corrective hop carries the signed error. Undershoot → hop right; overshoot → hop left. Don't always animate left-to-right; that converts a corrective signal into a directional habit.

---

## Synthesis: the design rules

1. **Eight bands, none above 0–100, all preserving labeled major ticks.** The 0–1000 range is two grade-levels too early; defer to a sequel build. Sparsification happens _between_ labeled ticks (minor ticks, then bare interpolation), never _of_ labeled ticks below 5-multiples.
2. **Hold the range constant for at least one mastery cycle when the cognitive jump is target difficulty rather than range.** B3 (0–20 with mid-line targets) demonstrates the principle: same line, harder questions. Apply it again at every range widening — first questions on a new line stay near familiar anchor positions, then drift toward the centre.
3. **Wrong-answer behaviour is a direct hop from tapped tick to correct tick** — option (c), no hop-back-to-start, no red-X overlay, no sad sound. The animation is the feedback channel. Total dwell ~1.8 s.
4. **No verification cues stacked on top of correct-answer feedback.** Cobb-Moore et al. show this combination reduces persistence in 7–8yos. Show the correct position; don't also flash a check/cross.
5. **Promotion to a sparsified band (B7, B8) requires stricter mastery (rolling-20 ≥ 90%) than promotion within a same-density band (≥ 80%).** Sparsification crosses a developmental threshold the candidate ladder treats as gradient; the engine should treat it as a gate.

---

## Sources

- Booth, J. L., & Siegler, R. S. (2008). Numerical magnitude representations influence arithmetic learning. _Child Development_, 79(4), 1016–1031. https://onlinelibrary.wiley.com/doi/10.1111/j.1467-8624.2008.01173.x
- Cobb-Moore, B., Fyfe, E. R., Borriello, G. A., & Mielicki, M. K. (2024). Right or wrong? How feedback content and source influence children's mathematics performance and persistence. _Journal of Experimental Child Psychology_, 240, 105844. https://pmc.ncbi.nlm.nih.gov/articles/PMC10923023/
- Friso-van den Bos, I., Kroesbergen, E. H., Van Luit, J. E. H., Xenidou-Dervou, I., Jonkman, L. M., Van der Schoot, M., & Van Lieshout, E. C. D. M. (2015). Longitudinal development of number line estimation and mathematics performance in primary school children. _Journal of Experimental Child Psychology_, 134, 12–29.
- Friso-van den Bos, I., Kolkman, M. E., Kroesbergen, E. H., & Leseman, P. P. M. (2014). Explaining variability: Numerical representations in 4- to 8-year-old children. _Journal of Cognition and Development_. https://pmc.ncbi.nlm.nih.gov/articles/PMC3344704/ (Year 1–3 0–20 number-line estimation, log-to-linear transition)
- Fyfe, E. R., & Rittle-Johnson, B. (2016). The benefits of computer-generated feedback for mathematics problem solving. _Journal of Experimental Child Psychology_, 147, 140–151. https://files.eric.ed.gov/fulltext/ED566264.pdf
- Gilligan-Lee, K. A., Hawes, Z. C. K., & Mix, K. S. (2023). Hands-on: Investigating the role of physical manipulatives in spatial training. _Child Development_, 94(5), 1382–1399. https://srcd.onlinelibrary.wiley.com/doi/10.1111/cdev.13963
- Peeters, D., Degrande, T., Ebersbach, M., Verschaffel, L., & Luwel, K. (2016). Children's use of number line estimation strategies. _European Journal of Psychology of Education_, 31, 117–134.
- Peeters, D., Verschaffel, L., & Luwel, K. (2017). Evaluating the effect of labeled benchmarks on children's number line estimation performance and strategy use. _Frontiers in Psychology_, 8, 1082. https://pmc.ncbi.nlm.nih.gov/articles/PMC5491597/
- Siegler, R. S., & Booth, J. L. (2004). Development of numerical estimation in young children. _Child Development_, 75(2), 428–444. https://www.cs.cmu.edu/~jlbooth/sieglerbooth-cd04.pdf
- Siegler, R. S., & Opfer, J. E. (2003). The development of numerical estimation: Evidence for multiple representations of numerical quantity. _Psychological Science_, 14(3), 237–243. https://siegler.tc.columbia.edu/wp-content/uploads/2019/02/opfersieg07.pdf
- Siegler, R. S., & Thompson, C. A. (2014). Numerical landmarks are useful — except when they're not. _Journal of Experimental Child Psychology_, 120, 39–58. https://siegler.tc.columbia.edu/wp-content/uploads/2019/02/2014-Siegler-Thompson-fac.pdf
- Wilson, A. J., Dehaene, S., Pinel, P., Revkin, S. K., Cohen, L., & Cohen, D. (2006). Principles underlying the design of "The Number Race", an adaptive computer game for remediation of dyscalculia. _Behavioral and Brain Functions_, 2, 19. https://pmc.ncbi.nlm.nih.gov/articles/PMC1550244/
