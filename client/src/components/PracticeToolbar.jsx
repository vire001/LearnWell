/**
 * PracticeToolbar.jsx — Interactive Bottom Control & Tools Action Bar.
 *
 * Implements Section 3.1, 7, 9.1 & Sub-Phase 4.4 of LearnWell M3 Phase 4 Architecture:
 * - Left: Previous Question button (enabled when currentQuestionIndex > 0).
 * - Center:
 *   - Learning Tools Triad: [💡 Hint], [🧭 Guide Me], [📜 Solution] with viewed indicator badges.
 *   - Mark for Review toggle button with active purple indicator.
 * - Right:
 *   - Question Palette trigger button [⊞ Question K of N].
 *   - Next Question / Review & Complete button:
 *     - When on question 1..(N-1): renders [Next ❯] navigating to next question.
 *     - When on final question N: renders [Review & Complete ✓] triggering completion evaluation.
 * - Accessible with keyboard navigation, aria labels, and responsive layout.
 */

import React from 'react';
import {
  Lightbulb,
  Compass,
  FileText,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  LayoutGrid,
  CheckCircle2,
} from 'lucide-react';
import './PracticeToolbar.css';

export default function PracticeToolbar({
  currentQuestionIndex = 0,
  totalQuestions = 1,
  attemptState = {},
  isHintOpen = false,
  onOpenHint,
  onOpenGuideMe,
  onOpenSolution,
  onPrevious,
  onNext,
  onOpenPalette,
  onToggleMarkForReview,
  isReadOnly = false,
}) {
  const {
    hintViewed = false,
    guideMeViewed = false,
    solutionViewed = false,
    isMarkedForReview = false,
  } = attemptState;

  const isFirst = currentQuestionIndex <= 0;
  const isLast = currentQuestionIndex >= totalQuestions - 1;

  return (
    <nav
      className="practice-toolbar"
      aria-label="Practice Controls and Learning Tools"
      data-testid="practice-toolbar"
    >
      {/* Left: Previous Question */}
      <div className="practice-toolbar__nav-group">
        <button
          type="button"
          className="practice-btn-toolbar"
          disabled={isFirst}
          onClick={onPrevious}
          title={isFirst ? 'You are on the first question' : 'Go to previous question'}
          aria-label="Previous Question"
          data-testid="nav-btn-prev"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>
      </div>

      {/* Center: Learning Tools Triad + Mark for Review */}
      <div
        className="practice-toolbar__tools"
        role="toolbar"
        aria-label="Learning Assistance Tools"
      >
        {/* 1. Hint Button */}
        <button
          type="button"
          className={`practice-tool-btn ${
            isHintOpen ? 'practice-tool-btn--active' : ''
          } ${hintViewed ? 'practice-tool-btn--viewed' : ''}`}
          onClick={onOpenHint}
          data-testid="tool-btn-hint"
          aria-expanded={isHintOpen}
          title="Toggle constructive hint clue"
        >
          <Lightbulb size={16} className="practice-tool-btn__icon" />
          <span className="practice-tool-btn__label">Hint</span>
          {hintViewed && (
            <span
              className="practice-tool-btn__badge"
              data-testid="hint-viewed-badge"
              title="Hint viewed"
            >
              Viewed
            </span>
          )}
        </button>

        {/* 2. Guide Me Button */}
        <button
          type="button"
          className={`practice-tool-btn ${
            guideMeViewed ? 'practice-tool-btn--viewed' : ''
          }`}
          onClick={onOpenGuideMe}
          data-testid="tool-btn-guide-me"
          title="Open 4-part structured mathematical coaching"
        >
          <Compass size={16} className="practice-tool-btn__icon" />
          <span className="practice-tool-btn__label">Guide Me</span>
          {guideMeViewed && (
            <span
              className="practice-tool-btn__badge"
              data-testid="guideme-viewed-badge"
              title="Guide Me viewed"
            >
              Viewed
            </span>
          )}
        </button>

        {/* 3. Solution Button */}
        <button
          type="button"
          className={`practice-tool-btn ${
            solutionViewed ? 'practice-tool-btn--viewed' : ''
          }`}
          onClick={onOpenSolution}
          data-testid="tool-btn-solution"
          title="Open step-by-step mathematical derivation"
        >
          <FileText size={16} className="practice-tool-btn__icon" />
          <span className="practice-tool-btn__label">Solution</span>
          {solutionViewed && (
            <span
              className="practice-tool-btn__badge"
              data-testid="solution-viewed-badge"
              title="Solution viewed"
            >
              Viewed
            </span>
          )}
        </button>

        {/* 4. Mark for Review Toggle */}
        <button
          type="button"
          className={`practice-tool-btn ${
            isMarkedForReview ? 'practice-tool-btn--marked' : ''
          }`}
          onClick={onToggleMarkForReview}
          data-testid="tool-btn-review"
          aria-pressed={isMarkedForReview}
          title={isMarkedForReview ? 'Remove question bookmark' : 'Bookmark question for later review'}
        >
          <Bookmark size={15} className="practice-tool-btn__icon" />
          <span className="practice-tool-btn__label">
            {isMarkedForReview ? 'Marked' : 'Review'}
          </span>
        </button>
      </div>

      {/* Right: Question Palette Trigger & Next / Complete */}
      <div className="practice-toolbar__nav-group">
        {/* Palette Jump Trigger */}
        <button
          type="button"
          className="practice-toolbar__palette-btn"
          onClick={onOpenPalette}
          title="Open Question Palette grid"
          aria-label="Open Question Palette"
          data-testid="toolbar-palette-btn"
        >
          <LayoutGrid size={15} />
          <span>
            {currentQuestionIndex + 1} / {totalQuestions}
          </span>
        </button>

        {/* Next or Review & Complete Button */}
        {!isReadOnly && isLast ? (
          <button
            type="button"
            className="practice-btn-toolbar practice-btn-toolbar--complete"
            onClick={onNext}
            title="Review questions and complete practice session"
            aria-label="Review and Complete Session"
            data-testid="nav-btn-complete"
          >
            <CheckCircle2 size={16} />
            <span>Review & Complete</span>
          </button>
        ) : (
          <button
            type="button"
            className="practice-btn-toolbar practice-btn-toolbar--primary"
            disabled={isLast}
            onClick={onNext}
            title={isLast ? 'You are on the last question' : 'Go to next question'}
            aria-label="Next Question"
            data-testid="nav-btn-next"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </nav>
  );
}
