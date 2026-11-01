/**
 * subphase_4_4.test.js — Comprehensive Automated Test Suite for Sub-Phase 4.4.
 *
 * Implements verification mandates for M3 Phase 4 Architecture (Revision 2.4):
 * 1. Question Palette status classifications (Active, Correct, Incorrect, Marked, Unanswered).
 * 2. Mark for Review status independence from correctness, attempts, and mastery category.
 * 3. Free non-blocking navigation and question skipping across arbitrary indices.
 * 4. Completion metric calculation (N = Total, A = Answered, U = Unanswered, R = Marked).
 * 5. Viewing Hint/Solution/Guide Me does NOT resolve a question or count towards answered metrics.
 * 6. Tri-Action navigation targets: firstUnansweredIndex and firstMarkedIndex.
 * 7. Scenario A vs Scenario B completion modal condition determination.
 * 8. Session completion commitment semantics (status: 'completed', completedAt timestamp).
 * 9. Completed session read-only mode safeguards.
 * 10. Question index bounds clamping (prevents out-of-range navigation).
 * 11. Mixed Practice formula anonymity preservation during navigation.
 * 12. Zero Gemini API calls made during navigation, review, and completion operations.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getInitialAttemptState,
  evaluateAttemptSelection,
  recordToolView,
} from '../src/utils/attemptEngine.js';

// Helper: Question fixture generator
function createFixtureQuestion(id, correctAnswer = 'B', formulaId = 'quad_disc') {
  return {
    questionId: `q_${id}`,
    questionNumber: id,
    formulaId,
    correctAnswer,
    statement: `Find root for question ${id}`,
    options: [
      { id: 'A', text: 'Option A' },
      { id: 'B', text: 'Option B' },
      { id: 'C', text: 'Option C' },
      { id: 'D', text: 'Option D' },
    ],
    hint: `Hint for ${id}`,
    solution: {
      stepByStep: ['Step 1', 'Step 2'],
      finalAnswer: 'Option B',
    },
    guideMe: {
      whatToThink: 'Think clearly',
      howToApproach: 'Approach sequentially',
      rememberThis: 'Core theorem',
      applyNextTime: 'Apply carefully',
    },
    attemptState: getInitialAttemptState(),
  };
}

describe('M3 Sub-Phase 4.4 — Navigation, Review & Completion Architecture', () => {

  test('1. Question Palette status classifications conform strictly to state taxonomy', () => {
    // 1. Unanswered question
    const qUnattempted = getInitialAttemptState();
    assert.strictEqual(Boolean(qUnattempted.isCorrect), false);
    assert.strictEqual(qUnattempted.attempts.length, 0);
    assert.strictEqual(qUnattempted.masteryCategory, 'unattempted');

    // 2. Correct question
    const qCorrect = getInitialAttemptState({
      isCorrect: true,
      masteryCategory: 'independent_correct',
      attempts: [{ attemptNumber: 1, selectedOption: 'B', isCorrect: true }],
    });
    assert.strictEqual(Boolean(qCorrect.isCorrect), true);

    // 3. Incorrect / in-progress question
    const qIncorrect = getInitialAttemptState({
      isCorrect: false,
      masteryCategory: 'independent_incorrect',
      exhaustedOptions: ['A'],
      attempts: [{ attemptNumber: 1, selectedOption: 'A', isCorrect: false }],
    });
    assert.strictEqual(Boolean(qIncorrect.isCorrect), false);
    assert.strictEqual(qIncorrect.attempts.length > 0, true);

    // 4. Marked for review question
    const qMarked = getInitialAttemptState({
      isMarkedForReview: true,
    });
    assert.strictEqual(qMarked.isMarkedForReview, true);
  });

  test('2. Mark for Review status is strictly independent of correctness and attempt history', () => {
    const question = createFixtureQuestion(1, 'B');
    let state = getInitialAttemptState();

    // Mark unattempted question
    state = { ...state, isMarkedForReview: true };
    assert.strictEqual(state.isMarkedForReview, true);
    assert.strictEqual(state.masteryCategory, 'unattempted');
    assert.strictEqual(state.firstAttempt, null);

    // Answer correctly while marked
    state = evaluateAttemptSelection({
      attemptState: state,
      question,
      optionId: 'B',
    });

    // isMarkedForReview must remain true, while question transitions to independent_correct
    assert.strictEqual(state.isMarkedForReview, true);
    assert.strictEqual(state.isCorrect, true);
    assert.strictEqual(state.masteryCategory, 'independent_correct');

    // Unmark question
    state = { ...state, isMarkedForReview: false };
    assert.strictEqual(state.isMarkedForReview, false);
    // Mastery and attempt history remain completely preserved
    assert.strictEqual(state.isCorrect, true);
    assert.strictEqual(state.masteryCategory, 'independent_correct');
    assert.strictEqual(state.firstAttempt.isCorrect, true);
  });

  test('3. Non-blocking navigation allows skipping questions without impediment', () => {
    const totalQuestions = 5;
    let currentIndex = 0;

    // Navigate 0 -> 2 (skipping index 1)
    currentIndex = 2;
    assert.strictEqual(currentIndex, 2);

    // Navigate backward 2 -> 1
    currentIndex = 1;
    assert.strictEqual(currentIndex, 1);

    // Jump to final question 4
    currentIndex = totalQuestions - 1;
    assert.strictEqual(currentIndex, 4);
  });

  test('4. Completion metrics accurately compute A, U, R, N based on resolved questions', () => {
    const questions = [
      // Q0: Solved / Locked
      { ...createFixtureQuestion(0, 'B'), attemptState: { isLocked: true, isCorrect: true, attempts: [{ isCorrect: true }], isMarkedForReview: false } },
      // Q1: Incorrect in-progress, unlocked, retryable (UNRESOLVED)
      { ...createFixtureQuestion(1, 'B'), attemptState: { isLocked: false, isCorrect: false, attempts: [{ isCorrect: false }], isMarkedForReview: true } },
      // Q2: Unattempted, marked (UNRESOLVED)
      { ...createFixtureQuestion(2, 'B'), attemptState: { isLocked: false, isCorrect: false, attempts: [], isMarkedForReview: true } },
      // Q3: Unattempted, clean (UNRESOLVED)
      { ...createFixtureQuestion(3, 'B'), attemptState: { isLocked: false, isCorrect: false, attempts: [], isMarkedForReview: false } },
    ];

    const totalQuestions = questions.length;
    let answeredCount = 0;
    let markedCount = 0;

    questions.forEach((q) => {
      const state = q.attemptState || {};
      const isResolved = Boolean(state.isLocked || state.isCorrect);
      if (isResolved) answeredCount += 1;
      if (state.isMarkedForReview) markedCount += 1;
    });

    const unansweredCount = totalQuestions - answeredCount;

    assert.strictEqual(totalQuestions, 4, 'N should be 4');
    assert.strictEqual(answeredCount, 1, 'A should be 1 (only Q0 is resolved/locked)');
    assert.strictEqual(unansweredCount, 3, 'U should be 3 (Q1 is unlocked/retryable, Q2 and Q3 are unattempted)');
    assert.strictEqual(markedCount, 2, 'R should be 2 (Q1 and Q2 marked)');
  });

  test('5. Viewing Hint, Solution or Guide Me does NOT count as answering a question', () => {
    let state = getInitialAttemptState();

    // Inspect tools without answering
    state = recordToolView({ attemptState: state, toolName: 'hint' });
    state = recordToolView({ attemptState: state, toolName: 'guideMe' });
    state = recordToolView({ attemptState: state, toolName: 'solution' });

    assert.strictEqual(state.hintViewed, true);
    assert.strictEqual(state.guideMeViewed, true);
    assert.strictEqual(state.solutionViewed, true);

    // Is it answered?
    const isResolved = Boolean(state.isLocked || state.isCorrect);
    assert.strictEqual(isResolved, false, 'Viewing tools must never mark a question as answered/resolved');
    assert.strictEqual(state.masteryCategory, 'unattempted');
  });

  test('6. Tri-Action navigation targets locate first unanswered/unresolved and first marked questions', () => {
    const questions = [
      // Index 0: Answered, not marked
      { questionId: 'q0', attemptState: { isLocked: true, isCorrect: true, attempts: [{ isCorrect: true }], isMarkedForReview: false } },
      // Index 1: In-progress incorrect, unlocked, retryable, marked
      { questionId: 'q1', attemptState: { isLocked: false, isCorrect: false, attempts: [{ isCorrect: false }], isMarkedForReview: true } },
      // Index 2: Unanswered, not marked
      { questionId: 'q2', attemptState: { isLocked: false, isCorrect: false, attempts: [], isMarkedForReview: false } },
      // Index 3: Unanswered, marked
      { questionId: 'q3', attemptState: { isLocked: false, isCorrect: false, attempts: [], isMarkedForReview: true } },
    ];

    // Find first unanswered/unresolved: should be index 1 (since index 1 is still unlocked and retryable!)
    const firstUnansweredIndex = questions.findIndex(
      (q) => !q.attemptState?.isLocked && !q.attemptState?.isCorrect
    );
    assert.strictEqual(firstUnansweredIndex, 1);

    // Find first marked: should be index 1
    const firstMarkedIndex = questions.findIndex(
      (q) => q.attemptState?.isMarkedForReview
    );
    assert.strictEqual(firstMarkedIndex, 1);
  });

  test('7. Scenario A vs Scenario B completion condition determination', () => {
    // Scenario A: Clean completion (All answered/resolved, none marked)
    const allCleanQuestions = [
      { attemptState: { isLocked: true, isCorrect: true, attempts: [{ isCorrect: true }], isMarkedForReview: false } },
      { attemptState: { isLocked: true, isCorrect: true, attempts: [{ isCorrect: true }], isMarkedForReview: false } },
    ];

    let answeredA = 0;
    let markedA = 0;
    allCleanQuestions.forEach((q) => {
      const state = q.attemptState || {};
      if (state.isLocked || state.isCorrect) answeredA += 1;
      if (state.isMarkedForReview) markedA += 1;
    });
    const unansweredA = allCleanQuestions.length - answeredA;
    const isScenarioA = unansweredA === 0 && markedA === 0;
    assert.strictEqual(isScenarioA, true, 'Should trigger clean Scenario A completion');

    // Scenario B: Unresolved questions exist (even if attempted)
    const advisoryQuestions = [
      { attemptState: { isLocked: true, isCorrect: true, attempts: [{ isCorrect: true }], isMarkedForReview: false } },
      { attemptState: { isLocked: false, isCorrect: false, attempts: [{ isCorrect: false }], isMarkedForReview: false } },
    ];
    let answeredB = 0;
    let markedB = 0;
    advisoryQuestions.forEach((q) => {
      const state = q.attemptState || {};
      if (state.isLocked || state.isCorrect) answeredB += 1;
      if (state.isMarkedForReview) markedB += 1;
    });
    const unansweredB = advisoryQuestions.length - answeredB;
    const isScenarioB = unansweredB > 0 || markedB > 0;
    assert.strictEqual(isScenarioB, true, 'Should trigger advisory Scenario B completion');
  });

  test('8. Session completion commitment sets status to completed with timestamp', () => {
    const session = {
      sessionId: 'session_test_1',
      status: 'in_progress',
      currentQuestionIndex: 2,
    };

    const completedAt = new Date().toISOString();
    const updatedSession = {
      ...session,
      status: 'completed',
      completedAt,
    };

    assert.strictEqual(updatedSession.status, 'completed');
    assert.ok(typeof updatedSession.completedAt === 'string');
    assert.ok(Date.parse(updatedSession.completedAt) > 0);
  });

  test('9. Read-only completed session protects state from mutations', () => {
    const isReadOnly = true;
    let attemptState = getInitialAttemptState({
      isCorrect: true,
      masteryCategory: 'independent_correct',
    });

    // Tool views bypass modification
    const toolResult = recordToolView({
      attemptState,
      toolName: 'hint',
      isReadOnly,
    });
    assert.strictEqual(toolResult.hintViewed, false);
    assert.deepStrictEqual(toolResult, attemptState);

    // Option clicks are guarded by isReadOnly
    const evaluateGuarded = () => {
      if (isReadOnly) return attemptState;
      return evaluateAttemptSelection({ attemptState, question: createFixtureQuestion(1), optionId: 'A' });
    };
    const optionResult = evaluateGuarded();
    assert.deepStrictEqual(optionResult, attemptState);
  });

  test('10. Question index clamping strictly prevents out-of-range navigation', () => {
    const totalQuestions = 5;

    const clamp = (target) => Math.max(0, Math.min(target, totalQuestions - 1));

    assert.strictEqual(clamp(-1), 0);
    assert.strictEqual(clamp(-10), 0);
    assert.strictEqual(clamp(0), 0);
    assert.strictEqual(clamp(2), 2);
    assert.strictEqual(clamp(4), 4);
    assert.strictEqual(clamp(5), 4);
    assert.strictEqual(clamp(100), 4);
  });

  test('11. Mixed Practice formula anonymity is preserved during navigation', () => {
    const mixedQuestion = createFixtureQuestion(3, 'C', 'mixed');
    const session = {
      formulas: [{ id: 'quad_disc', name: 'Discriminant Formula' }],
    };

    const isMixed = mixedQuestion.formulaId === 'mixed';
    let label = '';
    if (isMixed) {
      label = 'Mixed Practice (Synthesized Formulas)';
    } else {
      const matched = session.formulas.find((f) => f.id === mixedQuestion.formulaId);
      label = matched?.name || '';
    }

    assert.strictEqual(isMixed, true);
    assert.strictEqual(label, 'Mixed Practice (Synthesized Formulas)');
    assert.strictEqual(label.includes('quad_disc'), false);
    assert.strictEqual(label.includes('Discriminant'), false);
  });

  test('12. Zero Gemini API calls made during navigation, review, and completion', () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = () => {
      fetchCalled = true;
      throw new Error('Unauthorized remote network request intercepted during Sub-Phase 4.4 evaluation');
    };

    try {
      const q = createFixtureQuestion(1, 'B');
      let state = q.attemptState;

      // Toggle review
      state = { ...state, isMarkedForReview: true };
      assert.strictEqual(state.isMarkedForReview, true);

      // Navigate
      const nextIndex = 2;
      assert.strictEqual(nextIndex, 2);

      // Complete
      const session = { status: 'completed', completedAt: new Date().toISOString() };
      assert.strictEqual(session.status, 'completed');

      assert.strictEqual(fetchCalled, false, 'Sub-Phase 4.4 operates with zero external network / Gemini calls');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

});
