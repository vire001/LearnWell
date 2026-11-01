/**
 * attemptEngine.js — Pure Multi-Attempt Evaluation Engine & Invariant Verifier.
 *
 * Implements Section 5, 6 & Sub-Phase 4.2 of LearnWell M3 Phase 4 Architecture:
 * - Immutable firstAttempt tracking.
 * - Strict retryCount semantics:
 *   - Initial manual attempt: retryCount = 0
 *   - First manual retry: retryCount = 1
 *   - Second manual retry: retryCount = 2
 *   - Automatic elimination entries NEVER increment retryCount
 * - Invariant-verified automatic elimination deduction when 3 distractors are exhausted.
 * - Full mastery classifications:
 *   - unattempted
 *   - independent_correct
 *   - assisted_correct
 *   - independent_incorrect
 *   - assisted_incorrect
 *   - assisted_retry_correct
 *   - incorrect
 */

export const VALID_OPTION_IDS = ['A', 'B', 'C', 'D'];

/**
 * Returns a clean, fully-formed default attemptState conforming to Revision 2.4.
 */
export function getInitialAttemptState(existingState = {}) {
  return {
    firstAttempt: null,
    attempts: [],
    retryCount: 0,
    exhaustedOptions: [],
    isLocked: false,
    masteryCategory: 'unattempted',
    selectedOption: null,
    isCorrect: null,
    isAssisted: false,
    hintViewed: false,
    solutionViewed: false,
    guideMeViewed: false,
    solutionViewedAfterAnswer: false,
    isMarkedForReview: false,
    timeSpentSeconds: 0,
    ...existingState,
  };
}

/**
 * Records inspection of a learning tool (hint, solution, or guideMe).
 *
 * Implements Rules A-G of Revision 2.4:
 * - Marks hintViewed, solutionViewed, or guideMeViewed.
 * - If solution is opened after answering correctly/independently, marks solutionViewedAfterAnswer = true
 *   and strictly preserves 'independent_correct' masteryCategory (Rule D).
 * - Never retroactively modifies firstAttempt or prior attempts[] entries (Rule F).
 * - Does not modify records in read-only mode.
 */
export function recordToolView({ attemptState = {}, toolName, isReadOnly = false }) {
  const current = getInitialAttemptState(attemptState);

  if (isReadOnly) {
    return current;
  }

  const updates = {};
  if (toolName === 'hint') {
    updates.hintViewed = true;
  } else if (toolName === 'guideMe') {
    updates.guideMeViewed = true;
  } else if (toolName === 'solution') {
    updates.solutionViewed = true;
    // Rule D: If already solved correctly (or question locked), flag post-answer review
    if (current.isCorrect === true || current.isLocked === true) {
      updates.solutionViewedAfterAnswer = true;
    }
  }

  return {
    ...current,
    ...updates,
  };
}

/**
 * Evaluates an option selection against the question's verified correct answer.
 *
 * Throws an Error if an automatic elimination invariant violation is detected.
 *
 * @param {Object} params
 * @param {Object} params.attemptState - Current question attempt state
 * @param {Object} params.question - Question object containing correctAnswer & options
 * @param {string} params.optionId - Selected option ID ('A' | 'B' | 'C' | 'D')
 * @returns {Object} updatedState
 */
