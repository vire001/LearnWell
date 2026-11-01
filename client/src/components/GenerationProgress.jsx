import React, { useState, useEffect, useRef } from 'react';
import { generateFormulaQuestions, generateMixedQuestions } from '../utils/api';
import { saveQuestions, updateSession } from '../utils/storage';
import './GenerationProgress.css';

/**
 * GenerationProgress — Formula-by-Formula controlled batch generation controller.
 *
 * Implements Section 8 of LearnWell Architecture Version 3.4:
 * - Sequential execution (Formula 1 -> Formula 2 -> ... -> Mixed Practice).
 * - Instant commitment of each completed batch to IndexedDB.
 * - Safe 429 queue pause with Retry-After countdown and manual Resume button.
 * - Zero regeneration of previously completed batches upon resume.
 */
export default function GenerationProgress({ session, onComplete, onCancel }) {
  const formulas = session?.formulas || [];
  const hasMixed = formulas.length >= 2;

  // Total batches = N formulas + (1 mixed batch if N >= 2)
  const totalBatches = formulas.length + (hasMixed ? 1 : 0);

  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [status, setStatus] = useState('idle'); // 'generating' | 'saving' | 'paused' | 'error' | 'completed'
  const [completedBatches, setCompletedBatches] = useState([]);
  const [savedQuestionsCount, setSavedQuestionsCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [pauseType, setPauseType] = useState(null); // '429' | '503' | 'error'
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const isGeneratingRef = useRef(false);
  const timerRef = useRef(null);

  // Timer countdown for rate-limit cooldown
  useEffect(() => {
    if (cooldownSeconds > 0) {
      timerRef.current = setTimeout(() => {
        setCooldownSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldownSeconds]);

  // Execute a single batch at batchIndex
  const executeBatch = async (batchIndex) => {
    if (batchIndex >= totalBatches) {
      // All batches completed
      setStatus('completed');
      try {
        await updateSession(session.sessionId, {
          totalQuestions: savedQuestionsCount,
          currentQuestionIndex: 0,
          status: 'in_progress',
        });
      } catch (err) {
        console.warn('Failed to update session status:', err);
      }
      return;
    }

    setStatus('generating');
    setErrorMessage('');
    setPauseType(null);
    isGeneratingRef.current = true;

    try {
      let result;
      let batchLabel = '';
      const isMixedBatch = batchIndex === formulas.length;

      if (!isMixedBatch) {
        const formula = formulas[batchIndex];
        batchLabel = formula.name || `Formula ${batchIndex + 1}`;
        result = await generateFormulaQuestions({
          formula,
          chapterTitle: session.chapterTitle,
          topicTitle: session.topicTitle,
          count: 8,
        });
      } else {
        batchLabel = 'Mixed Practice (All Formulas)';
        result = await generateMixedQuestions({
          formulas,
          chapterTitle: session.chapterTitle,
          topicTitle: session.topicTitle,
        });
      }

      const questions = result?.questions || [];
      if (questions.length === 0) {
        throw new Error(`No valid questions could be verified for ${batchLabel}.`);
      }

      setStatus('saving');

      // Decorate questions with session metadata and sequential question number
      const currentStartNumber = savedQuestionsCount;
      const decoratedQuestions = questions.map((q, idx) => ({
        ...q,
        sessionId: session.sessionId,
        learnerId: session.learnerId || 'learner_default',
        questionNumber: currentStartNumber + idx + 1,
        attemptState: {
          selectedOption: null,
          isCorrect: null,
          isAssisted: false,
          hintViewed: false,
          solutionViewed: false,
          guideMeViewed: false,
          solutionViewedAfterAnswer: false,
          isMarkedForReview: false,
          timeSpentSeconds: 0,
        },
      }));

      // Immediate commitment to IndexedDB
      await saveQuestions(decoratedQuestions);

      const newTotalCount = currentStartNumber + decoratedQuestions.length;
      setSavedQuestionsCount(newTotalCount);

      setCompletedBatches((prev) => [
        ...prev,
        {
          index: batchIndex,
          label: batchLabel,
          count: decoratedQuestions.length,
        },
      ]);

      // Move to next batch
      const nextIndex = batchIndex + 1;
      setCurrentBatchIndex(nextIndex);
      isGeneratingRef.current = false;

      if (nextIndex < totalBatches) {
        // Safe brief delay between sequential batches
        setTimeout(() => {
          executeBatch(nextIndex);
        }, 1200);
      } else {
        setStatus('completed');
        await updateSession(session.sessionId, {
          totalQuestions: newTotalCount,
          currentQuestionIndex: 0,
          status: 'in_progress',
        });
      }
    } catch (err) {
      isGeneratingRef.current = false;
      setStatus('paused');

      if (err.status === 429 || err.code === 'QUOTA_EXCEEDED') {
        setPauseType('429');
        const cooldown = err.retryAfter || 60;
        setCooldownSeconds(cooldown);
        setErrorMessage(
          `Gemini Free Tier rate limit reached. Generation paused. Resume available in ${cooldown}s. Completed batches are safe in IndexedDB.`
        );
      } else if (err.status === 503 || err.code === 'HIGH_DEMAND') {
        setPauseType('503');
        setErrorMessage(
          'The Gemini Free Tier service is currently experiencing high demand. No paid resources will be used. Please wait a moment and retry.'
        );
      } else {
        setPauseType('error');
        setErrorMessage(err.message || 'An error occurred while generating questions.');
      }
    }
  };

  // Start on initial mount
  useEffect(() => {
    if (status === 'idle') {
      executeBatch(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResume = () => {
    if (status === 'paused') {
      executeBatch(currentBatchIndex);
    }
  };

  const progressPercent = Math.round((completedBatches.length / totalBatches) * 100);

  return (
    <div className="gen-progress-container" data-testid="generation-progress">
      <div className="gen-progress-card">
        {/* Header */}
        <div className="gen-progress-header">
          <div className="gen-badge">
            <span className="gen-dot-pulse" />
            AI Question Generation Engine
          </div>
          <h2 className="gen-title">Creating Your Custom Practice Set</h2>
          <p className="gen-subtitle">
            Generating 6–8 diverse MCQs per formula plus mixed practice. Every question is
            independently verified with deterministic solvers.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="gen-bar-wrapper">
          <div className="gen-bar-info">
            <span className="gen-bar-label">
              Batch {Math.min(currentBatchIndex + 1, totalBatches)} of {totalBatches}
            </span>
            <span className="gen-bar-percent">{progressPercent}%</span>
          </div>
          <div className="gen-progress-track">
            <div
              className="gen-progress-fill"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
        </div>

        {/* Batch List */}
        <div className="gen-batches-list">
          {formulas.map((formula, idx) => {
            const isDone = completedBatches.some((b) => b.index === idx);
            const isCurrent = currentBatchIndex === idx && status === 'generating';
            const isCurrentSaving = currentBatchIndex === idx && status === 'saving';
            const isCurrentPaused = currentBatchIndex === idx && status === 'paused';

            return (
              <div
                key={formula.id}
                className={`gen-batch-row ${isDone ? 'done' : ''} ${isCurrent || isCurrentSaving ? 'active' : ''} ${isCurrentPaused ? 'paused' : ''}`}
              >
                <div className="gen-batch-indicator">
                  {isDone ? (
                    <span className="gen-check-icon">✓</span>
                  ) : isCurrent || isCurrentSaving ? (
                    <span className="gen-spinner-small" />
                  ) : (
                    <span className="gen-number-icon">{idx + 1}</span>
                  )}
                </div>
                <div className="gen-batch-details">
                  <div className="gen-batch-name">{formula.name || `Formula ${idx + 1}`}</div>
                  <div className="gen-batch-sub">
                    {isDone ? (
                      <span className="gen-saved-tag">
                        ✓ {completedBatches.find((b) => b.index === idx)?.count || 8} MCQs Verified & Saved
                      </span>
                    ) : isCurrentSaving ? (
                      'Saving verified batch to IndexedDB...'
                    ) : isCurrent ? (
                      'Generating diverse questions (Basic to Advanced)...'
                    ) : isCurrentPaused ? (
                      'Paused'
                    ) : (
                      'Waiting in queue'
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {hasMixed && (
            <div
              className={`gen-batch-row ${
                completedBatches.some((b) => b.index === formulas.length) ? 'done' : ''
              } ${
                currentBatchIndex === formulas.length && (status === 'generating' || status === 'saving')
                  ? 'active'
                  : ''
              }`}
            >
              <div className="gen-batch-indicator">
                {completedBatches.some((b) => b.index === formulas.length) ? (
                  <span className="gen-check-icon">✓</span>
                ) : currentBatchIndex === formulas.length && status === 'generating' ? (
                  <span className="gen-spinner-small" />
                ) : (
                  <span className="gen-number-icon">M</span>
                )}
              </div>
              <div className="gen-batch-details">
                <div className="gen-batch-name">Mixed Practice (Formulas Synthesized)</div>
                <div className="gen-batch-sub">
                  {completedBatches.some((b) => b.index === formulas.length) ? (
                    <span className="gen-saved-tag">
                      ✓ {completedBatches.find((b) => b.index === formulas.length)?.count} Mixed MCQs Verified
                    </span>
                  ) : currentBatchIndex === formulas.length && status === 'generating' ? (
                    'Synthesizing formulas with anonymous problem statements...'
                  ) : (
                    'Queued after formula batches'
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Total Questions Count Badge */}
        <div className="gen-count-banner">
          <span className="gen-count-num">{savedQuestionsCount}</span>
          <span className="gen-count-text">Questions Independently Verified in IndexedDB</span>
        </div>

        {/* Rate Limit / Error Banner */}
        {status === 'paused' && (
          <div className="gen-pause-banner" data-testid="pause-banner">
            <div className="gen-pause-icon">
              {pauseType === '429' ? '⏳' : pauseType === '503' ? '⚡' : '⚠️'}
            </div>
            <div className="gen-pause-body">
              <div className="gen-pause-title">
                {pauseType === '429'
                  ? 'Rate Limit Safeguard Active'
                  : pauseType === '503'
                    ? 'Service High Demand'
                    : 'Generation Notice'}
              </div>
              <p className="gen-pause-msg">{errorMessage}</p>
              {pauseType === '429' && cooldownSeconds > 0 && (
                <div className="gen-cooldown-clock">
                  Cooldown active: <strong>{cooldownSeconds}s remaining</strong>
                </div>
              )}
            </div>
            <div className="gen-pause-actions">
              <button
                type="button"
                className="btn-resume"
                onClick={handleResume}
                disabled={pauseType === '429' && cooldownSeconds > 0}
              >
                {pauseType === '429' && cooldownSeconds > 0
                  ? `Wait (${cooldownSeconds}s)`
                  : 'Resume Generation'}
              </button>
            </div>
          </div>
        )}

        {/* Completed State Actions */}
        {status === 'completed' && (
          <div className="gen-completed-banner" data-testid="completed-banner">
            <div className="gen-complete-badge">✓ Practice Set Ready!</div>
            <p className="gen-complete-msg">
              Successfully generated and deterministically verified {savedQuestionsCount} questions across{' '}
              {formulas.length} formulas {hasMixed ? 'plus Mixed Practice' : ''}.
            </p>
            <div className="gen-complete-actions">
              <button
                type="button"
                className="btn-start-practice"
                onClick={() => onComplete && onComplete({ sessionId: session.sessionId, totalQuestions: savedQuestionsCount })}
              >
                Begin Practice ({savedQuestionsCount} Questions) →
              </button>
            </div>
          </div>
        )}

        {/* Footer info / Cancel */}
        <div className="gen-footer">
          <span className="gen-footer-note">
            Google AI Studio Free Tier &bull; gemini-3.8-flash &bull; Zero Paid Resources
          </span>
          {status !== 'completed' && onCancel && (
            <button type="button" className="btn-cancel-gen" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
