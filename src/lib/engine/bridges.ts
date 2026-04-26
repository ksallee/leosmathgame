import type { Operation, Band } from './types';

export interface BridgeTarget {
	op: Operation;
	operands: number[];
	answer: number;
	band: Band;
}

/** Compute derived-fact bridges from a fluent fact (R11 — Siegler's
 *  "scaffold the invention of derived strategies"). v1 ships only the
 *  commutative swap (3+5 fluent → queue 5+3) since it's universally
 *  applicable and unambiguously same-band. Doubles → near-doubles, ×5 → ×4/×6,
 *  ×n → ×(n+1), and other rule-based bridges are deferred until per-fact
 *  retrieval data validates that this scheduling actually moves the needle. */
export function bridgesFor(
	op: Operation,
	operands: number[],
	answer: number,
	band: Band
): BridgeTarget[] {
	if (operands.length !== 2) return [];
	if (op !== 'add' && op !== 'mul') return [];
	const [a, b] = operands;
	if (a === b) return [];
	return [{ op, operands: [b, a], answer, band }];
}

export function bridgeKey(b: BridgeTarget, symbol: string): string {
	return `${b.op}:b${b.band}:${b.operands.join(symbol)}`;
}