export function evaluateAttemptSelection({ attemptState = {}, question, optionId }) {
  if (!question || !optionId) {
    throw new Error('evaluateAttemptSelection requires question and optionId');
  }

  const current = getInitialAttemptState(attemptState);

  // If already locked or option is exhausted, return current state without change
  if (current.isLocked || current.exhaustedOptions.includes(optionId)) {
    return current;
  }

  const isCorrect = optionId === question.correctAnswer;
  const currentAttemptsCount = (current.attempts || []).length;
  const nextAttemptNumber = currentAttemptsCount + 1;
  const isFirst = nextAttemptNumber === 1;

  // Strict retryCount semantics:
  // - 0 on initial manual attempt (attempt 1)
  // - Increments by 1 per manual retry (attempts 2 & 3)
  // - Automatic elimination entries NEVER increment retryCount
  const nextRetryCount = isFirst ? 0 : (current.retryCount || 0) + 1;

  // Assistance derivation for first attempt:
  // Any tool viewed prior to attempt 1 marks first attempt as assisted
  const isFirstAssisted = Boolean(
    current.hintViewed || current.solutionViewed || current.guideMeViewed
  );

  // Subsequent retries are always assisted because option guidance opens on failure
  const isAssisted = isFirst ? isFirstAssisted : true;

  // Construct manual selection entry
  const manualEntry = {
    attemptNumber: nextAttemptNumber,
    selectedOption: optionId,
    isCorrect,
    isAssisted,
    resolutionMethod: 'manual_selection',
    toolsUsedBeforeAttempt: {
      hint: Boolean(current.hintViewed),
      solution: Boolean(current.solutionViewed),
      guideMe: Boolean(current.guideMeViewed),
      automaticOptionGuidance: !isFirst,
    },
    timestamp: new Date().toISOString(),
  };

  const updatedAttempts = [...(current.attempts || []), manualEntry];
  const nextExhausted = !isCorrect
    ? [...(current.exhaustedOptions || []), optionId]
    : [...(current.exhaustedOptions || [])];

  let finalSelectedOption = optionId;
  let finalIsCorrect = isCorrect;
  let finalIsLocked = isCorrect;

  // Mastery classification logic derived from immutable firstAttempt facts
  let finalCategory;
  if (isFirst) {
    if (isCorrect) {
      finalCategory = manualEntry.isAssisted ? 'assisted_correct' : 'independent_correct';
    } else {
      finalCategory = manualEntry.isAssisted ? 'assisted_incorrect' : 'independent_incorrect';
    }
  } else {
    if (isCorrect) {
      finalCategory = 'assisted_retry_correct';
    } else {
      // Preserve first attempt classification derived from immutable firstAttempt.isAssisted
      finalCategory = current.firstAttempt?.isAssisted
        ? 'assisted_incorrect'
        : 'independent_incorrect';
    }
  }

  // Safe Last-Remaining-Option Logic (Automatic Elimination):
  // When 3 distractors are eliminated, deduce the 4th option with 100% certainty.
  if (!isCorrect && nextExhausted.length === 3) {
    const remainingOptionId = VALID_OPTION_IDS.find((id) => !nextExhausted.includes(id));

    // Invariant Verification: Strictly verify remaining option matches question.correctAnswer
    if (remainingOptionId === question.correctAnswer) {
      const eliminationEntry = {
        attemptNumber: nextAttemptNumber + 1, // Sequential attempt number (e.g. 4)
        selectedOption: remainingOptionId,
        isCorrect: true,
        isAssisted: true,
        resolutionMethod: 'automatic_elimination',
        toolsUsedBeforeAttempt: {
          hint: Boolean(current.hintViewed),
          solution: Boolean(current.solutionViewed),
          guideMe: Boolean(current.guideMeViewed),
          automaticOptionGuidance: true,
        },
        timestamp: new Date().toISOString(),
      };

      updatedAttempts.push(eliminationEntry);
      finalSelectedOption = remainingOptionId;
      finalIsCorrect = true;
      finalIsLocked = true;
      finalCategory = 'assisted_retry_correct';
      // retryCount remains strictly nextRetryCount (2) — automatic elimination NEVER increments retryCount
    } else {
      // Critical Invariant Failure: Data integrity violation
      // Remaining option does not match verified correctAnswer
      throw new Error(
        `Automatic elimination invariant violation: remaining option '${remainingOptionId}' does not match question.correctAnswer '${question.correctAnswer}'`
      );
    }
  }

  return {
    ...current,
    firstAttempt: isFirst ? manualEntry : current.firstAttempt,
    attempts: updatedAttempts,
    retryCount: nextRetryCount,
    exhaustedOptions: nextExhausted,
    isLocked: finalIsLocked,
    selectedOption: finalSelectedOption,
    isCorrect: finalIsCorrect,
    isAssisted: isFirst ? manualEntry.isAssisted : true,
    masteryCategory: finalCategory,
  };
}
