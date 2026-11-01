/**
 * SessionCompletionModal.jsx — Tri-Action Practice Session Completion Dialog.
 *
 * Implements Section 7.3, 9.1 & Sub-Phase 4.4 of LearnWell M3 Phase 4 Architecture:
 * - Triggered when learner reaches question N and clicks "Review & Complete",
 *   or triggers completion from palette/toolbar.
 * - Computes:
 *   - N = Total questions
 *   - A = Answered questions (isCorrect: true or attempts.length > 0)
 *   - U = Unanswered questions (N - A)
 *   - R = Marked for review questions (isMarkedForReview: true)
 * - Scenario A (All answered, none marked: U === 0 && R === 0):
 *   - Direct confirmation prompt: "Ready to complete your practice session?"
 * - Scenario B (Unanswered or marked exist: U > 0 || R > 0):
 *   - Tri-action advisory dialog:
 *     1. [Review Unanswered (U)]: Navigates to first unanswered question (disabled if U === 0).
 *     2. [Review Marked (R)]: Navigates to first marked question (disabled if R === 0).
 *     3. [Complete Session Anyway]: Commits session completion.
 * - Non-blocking: learner is never forced to answer unattempted questions.
 * - Accessible modal with backdrop dismissal and Escape key binding.
 */

import React, { useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  Bookmark,
  HelpCircle,
  Flag,
} from 'lucide-react';
import './SessionCompletionModal.css';

export default function SessionCompletionModal({
  isOpen = false,
  onClose,
  questions = [],
  onConfirmComplete,
  onReviewUnanswered,
  onReviewMarked,
}) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

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
  const isAllAnsweredAndClean = unansweredCount === 0 && markedCount === 0;

  return (
    <div
      className="completion-modal-overlay"
      onClick={onClose}
      data-testid="completion-modal-overlay"
      role="presentation"
    >
      <div
        className="completion-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="completion-modal-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="completion-modal"
      >
        {/* Header */}
        <header className="completion-modal__header">
          <div className="completion-modal__title-group">
            <div
              className={`completion-modal__icon-wrap ${
                isAllAnsweredAndClean
                  ? 'completion-modal__icon-wrap--success'
                  : 'completion-modal__icon-wrap--advisory'
              }`}
            >
              {isAllAnsweredAndClean ? (
                <CheckCircle2 size={24} />
              ) : (
                <AlertTriangle size={24} />
              )}
            </div>
            <div>
              <h2 id="completion-modal-title" className="completion-modal__title">
                {isAllAnsweredAndClean
                  ? 'Ready to Complete Practice?'
                  : 'Session Review & Completion'}
              </h2>
              <p className="completion-modal__subtitle">
                {isAllAnsweredAndClean
                  ? 'All questions have been answered'
                  : 'Advisory summary before finalizing session'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="completion-modal__close-btn"
            onClick={onClose}
            aria-label="Close completion dialog"
            data-testid="completion-modal-close"
          >
            <X size={20} />
          </button>
        </header>

        {/* Modal Body */}
        <div className="completion-modal__body">
          {/* Metrics summary card */}
          <div className="completion-summary-card" data-testid="completion-summary-metrics">
            <div className="completion-metric">
              <span className="completion-metric__value">{answeredCount}</span>
              <span className="completion-metric__label">Answered</span>
            </div>
            <div className="completion-metric-divider" />
            <div className="completion-metric">
              <span className={`completion-metric__value ${unansweredCount > 0 ? 'completion-metric__value--warn' : ''}`}>
                {unansweredCount}
              </span>
              <span className="completion-metric__label">Unanswered</span>
            </div>
            <div className="completion-metric-divider" />
            <div className="completion-metric">
              <span className={`completion-metric__value ${markedCount > 0 ? 'completion-metric__value--purple' : ''}`}>
                {markedCount}
              </span>
              <span className="completion-metric__label">Marked for Review</span>
            </div>
            <div className="completion-metric-divider" />
            <div className="completion-metric">
              <span className="completion-metric__value">{totalQuestions}</span>
              <span className="completion-metric__label">Total</span>
            </div>
          </div>

          {/* Descriptive text */}
          <p className="completion-modal__desc">
            {isAllAnsweredAndClean ? (
              <span>
                You have completed all <strong>{totalQuestions}</strong> questions in this session.
                Completing will finalize your practice records and switch to review mode.
              </span>
            ) : (
              <span>
                You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions
                ({unansweredCount} unanswered, {markedCount} marked for review).
                Would you like to review them or complete the session now?
              </span>
            )}
          </p>
        </div>

        {/* Modal Actions */}
        <footer className="completion-modal__actions">
          {isAllAnsweredAndClean ? (
            /* Scenario A: Clean Completion */
            <div className="completion-actions-group">
              <button
                type="button"
                className="completion-btn completion-btn--secondary"
                onClick={onClose}
                data-testid="completion-cancel-btn"
              >
                <span>Return to Practice</span>
              </button>
              <button
                type="button"
                className="completion-btn completion-btn--primary"
                onClick={onConfirmComplete}
                data-testid="completion-confirm-btn"
              >
                <CheckCircle2 size={16} />
                <span>Complete Session</span>
              </button>
            </div>
          ) : (
            /* Scenario B: Tri-Action Advisory Dialog */
            <div className="completion-tri-actions">
              <div className="completion-tri-actions__top">
                {/* Action 1: Review Unanswered */}
                <button
                  type="button"
                  className="completion-action-card"
                  disabled={unansweredCount === 0}
                  onClick={() => {
                    if (onClose) onClose();
                    if (onReviewUnanswered) onReviewUnanswered();
                  }}
                  data-testid="completion-review-unanswered"
                  title={unansweredCount === 0 ? 'No unanswered questions' : 'Jump to first unanswered question'}
                >
                  <div className="completion-action-card__icon-wrap completion-action-card__icon-wrap--amber">
                    <HelpCircle size={18} />
                  </div>
                  <div className="completion-action-card__content">
                    <strong>Review Unanswered ({unansweredCount})</strong>
                    <span>Jump to the first unattempted question</span>
                  </div>
                  <ArrowRight size={16} className="completion-action-card__arrow" />
                </button>

                {/* Action 2: Review Marked */}
                <button
                  type="button"
                  className="completion-action-card"
                  disabled={markedCount === 0}
                  onClick={() => {
                    if (onClose) onClose();
                    if (onReviewMarked) onReviewMarked();
                  }}
                  data-testid="completion-review-marked"
                  title={markedCount === 0 ? 'No marked questions' : 'Jump to first marked-for-review question'}
                >
                  <div className="completion-action-card__icon-wrap completion-action-card__icon-wrap--purple">
                    <Bookmark size={18} />
                  </div>
                  <div className="completion-action-card__content">
                    <strong>Review Marked ({markedCount})</strong>
                    <span>Jump to bookmarked review questions</span>
                  </div>
                  <ArrowRight size={16} className="completion-action-card__arrow" />
                </button>
              </div>

              {/* Action 3: Complete Anyway & Cancel */}
              <div className="completion-tri-actions__bottom">
                <button
                  type="button"
                  className="completion-btn completion-btn--secondary"
                  onClick={onClose}
                  data-testid="completion-cancel-btn"
                >
                  <span>Keep Practicing</span>
                </button>
                <button
                  type="button"
                  className="completion-btn completion-btn--advisory"
                  onClick={onConfirmComplete}
                  data-testid="completion-confirm-anyway"
                >
                  <Flag size={15} />
                  <span>Complete Session Anyway</span>
                </button>
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
