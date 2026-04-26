import { describe, it, expect } from 'vitest';
import { createSession, currentQuestion, tick, answer, summarize } from './session';
import { WIN_CORRECT, MONSTER_REACHED_POS, PUSH_BACK_PER_CORRECT } from './config';
import type { Question } from '$lib/engine';

function fakeQuestion(answer: number, idx = 0): Question {
	return {
		id: `add:b1:test-${idx}`,
		template: 'add:b1',
		operation: 'add',
		band: 1,
		prompt: '1 + 1',
		operands: [1, 1],
		answer
	};
}

function makeProvider(answer = 2) {
	let i = 0;
	return () => fakeQuestion(answer, i++);
}

describe('session basics', () => {
	it('starts in_progress with the first question pulled from provider', () => {
		const s = createSession(makeProvider(), 1, {}, 0);
		expect(s.outcome).toBe('in_progress');
		expect(currentQuestion(s)?.answer).toBe(2);
		expect(s.monsterPos).toBe(0);
	});

	it('correct answer pushes monster back, increments correct, pulls next', () => {
		const s = createSession(makeProvider(), 1, {}, 0);
		s.monsterPos = 0.5;
		const before = s.currentQuestion;
		const ev = answer(s, 2, 1000);
		expect(ev?.correct).toBe(true);
		expect(s.monsterPos).toBeCloseTo(0.5 - PUSH_BACK_PER_CORRECT);
		expect(s.correct).toBe(1);
		expect(s.currentQuestion).not.toBe(before);
	});

	it('wrong answer adds penalty, does not increment correct, pulls next question', () => {
		const s = createSession(makeProvider(), 1, {}, 0);
		s.monsterPos = 0.3;
		const before = s.currentQuestion;
		answer(s, 99, 1000);
		expect(s.monsterPos).toBeGreaterThan(0.3);
		expect(s.correct).toBe(0);
		expect(s.wrong).toBe(1);
		expect(s.currentQuestion).not.toBe(before);
		expect(s.lastFeedback).toBe('wrong');
	});

	it('many wrong answers in a row keep producing new questions until lose', () => {
		const s = createSession(makeProvider(), 1, {}, 0);
		let safety = 0;
		while (s.outcome === 'in_progress' && safety++ < 100) {
			answer(s, 999, safety * 1000);
		}
		expect(s.outcome).toBe('lost');
		expect(s.wrong).toBeGreaterThan(0);
		expect(s.correct).toBe(0);
	});

	it('win after WIN_CORRECT correct answers regardless of how many wrongs in between', () => {
		const s = createSession(makeProvider(), 1, {}, 0);
		let i = 0;
		while (s.outcome === 'in_progress') {
			i++;
			const userValue = i % 3 === 0 ? 999 : 2;
			answer(s, userValue, i * 1000);
			if (s.correct >= WIN_CORRECT) break;
		}
		expect(s.outcome).toBe('won');
		expect(s.correct).toBe(WIN_CORRECT);
	});

	it('lose when accumulated wrongs push monster to position 1', () => {
		const s = createSession(makeProvider(), 1, {}, 0);
		// 5 wrong answers in a row — each adds WRONG_PENALTY (0.20).
		for (let i = 0; i < 5; i++) answer(s, 999, i * 1000);
		expect(s.outcome).toBe('lost');
		expect(s.monsterPos).toBeGreaterThanOrEqual(MONSTER_REACHED_POS);
	});

	it('no answer accepted after game ends', () => {
		const s = createSession(makeProvider(), 1, {}, 0);
		s.outcome = 'lost';
		expect(currentQuestion(s)).toBeNull();
		expect(answer(s, 2, 1000)).toBeNull();
	});

	it('tick does NOT advance the monster on its own (no time pressure)', () => {
		const s = createSession(makeProvider(), 1, {}, 0);
		tick(s, 5000);
		tick(s, 60_000);
		expect(s.monsterPos).toBe(0);
		expect(s.outcome).toBe('in_progress');
	});

	it('summarize reports outcome, totals, avg time', () => {
		const s = createSession(makeProvider(), 3, {}, 0);
		answer(s, 2, 1500);
		answer(s, 99, 3500);
		const sum = summarize(s);
		expect(sum.total).toBe(2);
		expect(sum.correct).toBe(1);
		expect(sum.wrong).toBe(1);
		expect(sum.avgMs).toBe(1750);
		expect(sum.level).toBe(3);
	});
});
