/**
 * OptionCard.jsx — Interactive Option Card with Shortcut & State Styling.
 *
 * Implements Section 5.3 & Sub-Phase 4.2 of LearnWell M3 Phase 4 Architecture:
 * - Renders single multiple-choice option (A, B, C, D) with KaTeX math support.
 * - Displays keyboard shortcut hint ([A] / [1..4]).
 * - Visual feedback states:
 *   - Normal / interactive
 *   - Correct: Green success theme, CheckCircle icon, and optional Automatic Elimination badge.
 *   - Exhausted (Incorrect distractor): Strikethrough, XCircle icon, disabled interaction.
 *   - Learning Guidance: Automatically expands for exhausted distractors explaining the mathematical pitfall.
 *   - Locked / Read-only: Disabled from further input.
 */

import React from 'react';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import MathText from './MathText';
import './OptionCard.css';

export default function OptionCard({
  option,
  index = 0,
  isSelected = false,
  isCorrect = false,
  isExhausted = false,
  isLocked = false,
  isReadOnly = false,
  isEvaluating = false,
  isAutomaticElimination = false,
  guidanceText = '',
  onSelect,
}) {
  const isDisabled = isLocked || isReadOnly || isEvaluating || isExhausted;

  const handleClick = (e) => {
    e.preventDefault();
    if (!isDisabled && onSelect) {
      onSelect(option.id);
    }
  };

  // State class determination
  let stateClass = 'option-card--default';
  if (isCorrect) {
    stateClass = 'option-card--correct';
  } else if (isExhausted) {
    stateClass = 'option-card--exhausted';
  } else if (isLocked || isReadOnly) {
    stateClass = 'option-card--locked';
  }

  const shortcutNumber = index + 1;

  return (
    <div
      className={`option-card-wrapper ${stateClass} ${isDisabled ? 'option-card-wrapper--disabled' : ''}`}
      data-testid={`option-card-${option.id}`}
      data-option-id={option.id}
    >
      <button
        type="button"
        className={`option-card ${stateClass}`}
        onClick={handleClick}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-pressed={isSelected}
        aria-label={`Option ${option.id}: ${option.text}`}
      >
        {/* Letter Badge & Shortcut Indicator */}
        <div className="option-card__indicator-wrap">
          <span className="option-card__letter" aria-hidden="true">
            {option.id}
          </span>
          {!isLocked && !isReadOnly && (
            <span
              className="option-card__shortcut-badge"
              title={`Keyboard shortcut: press ${option.id} or ${shortcutNumber}`}
              aria-hidden="true"
            >
              {option.id}
            </span>
          )}
        </div>

        {/* Option Text with KaTeX Rendering */}
        <div className="option-card__content">
          <div className={`option-card__text ${isExhausted ? 'option-card__text--strikethrough' : ''}`}>
            <MathText text={option.text} />
          </div>

          {/* Correct badge (especially for automatic elimination) */}
          {isCorrect && (
            <div className="option-card__correct-badge" data-testid="option-correct-badge">
              <CheckCircle2 size={16} className="option-card__icon--correct" />
              <span>
                {isAutomaticElimination
                  ? '✓ Correct by Process of Elimination'
                  : '✓ Correct Answer'}
              </span>
            </div>
          )}

          {/* Strikethrough indicator for exhausted distractors */}
          {isExhausted && !isCorrect && (
            <div className="option-card__eliminated-tag">
              <XCircle size={14} className="option-card__icon--incorrect" />
              <span>Eliminated</span>
            </div>
          )}
        </div>
      </button>

      {/* Option-Specific Learning Guidance (automatically expanded on incorrect selection) */}
      {isExhausted && guidanceText && (
        <div
          className="option-card__guidance"
          data-testid={`option-guidance-${option.id}`}
          role="region"
          aria-label={`Learning guidance for Option ${option.id}`}
        >
          <div className="option-card__guidance-header">
            <Lightbulb size={15} className="option-card__guidance-icon" />
            <span className="option-card__guidance-title">Learning Guidance</span>
          </div>
          <div className="option-card__guidance-body">
            <MathText text={guidanceText} />
          </div>
        </div>
      )}
    </div>
  );
}
