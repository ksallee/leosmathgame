export const WIN_CORRECT = 10;
export const MONSTER_SPEED_PER_SECOND = 0.014;
export const PUSH_BACK_PER_CORRECT = 0.1;
export const WRONG_PENALTY = 0.05;
export const MONSTER_START_POS = 0;
export const MONSTER_REACHED_POS = 1;

/** Reward invariant (R7): coins are NEVER gated on per-question correctness.
 *  - Win base: flat per-level reward (decoupled from accuracy).
 *  - Track bonus: position/time-based (collected by the monster moving).
 *  - Stars: cosmetic only — must NOT multiply or gate coin rewards.
 *  Tying coins to per-answer correctness boosts short-term engagement but
 *  erodes intrinsic motivation (Deci & Ryan; brief §5). If you add streak
 *  bonuses or daily-login coins, talk to Kevin first — the brief argues
 *  against both for this game. */
export const COINS_PER_WIN = 15;
