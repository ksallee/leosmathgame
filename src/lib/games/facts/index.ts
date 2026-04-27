// Fact-retrieval mini-game: sampler, generators, MCQ↔numpad presentation
// stages, distractor generation, session loop, level-scene config. Anything
// here only makes sense for the fact-retrieval game type.

export { generateLevel } from './sampler';
export { generate, clampBand, maxBand } from './generators';
export { generateChoices, type ChoiceDifficulty } from './choices';
export {
	getStageFor,
	stageForQuestion,
	evaluateLevelOutcome,
	type StageTransition,
	type OpStats
} from './stages';

export { QUESTIONS_PER_LEVEL, REVIEW_FRACTION, STAGE_ADVANCE_THRESHOLD } from './config';
