/**
 * QuestionPalette.jsx — Slide-Out Grid Navigation & Status Drawer.
 *
 * Implements Section 7, 9.1 & Sub-Phase 4.4 of LearnWell M3 Phase 4 Architecture:
 * - Displays an interactive grid of question tiles 1..N.
 * - Shows visual mastery/attempt indicators:
 *   - Active (currently viewed question, blue focus ring)
 *   - Correct (solved independently or assisted, green fill)
 *   - Incorrect / In Progress (distractor exhausted without resolution, amber/red)
 *   - Marked for Review (purple bookmark indicator)
 *   - Unanswered (clean neutral border)
 * - Header displays live summary metrics (Total, Answered, Marked, Unanswered).
 * - One-click jump to any question 1..N, closing the palette and persisting position.
 * - Non-blocking: unattempted questions can be skipped freely.
 * - Accessible with Escape key dismiss and backdrop click.
 */

import React, { useEffect, useCallback } from 'react';
import {
  LayoutGrid,
  X,
  Bookmark,
  Check,
} from 'lucide-react';
import './QuestionPalette.css';

export default function QuestionPalette({
  isOpen = false,
  onClose,
  questions = [],
  currentQuestionIndex = 0,
  onSelectQuestion,
  onOpenCompletion,
  isReadOnly = false,
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

  // Compute status summary metrics
  let answeredCount = 0;
  let markedCount = 0;

  questions.forEach((q) => {
    const state = q.attemptState || {};
    const isResolved = Boolean(state.isLocked || state.isCorrect);
    if (isResolved) answeredCount += 1;
    if (state.isMarkedForReview) markedCount += 1;
  });

  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div
      className="question-palette-overlay"
      onClick={onClose}
      data-testid="question-palette-overlay"
      role="presentation"
    >
      <aside
        className="question-palette-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-palette-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="question-palette"
      >
        {/* Drawer Header */}
        <header className="question-palette__header">
          <div className="question-palette__title-wrap">
            <LayoutGrid size={20} className="question-palette__title-icon" />
            <div>
              <h2 id="question-palette-title" className="question-palette__title">
                Question Palette
              </h2>
              <p className="question-palette__subtitle">
                {isReadOnly
                  ? 'Review Mode — Jump to any question'
                  : 'Navigate or jump to any question in this session'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="question-palette__close-btn"
            onClick={onClose}
            aria-label="Close question palette"
            data-testid="question-palette-close"
          >
            <X size={20} />
          </button>
        </header>

        {/* Live Summary Bar */}
        <div className="question-palette__summary" data-testid="palette-summary">
          <div className="palette-summary-pill palette-summary-pill--total">
            <span className="palette-summary-pill__label">Total</span>
            <span className="palette-summary-pill__value">{totalQuestions}</span>
          </div>
          <div className="palette-summary-pill palette-summary-pill--answered">
            <span className="palette-summary-pill__label">Answered</span>
            <span className="palette-summary-pill__value">{answeredCount}</span>
          </div>
          <div className="palette-summary-pill palette-summary-pill--marked">
            <span className="palette-summary-pill__label">Marked</span>
            <span className="palette-summary-pill__value">{markedCount}</span>
          </div>
          <div className="palette-summary-pill palette-summary-pill--unanswered">
            <span className="palette-summary-pill__label">Unanswered</span>
            <span className="palette-summary-pill__value">{unansweredCount}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="question-palette__legend" aria-label="Palette Status Legend">
          <div className="palette-legend-item">
            <span className="palette-legend-badge palette-legend-badge--current" />
            <span>Current</span>
          </div>
          <div className="palette-legend-item">
            <span className="palette-legend-badge palette-legend-badge--correct" />
            <span>Correct</span>
          </div>
          <div className="palette-legend-item">
            <span className="palette-legend-badge palette-legend-badge--incorrect" />
            <span>Incorrect</span>
          </div>
          <div className="palette-legend-item">
            <span className="palette-legend-badge palette-legend-badge--marked">
              <Bookmark size={10} />
            </span>
            <span>Marked</span>
          </div>
          <div className="palette-legend-item">
            <span className="palette-legend-badge palette-legend-badge--unattempted" />
            <span>Unanswered</span>
          </div>
        </div>

        {/* Questions Grid */}
        <div className="question-palette__grid" role="group" aria-label="Questions list">
          {questions.map((q, index) => {
            const state = q.attemptState || {};
            const isCurrent = index === currentQuestionIndex;
            const isMarked = Boolean(state.isMarkedForReview);
            const isCorrect = Boolean(state.isCorrect);
            const isUnattempted = !isCorrect && (!state.attempts || state.attempts.length === 0);
            const isIncorrect = !isCorrect && !isUnattempted;

            let statusClass = 'palette-tile--unattempted';
            let statusLabel = 'Unanswered';

            if (isCorrect) {
              statusClass = 'palette-tile--correct';
              statusLabel = 'Correct';
            } else if (isIncorrect) {
              statusClass = 'palette-tile--incorrect';
              statusLabel = 'Incorrect';
            }

            return (
              <button
                key={q.questionId || index}
                type="button"
                className={`palette-tile ${statusClass} ${
                  isCurrent ? 'palette-tile--current' : ''
                } ${isMarked ? 'palette-tile--marked' : ''}`}
                onClick={() => {
                  if (onSelectQuestion) {
                    onSelectQuestion(index);
                  }
                  if (onClose) {
                    onClose();
                  }
                }}
                data-testid={`palette-tile-${index + 1}`}
                aria-label={`Question ${index + 1}: ${statusLabel}${isMarked ? ', Marked for review' : ''}${isCurrent ? ' (Current)' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="palette-tile__number">{index + 1}</span>

                {isMarked && (
                  <span
                    className="palette-tile__bookmark-icon"
                    title="Marked for Review"
                    data-testid={`palette-tile-bookmark-${index + 1}`}
                  >
                    <Bookmark size={10} />
                  </span>
                )}

                {isCorrect && (
                  <span className="palette-tile__status-icon" title="Correct">
                    <Check size={10} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Drawer Footer Actions */}
        {!isReadOnly && onOpenCompletion && (
          <footer className="question-palette__footer">
            <button
              type="button"
              className="palette-footer-btn"
              onClick={() => {
                if (onClose) onClose();
                onOpenCompletion();
              }}
              data-testid="palette-complete-btn"
            >
              <span>Review & Complete Session</span>
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
