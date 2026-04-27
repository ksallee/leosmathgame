import type { MasteryState, Operation, Band } from '$lib/curriculum/types';
import { NUMBER_LINE_BANDS } from './index';

const NL_ADVANCE_ACCURACY = 0.8;
const NL_DEMOTE_ACCURACY = 0.4;

const MIN_BAND = 1;
const MAX_BAND = NUMBER_LINE_BANDS.length;

/** Read the kid's current NL band for the given operation. Lazy default
 *  to band 1 (range 0-5, every tick labeled). */
export function nlBandFor(state: MasteryState, op: Operation): Band {
	return state.numberline.band[op] ?? MIN_BAND;
}

/** Apply level-end NL outcome to the mastery state. Same rule as facts'
 *  numpad consolidation: ≥80% advance band, <40% demote, in-between stay.
 *  Mutates state. Returns the new band. */
export function applyNlLevelOutcome(
	state: MasteryState,
	op: Operation,
	correct: number,
	total: number
): { fromBand: Band; toBand: Band; bandChanged: boolean } {
	const fromBand = nlBandFor(state, op);
	if (total === 0) return { fromBand, toBand: fromBand, bandChanged: false };
	const accuracy = correct / total;
	let toBand = fromBand;
	if (accuracy >= NL_ADVANCE_ACCURACY) {
		toBand = Math.min(MAX_BAND, fromBand + 1);
	} else if (accuracy < NL_DEMOTE_ACCURACY) {
		toBand = Math.max(MIN_BAND, fromBand - 1);
	}
	state.numberline.band[op] = toBand;
	return { fromBand, toBand, bandChanged: toBand !== fromBand };
}
