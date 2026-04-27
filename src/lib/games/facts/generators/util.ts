import type { Operation, Band, Question, SeededRng } from '$lib/curriculum/types';

export function makeQuestion(
	operation: Operation,
	band: Band,
	operands: number[],
	answer: number,
	symbol: '+' | '−' | '×' | '÷'
): Question {
	const template = `${operation}:b${band}`;
	const id = `${operation}:b${band}:${operands.join(symbol)}`;
	const prompt = operands.join(` ${symbol} `);
	return { id, template, operation, band, prompt, operands, answer };
}

export type Gen = (rng: SeededRng) => Question;

export interface OpGenerators {
	maxBand: Band;
	bands: Record<Band, Gen | null>;
}
