import type { Question, AnswerEvent } from '$lib/engine';
import { makeAnswerEvent } from '$lib/engine/debug';
import {
	WIN_CORRECT,
	MONSTER_SPEED_PER_SECOND,
	PUSH_BACK_PER_CORRECT,
	WRONG_PENALTY,
	MONSTER_START_POS,
	MONSTER_REACHED_POS
} from './config';

export type SessionOutcome = 'in_progress' | 'won' | 'lost';
export type QuestionProvider = () => Question;

export interface SessionOptions {
	speedMultiplier?: number;
	pushBackMultiplier?: number;
	pushBackDelayMs?: number;
}

export interface SessionState {
	level: number;
	provider: QuestionProvider;
	currentQuestion: Question;
	correct: number;
	wrong: number;
	answered: number;
	monsterPos: number;
	outcome: SessionOutcome;
	events: AnswerEvent[];
	questionStartedAt: number;
	lastTickAt: number;
	lastFeedback: 'correct' | 'wrong' | null;
	lastFeedbackAt: number;
	speedMultiplier: number;
	pushBackMultiplier: number;
	pushBackDelayMs: number;
	pendingPushBack: { applyAt: number; amount: number } | null;
}

export function createSession(
	provider: QuestionProvider,
	level: number,
	options: SessionOptions = {},
	now: number = Date.now()
): SessionState {
	return {
		level,
		provider,
		currentQuestion: provider(),
		correct: 0,
		wrong: 0,
		answered: 0,
		monsterPos: MONSTER_START_POS,
		outcome: 'in_progress',
		events: [],
		questionStartedAt: now,
		lastTickAt: now,
		lastFeedback: null,
		lastFeedbackAt: 0,
		speedMultiplier: options.speedMultiplier ?? 1,
		pushBackMultiplier: options.pushBackMultiplier ?? 1,
		pushBackDelayMs: options.pushBackDelayMs ?? 0,
		pendingPushBack: null
	};
}

export function currentQuestion(session: SessionState): Question | null {
	if (session.outcome !== 'in_progress') return null;
	return session.currentQuestion;
}

function clamp(v: number, lo: number, hi: number) {
	return Math.max(lo, Math.min(hi, v));
}

/** Advance monster based on real-time elapsed since last tick.
 *  Also applies any pending delayed push-back when its time arrives.
 *  Returns true if outcome changed. */
export function tick(session: SessionState, now: number = Date.now()): boolean {
	if (session.outcome !== 'in_progress') return false;
	const dt = (now - session.lastTickAt) / 1000;
	session.lastTickAt = now;
	session.monsterPos = clamp(
		session.monsterPos + MONSTER_SPEED_PER_SECOND * session.speedMultiplier * dt,
		MONSTER_START_POS,
		MONSTER_REACHED_POS
	);
	if (session.pendingPushBack && now >= session.pendingPushBack.applyAt) {
		session.monsterPos = clamp(
			session.monsterPos - session.pendingPushBack.amount,
			MONSTER_START_POS,
			MONSTER_REACHED_POS
		);
		session.pendingPushBack = null;
	}
	if (session.monsterPos >= MONSTER_REACHED_POS) {
		session.outcome = 'lost';
		return true;
	}
	return false;
}

/** Record an answer for the current question. Mutates session.
 *  Always advances to a fresh question (pulled from provider) unless win/lose. */
export function answer(
	session: SessionState,
	userValue: number,
	now: number = Date.now()
): AnswerEvent | null {
	if (session.outcome !== 'in_progress') return null;
	const q = session.currentQuestion;
	const elapsed = now - session.questionStartedAt;
	const ev = makeAnswerEvent(q, userValue, elapsed);
	session.events.push(ev);
	session.answered += 1;

	if (ev.correct) {
		session.correct += 1;
		const pushAmount = PUSH_BACK_PER_CORRECT * session.pushBackMultiplier;
		if (session.pushBackDelayMs > 0) {
			session.pendingPushBack = { applyAt: now + session.pushBackDelayMs, amount: pushAmount };
		} else {
			session.monsterPos = clamp(
				session.monsterPos - pushAmount,
				MONSTER_START_POS,
				MONSTER_REACHED_POS
			);
		}
		session.lastFeedback = 'correct';
		session.lastFeedbackAt = now;
		if (session.correct >= WIN_CORRECT) {
			session.outcome = 'won';
		} else {
			session.currentQuestion = session.provider();
		}
	} else {
		session.wrong += 1;
		session.monsterPos = clamp(
			session.monsterPos + WRONG_PENALTY,
			MONSTER_START_POS,
			MONSTER_REACHED_POS
		);
		session.lastFeedback = 'wrong';
		session.lastFeedbackAt = now;
		if (session.monsterPos >= MONSTER_REACHED_POS) {
			session.outcome = 'lost';
		} else {
			session.currentQuestion = session.provider();
		}
	}

	session.questionStartedAt = now;
	session.lastTickAt = now;
	return ev;
}

export interface SessionSummary {
	outcome: SessionOutcome;
	correct: number;
	wrong: number;
	total: number;
	avgMs: number;
	level: number;
}

export function summarize(session: SessionState): SessionSummary {
	const total = session.events.length;
	const avgMs = total ? session.events.reduce((s, e) => s + e.timeMs, 0) / total : 0;
	return {
		outcome: session.outcome,
		correct: session.correct,
		wrong: session.wrong,
		total,
		avgMs,
		level: session.level
	};
}
