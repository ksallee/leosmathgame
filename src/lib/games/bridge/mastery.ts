import type { MasteryState, Band } from '$lib/curriculum/types';
import { BRIDGE_BANDS } from './index';

const BR_ADVANCE_ACCURACY = 0.8;
const BR_DEMOTE_ACCURACY = 0.4;

const MIN_BAND = 1;
const MAX_BAND = BRIDGE_BANDS.length;

/** Read the kid's current bridge band. Lazy default to band 1. */
export function bridgeBandFor(state: MasteryState): Band {
	return state.bridge?.band ?? MIN_BAND;
}

/** Apply level-end outcome to bridge mastery. Same rule as numberline:
 *  ≥80% advance, <40% demote, in-between stay. Mutates state. */
export function applyBridgeLevelOutcome(
	state: MasteryState,
	correct: number,
	total: number
): { fromBand: Band; toBand: Band; bandChanged: boolean } {
	const fromBand = bridgeBandFor(state);
	if (total === 0) return { fromBand, toBand: fromBand, bandChanged: false };
	const accuracy = correct / total;
	let toBand = fromBand;
	if (accuracy >= BR_ADVANCE_ACCURACY) {
		toBand = Math.min(MAX_BAND, fromBand + 1);
	} else if (accuracy < BR_DEMOTE_ACCURACY) {
		toBand = Math.max(MIN_BAND, fromBand - 1);
	}
	if (!state.bridge) state.bridge = { band: toBand };
	else state.bridge.band = toBand;
	return { fromBand, toBand, bandChanged: toBand !== fromBand };
}
