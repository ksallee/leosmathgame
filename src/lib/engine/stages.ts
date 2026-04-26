import type {
	MasteryState,
	OpMastery,
	Operation,
	Band,
	PresentationStage,
	Question,
	AnswerEvent
} from './types';
import { clampBand } from './generators';

const CHOICES_EASY_EXPOSURES_TO_ADVANCE = 3;
const CHOICES_HARD_TO_NUMPAD_ACCURACY = 0.8;
const NUMPAD_TO_BAND_UP_ACCURACY = 0.8;
const STAGE_DEMOTE_ACCURACY = 0.4;

export function getStageFor(om: OpMastery): PresentationStage {
	return om.stage;
}

/** Stage for a specific question: read the op's current stage. Stages can
 *  switch mid-level when the op switches (e.g., numpad for + then
 *  choices_easy for a freshly-unlocked ×) — that's expected, not a bug. */
export function stageForQuestion(state: MasteryState, question: Question): PresentationStage {
	return state[question.operation].stage;
}

export interface OpStats {
	op: Operation;
	total: number;
	correct: number;
	avgMs: number;
	bands: Set<Band>;
}

export interface StageTransition {
	op: Operation;
	from: PresentationStage;
	to: PresentationStage;
	bandChanged?: { from: Band; to: Band };
}

function statsByOp(events: AnswerEvent[]): OpStats[] {
	const map = new Map<Operation, OpStats>();
	for (const ev of events) {
		let s = map.get(ev.operation);
		if (!s) {
			s = { op: ev.operation, total: 0, correct: 0, avgMs: 0, bands: new Set<Band>() };
			map.set(ev.operation, s);
		}
		s.total += 1;
		if (ev.correct) s.correct += 1;
		s.avgMs = (s.avgMs * (s.total - 1) + ev.timeMs) / s.total;
		s.bands.add(ev.band);
	}
	return Array.from(map.values());
}

/** Update per-op presentation stages and bands at the end of a level.
 *  Stage progression is sequential, single-band-at-a-time per op:
 *    choices_easy → choices_hard → numpad → (band+1, stage = choices_easy)
 *
 *  Rules:
 *  - choices_easy → choices_hard after CHOICES_EASY_EXPOSURES_TO_ADVANCE
 *    cumulative exposures. Don't gate on accuracy: 4-MCQ at ~75% guess
 *    baseline trains recognition, not retrieval.
 *  - choices_hard → numpad on ≥80% correct for that op in the level.
 *  - numpad → BAND PROMOTION on ≥80% correct: bump band, reset stage to
 *    choices_easy. (This is the only band-up path now — the old per-answer
 *    confidence promotion is gone.)
 *  - numpad → choices_hard on accuracy crash (<40%). The band-level
 *    confidence and mid-level burst guards still demote bands separately.
 *  - choices_hard → choices_easy: never (avoid yo-yo). */
export function evaluateLevelOutcome(
	state: MasteryState,
	events: AnswerEvent[]
): StageTransition[] {
	const transitions: StageTransition[] = [];
	for (const s of statsByOp(events)) {
		const om = state[s.op];
		const current = om.stage;
		const accuracy = s.correct / s.total;

		if (current === 'choices_easy') {
			om.stageProgress += s.total;
			if (om.stageProgress >= CHOICES_EASY_EXPOSURES_TO_ADVANCE) {
				om.stage = 'choices_hard';
				om.stageProgress = 0;
				transitions.push({ op: s.op, from: current, to: 'choices_hard' });
			}
		} else if (current === 'choices_hard') {
			if (accuracy >= CHOICES_HARD_TO_NUMPAD_ACCURACY) {
				om.stage = 'numpad';
				om.stageProgress = 0;
				transitions.push({ op: s.op, from: current, to: 'numpad' });
			}
		} else {
			if (accuracy >= NUMPAD_TO_BAND_UP_ACCURACY) {
				const fromBand = om.band;
				const toBand = clampBand(s.op, om.band + 1);
				if (toBand !== fromBand) {
					om.band = toBand;
					om.stage = 'choices_easy';
					om.stageProgress = 0;
					transitions.push({
						op: s.op,
						from: 'numpad',
						to: 'choices_easy',
						bandChanged: { from: fromBand, to: toBand }
					});
				}
			} else if (accuracy < STAGE_DEMOTE_ACCURACY) {
				om.stage = 'choices_hard';
				om.stageProgress = 0;
				transitions.push({ op: s.op, from: current, to: 'choices_hard' });
			}
		}
	}
	return transitions;
}
