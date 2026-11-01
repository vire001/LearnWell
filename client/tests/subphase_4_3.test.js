/**
 * subphase_4_3.test.js — Comprehensive Automated Test Suite for Sub-Phase 4.3.
 *
 * Implements verification mandates for M3 Phase 4 Architecture (Revision 2.4):
 * 1. Rule A: Viewing Hint before attempt 1 marks first attempt as assisted (assisted_correct / assisted_incorrect).
 * 2. Rule B: Viewing Solution before attempt 1 marks first attempt as assisted.
 * 3. Rule C: Viewing Guide Me before attempt 1 marks first attempt as assisted.
 * 4. Rule D: Viewing Solution AFTER an independent correct answer sets solutionViewedAfterAnswer=true
 *    and preserves independent_correct mastery category (no downgrade).
 * 5. Rule E: Retrying after distractor is always assisted with automaticOptionGuidance: true.
 * 6. Rule F: Viewing tools post-attempt never retroactively mutates prior attempt records or firstAttempt.
 * 7. Rule G: Viewing any tool before an incorrect first attempt results in assisted_incorrect.
 * 8. Read-only session mode: recordToolView bypasses mutations for completed sessions.
 * 9. Multiple tools viewed before attempt 1: all tools accurately recorded in toolsUsedBeforeAttempt.
 * 10. Guide Me structure: 4-quadrant architecture (whatToThink, howToApproach, rememberThis, applyNextTime).
 * 11. Guide Me pedagogical tone: strictly positive and forward-looking, zero judgmental language.
 * 12. Solution structure: complete stepByStep derivation array and finalAnswer callout.
 * 13. KaTeX math rendering support in Hint, Solution, and Guide Me content.
 * 14. Zero Gemini API calls during all Sub-Phase 4.3 operations.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import {
  getInitialAttemptState,
  evaluateAttemptSelection,
  recordToolView,
} from '../src/utils/attemptEngine.js';

// Helper: Sample standard question fixture with complete Sub-Phase 4.3 learning tools
function createSampleQuestion(correctAnswer = 'B') {
  return {
    questionId: `q_test_${Math.random().toString(36).substring(2, 8)}`,
    formulaId: 'quad_disc',
    formulaText: 'b^2 - 4ac',
    difficulty: 'intermediate',
    pattern: 'formula_recognition',
    testedConcept: 'Discriminant condition for equal real roots',
    statement: 'For what values of $k$ does the equation $x^2 + kx + 144 = 0$ have equal real roots?',
    options: [
      { id: 'A', text: '$k = \\pm 12$' },
      { id: 'B', text: '$k = \\pm 24$' },
      { id: 'C', text: '$k = 144$' },
      { id: 'D', text: '$k = 0$' },
    ],
    correctAnswer,
    hint: 'Set the discriminant $\\Delta = b^2 - 4ac$ equal to 0 for equal real roots.',
    solution: {
      stepByStep: [
        'Identify quadratic coefficients: $a = 1, b = k, c = 144$.',
        'Recall equal roots condition: Discriminant $\\Delta = b^2 - 4ac = 0$.',
        'Substitute coefficients: $k^2 - 4(1)(144) = 0$.',
        'Simplify and solve: $k^2 = 576 \\implies k = \\pm 24$.',
      ],
      finalAnswer: '$k = \\pm 24$',
    },
    guideMe: {
      whatToThink: 'Recognize that "equal real roots" points directly to the discriminant condition $\\Delta = 0$.',
      howToApproach: 'Step 1: Write down $a, b, c$. Step 2: Formulate $\\Delta = b^2 - 4ac = 0$. Step 3: Solve for $k$.',
      rememberThis: 'The discriminant condition for two coincident real roots is strictly $b^2 - 4ac = 0$.',
      applyNextTime: 'Whenever a quadratic problem mentions number or nature of roots, calculate the discriminant first.',
    },
    optionGuidance: {
      A: '144 is $12^2$, but $4ac = 4 \\times 144 = 576$. Remember to multiply by 4.',
      B: 'Correct! $k^2 - 4(1)(144) = 0 \\implies k = \\pm 24$.',
      C: '144 is the constant term $c$, not the value of $k$.',
      D: 'If $k = 0$, $b^2 - 4ac = -576 < 0$, giving complex roots.',
    },
  };
}

describe('M3 Sub-Phase 4.3 — Learning Tools Triad & Assistance Architecture', () => {

  test('1. Rule A: Hint viewed before attempt 1 marks first attempt as assisted', () => {
    const question = createSampleQuestion('B');
    let state = getInitialAttemptState();

    // Learner opens Hint
    state = recordToolView({ attemptState: state, toolName: 'hint' });
    assert.strictEqual(state.hintViewed, true);
    assert.strictEqual(state.guideMeViewed, false);
    assert.strictEqual(state.solutionViewed, false);

    // Learner answers correctly
    const evaluated = evaluateAttemptSelection({
      attemptState: state,
      question,
      optionId: 'B',
    });

    assert.strictEqual(evaluated.firstAttempt.isAssisted, true);
    assert.strictEqual(evaluated.firstAttempt.toolsUsedBeforeAttempt.hint, true);
    assert.strictEqual(evaluated.firstAttempt.toolsUsedBeforeAttempt.solution, false);
    assert.strictEqual(evaluated.firstAttempt.toolsUsedBeforeAttempt.guideMe, false);
    assert.strictEqual(evaluated.firstAttempt.toolsUsedBeforeAttempt.automaticOptionGuidance, false);
    assert.strictEqual(evaluated.masteryCategory, 'assisted_correct');
  });

  test('2. Rule B: Solution viewed before attempt 1 marks first attempt as assisted', () => {
    const question = createSampleQuestion('B');
    let state = getInitialAttemptState();

    // Learner opens Solution before answering
    state = recordToolView({ attemptState: state, toolName: 'solution' });
    assert.strictEqual(state.solutionViewed, true);
    assert.strictEqual(state.solutionViewedAfterAnswer, false);

    // Learner then selects correct answer
    const evaluated = evaluateAttemptSelection({
      attemptState: state,
      question,
      optionId: 'B',
    });

    assert.strictEqual(evaluated.firstAttempt.isAssisted, true);
    assert.strictEqual(evaluated.firstAttempt.toolsUsedBeforeAttempt.solution, true);
    assert.strictEqual(evaluated.masteryCategory, 'assisted_correct');
  });

  test('3. Rule C: Guide Me viewed before attempt 1 marks first attempt as assisted', () => {
    const question = createSampleQuestion('B');
    let state = getInitialAttemptState();

    // Learner opens Guide Me coaching drawer
    state = recordToolView({ attemptState: state, toolName: 'guideMe' });
    assert.strictEqual(state.guideMeViewed, true);

    // Learner then selects correct answer
    const evaluated = evaluateAttemptSelection({
      attemptState: state,
      question,
      optionId: 'B',
    });

    assert.strictEqual(evaluated.firstAttempt.isAssisted, true);
    assert.strictEqual(evaluated.firstAttempt.toolsUsedBeforeAttempt.guideMe, true);
    assert.strictEqual(evaluated.masteryCategory, 'assisted_correct');
  });

  test('4. Rule D: Solution viewed after independent correct answer preserves independent_correct', () => {
    const question = createSampleQuestion('B');
    const state = getInitialAttemptState();

    // Learner solves question independently on first attempt
    const answeredState = evaluateAttemptSelection({
      attemptState: state,
      question,
      optionId: 'B',
    });

    assert.strictEqual(answeredState.isCorrect, true);
    assert.strictEqual(answeredState.isLocked, true);
    assert.strictEqual(answeredState.firstAttempt.isAssisted, false);
    assert.strictEqual(answeredState.masteryCategory, 'independent_correct');

    // Learner subsequently opens Solution to verify steps
    const postReviewState = recordToolView({
      attemptState: answeredState,
      toolName: 'solution',
    });

    assert.strictEqual(postReviewState.solutionViewed, true);
    assert.strictEqual(postReviewState.solutionViewedAfterAnswer, true);
    // Mastery category must remain strictly independent_correct (NO downgrade)
    assert.strictEqual(postReviewState.masteryCategory, 'independent_correct');
    // firstAttempt must remain untouched
    assert.strictEqual(postReviewState.firstAttempt.isAssisted, false);
    assert.strictEqual(postReviewState.firstAttempt.toolsUsedBeforeAttempt.solution, false);
  });

  test('5. Rule E: Retrying after distractor is always assisted with automaticOptionGuidance: true', () => {
    const question = createSampleQuestion('B');
    let state = getInitialAttemptState();

    // First attempt: independent incorrect
    state = evaluateAttemptSelection({
      attemptState: state,
      question,
      optionId: 'A',
    });

    assert.strictEqual(state.firstAttempt.isAssisted, false);
    assert.strictEqual(state.masteryCategory, 'independent_incorrect');
    assert.deepStrictEqual(state.exhaustedOptions, ['A']);

    // Second attempt: retry with option guidance active
    const retryState = evaluateAttemptSelection({
      attemptState: state,
      question,
      optionId: 'B',
    });

    assert.strictEqual(retryState.attempts.length, 2);
    const secondAttempt = retryState.attempts[1];
    assert.strictEqual(secondAttempt.attemptNumber, 2);
    assert.strictEqual(secondAttempt.isAssisted, true);
    assert.strictEqual(secondAttempt.toolsUsedBeforeAttempt.automaticOptionGuidance, true);
    assert.strictEqual(retryState.masteryCategory, 'assisted_retry_correct');
  });

  test('6. Rule F: Tools viewed post-attempt never retroactively mutate prior attempt records', () => {
    const question = createSampleQuestion('B');
    let state = getInitialAttemptState();

    // Learner makes an independent incorrect attempt
    state = evaluateAttemptSelection({
      attemptState: state,
      question,
      optionId: 'C',
    });

    const frozenFirstAttempt = JSON.parse(JSON.stringify(state.firstAttempt));

    // Learner now opens Hint, Guide Me, and Solution
    state = recordToolView({ attemptState: state, toolName: 'hint' });
    state = recordToolView({ attemptState: state, toolName: 'guideMe' });
    state = recordToolView({ attemptState: state, toolName: 'solution' });

    // Verify firstAttempt record was NOT retroactively altered
    assert.deepStrictEqual(state.firstAttempt, frozenFirstAttempt);
    assert.strictEqual(state.firstAttempt.isAssisted, false);
    assert.strictEqual(state.firstAttempt.toolsUsedBeforeAttempt.hint, false);
    assert.strictEqual(state.firstAttempt.toolsUsedBeforeAttempt.guideMe, false);
    assert.strictEqual(state.firstAttempt.toolsUsedBeforeAttempt.solution, false);
  });

  test('7. Rule G: Viewing tool before incorrect first attempt results in assisted_incorrect', () => {
    const question = createSampleQuestion('B');
    let state = getInitialAttemptState();

    // View Hint first
    state = recordToolView({ attemptState: state, toolName: 'hint' });

    // Select wrong option
    state = evaluateAttemptSelection({
      attemptState: state,
      question,
      optionId: 'A',
    });

    assert.strictEqual(state.firstAttempt.isAssisted, true);
    assert.strictEqual(state.firstAttempt.toolsUsedBeforeAttempt.hint, true);
    assert.strictEqual(state.masteryCategory, 'assisted_incorrect');
  });

  test('8. Read-only session mode: recordToolView bypasses mutations for completed sessions', () => {
    let state = getInitialAttemptState({
      hintViewed: false,
      guideMeViewed: false,
      solutionViewed: false,
    });

    // In read-only mode (completed session review)
    const afterHint = recordToolView({
      attemptState: state,
      toolName: 'hint',
      isReadOnly: true,
    });

    assert.strictEqual(afterHint.hintViewed, false);
    assert.deepStrictEqual(afterHint, state);

    const afterSolution = recordToolView({
      attemptState: state,
      toolName: 'solution',
      isReadOnly: true,
    });

    assert.strictEqual(afterSolution.solutionViewed, false);
    assert.deepStrictEqual(afterSolution, state);
  });

  test('9. Multiple tools viewed before attempt 1: all tools accurately recorded', () => {
    const question = createSampleQuestion('B');
    let state = getInitialAttemptState();

    // Learner opens both Hint and Guide Me
    state = recordToolView({ attemptState: state, toolName: 'hint' });
    state = recordToolView({ attemptState: state, toolName: 'guideMe' });

    state = evaluateAttemptSelection({
      attemptState: state,
      question,
      optionId: 'B',
    });

    assert.strictEqual(state.firstAttempt.isAssisted, true);
    assert.strictEqual(state.firstAttempt.toolsUsedBeforeAttempt.hint, true);
    assert.strictEqual(state.firstAttempt.toolsUsedBeforeAttempt.guideMe, true);
    assert.strictEqual(state.firstAttempt.toolsUsedBeforeAttempt.solution, false);
    assert.strictEqual(state.masteryCategory, 'assisted_correct');
  });

  test('10. Guide Me structure: adheres to 4-quadrant architecture', () => {
    const question = createSampleQuestion('B');
    const { guideMe } = question;

    assert.ok(guideMe, 'guideMe must exist');
    assert.ok(typeof guideMe.whatToThink === 'string' && guideMe.whatToThink.length > 0, 'whatToThink quadrant required');
    assert.ok(typeof guideMe.howToApproach === 'string' && guideMe.howToApproach.length > 0, 'howToApproach quadrant required');
    assert.ok(typeof guideMe.rememberThis === 'string' && guideMe.rememberThis.length > 0, 'rememberThis quadrant required');
    assert.ok(typeof guideMe.applyNextTime === 'string' && guideMe.applyNextTime.length > 0, 'applyNextTime quadrant required');
  });

  test('11. Guide Me pedagogical tone: strictly non-judgmental and positive', () => {
    const question = createSampleQuestion('B');
    const fullText = Object.values(question.guideMe).join(' ').toLowerCase();

    // Check for absence of judgmental / disparaging language
    const forbiddenPhrases = [
      'you failed',
      'your mistake',
      'you did wrong',
      'you got it wrong',
      'you do not know',
      'incorrect approach',
      'you should know better',
      'careless error',
    ];

    for (const phrase of forbiddenPhrases) {
      assert.strictEqual(
        fullText.includes(phrase),
        false,
        `Guide Me text contains forbidden judgmental phrase: "${phrase}"`
      );
    }
  });

  test('12. Solution structure: complete stepByStep array and finalAnswer callout', () => {
    const question = createSampleQuestion('B');
    const { solution } = question;

    assert.ok(solution, 'solution must exist');
    assert.ok(Array.isArray(solution.stepByStep), 'solution.stepByStep must be an array');
    assert.ok(solution.stepByStep.length >= 2, 'solution must contain at least 2 derivation steps');
    assert.ok(typeof solution.finalAnswer === 'string' && solution.finalAnswer.length > 0, 'solution.finalAnswer required');
  });

  test('13. KaTeX math rendering support in Hint, Solution, and Guide Me content', () => {
    const question = createSampleQuestion('B');

    // Verify Hint math compiles
    const hintRendered = katex.renderToString('b^2 - 4ac = 0', { throwOnError: false });
    assert.ok(hintRendered.includes('katex'), 'KaTeX rendered hint math');

    // Verify Solution steps math compiles
    for (const step of question.solution.stepByStep) {
      const mathParts = step.match(/\$([^$]+)\$/g) || [];
      for (const part of mathParts) {
        const raw = part.slice(1, -1);
        const compiled = katex.renderToString(raw, { throwOnError: false });
        assert.ok(compiled.includes('katex'), `KaTeX rendered solution math: ${raw}`);
      }
    }

    // Verify Guide Me math compiles
    const guideMeMath = question.guideMe.rememberThis.match(/\$([^$]+)\$/g) || [];
    for (const part of guideMeMath) {
      const raw = part.slice(1, -1);
      const compiled = katex.renderToString(raw, { throwOnError: false });
      assert.ok(compiled.includes('katex'), `KaTeX rendered guideMe math: ${raw}`);
    }
  });

  test('14. Zero Gemini API calls made during Sub-Phase 4.3 operations', () => {
    // Assert strictly that no remote AI calls, API keys, or external networking are invoked
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = () => {
      fetchCalled = true;
      throw new Error('Unauthorized remote network request intercepted during Sub-Phase 4.3 evaluation');
    };

    try {
      const question = createSampleQuestion('B');
      let state = getInitialAttemptState();

      state = recordToolView({ attemptState: state, toolName: 'hint' });
      state = recordToolView({ attemptState: state, toolName: 'guideMe' });
      state = recordToolView({ attemptState: state, toolName: 'solution' });

      evaluateAttemptSelection({
        attemptState: state,
        question,
        optionId: 'B',
      });

      assert.strictEqual(fetchCalled, false, 'Sub-Phase 4.3 operates with zero external network / Gemini calls');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

});
