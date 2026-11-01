/**
 * PracticeHeader.jsx — Header and tracker for Interactive Practice Workbench.
 *
 * Implements Section 3.1 & 5.C of LearnWell M3 Phase 4 Architecture:
 * - Breadcrumb navigation (Mathematics > Chapter > Topic).
 * - Active learner scoping indicator.
 * - Question counter ("Question K of N") with visual progress bar.
 * - Static dwell timer placeholder (active timer deferred to attempt engine).
 * - Mixed Practice Anonymity Enforcement: When formulaId === 'mixed',
 *   displays "Mixed Practice (Synthesized Formulas)" with zero exposure
 *   of formula names or IDs.
 * - Mark for Review placeholder (active toggle deferred to Sub-Phase 4.4).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Clock, Bookmark, User } from 'lucide-react';
import './PracticeHeader.css';

export default function PracticeHeader({
  session,
  currentQuestionIndex = 0,
  totalQuestions = 0,
  currentQuestion = null,
  isMarkedForReview = false,
  isReadOnly = false,
  learnerName = 'Learner',
  onToggleMarkForReview,
}) {
  const chapterTitle = session?.chapterTitle || 'Mathematics';
  const topicTitle = session?.topicTitle || 'Practice';
  const chapterId = session?.chapterId;
  const topicId = session?.topicId;

  // Mixed Practice Anonymity Enforcement (Section 5.C)
  const isMixed = currentQuestion?.formulaId === 'mixed';
  let formulaContextLabel = '';
  if (isMixed) {
    formulaContextLabel = 'Mixed Practice (Synthesized Formulas)';
  } else if (currentQuestion?.formulaId) {
    const matched = session?.formulas?.find((f) => f.id === currentQuestion.formulaId);
    formulaContextLabel = matched?.name || `Formula ${currentQuestion.formulaId}`;
  }

  const currentDisplayNumber = totalQuestions > 0 ? currentQuestionIndex + 1 : 0;
  const progressPercent =
    totalQuestions > 0 ? Math.min(100, Math.round((currentDisplayNumber / totalQuestions) * 100)) : 0;

  return (
    <header className="practice-header">
      {/* Top Row: Navigation Breadcrumbs, Learner Tag & Session Status */}
      <div className="practice-header__top">
        <div className="practice-header__nav">
          <Link
            to={chapterId && topicId ? `/subjects/mathematics/${chapterId}/${topicId}` : '/practice'}
            className="practice-header__back-btn"
            title="Back to Topic / Practice Home"
          >
            <ArrowLeft size={15} />
            <span>Exit Practice</span>
          </Link>

          <nav className="practice-header__breadcrumbs" aria-label="Breadcrumb">
            <Link to="/subjects/mathematics" className="practice-header__crumb">
              Mathematics
            </Link>
            <ChevronRight size={12} className="practice-header__crumb-sep" />
            {chapterId ? (
              <Link to={`/subjects/mathematics/${chapterId}`} className="practice-header__crumb">
                {chapterTitle}
              </Link>
            ) : (
              <span className="practice-header__crumb">{chapterTitle}</span>
            )}
            <ChevronRight size={12} className="practice-header__crumb-sep" />
            <span className="practice-header__crumb practice-header__crumb--active">
              {topicTitle}
            </span>
          </nav>
        </div>

        <div className="practice-header__meta">
          <div className="practice-header__learner-badge" title="Active Learner Profile">
            <User size={13} />
            <span>Learner: <strong>{learnerName}</strong></span>
          </div>

          {isReadOnly && (
            <span className="practice-header__readonly-pill">
              Completed Session
            </span>
          )}
        </div>
      </div>

      {/* Middle Row: Question Tracker & Controls */}
      <div className="practice-header__controls">
        <div className="practice-header__tracker">
          <div className="practice-header__counter">
            <span className="practice-header__q-current">Question {currentDisplayNumber}</span>
            <span className="practice-header__q-total">of {totalQuestions}</span>
          </div>

          <div
            className="practice-header__progress-track"
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="practice-header__progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="practice-header__right-actions">
          {/* Static Dwell Timer Placeholder (Active tracking connects in Sub-Phase 4.2 / 4.4) */}
          <div className="practice-header__timer" title="Active timer will connect in Sub-Phase 4.2">
            <Clock size={15} />
            <span>00:00</span>
          </div>

          {/* Mark for Review Button */}
          <button
            type="button"
            className={`practice-header__review-btn ${
              isMarkedForReview ? 'practice-header__review-btn--marked' : ''
            }`}
            disabled={isReadOnly}
            onClick={onToggleMarkForReview}
            aria-pressed={isMarkedForReview}
            title={isMarkedForReview ? 'Remove question bookmark' : 'Bookmark question for later review'}
            data-testid="header-review-btn"
          >
            <Bookmark size={15} className="practice-header__bookmark-icon" />
            <span>{isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}</span>
          </button>
        </div>
      </div>

      {/* Context Row: Formula Context with Mixed Practice Anonymity Enforcement */}
      {formulaContextLabel && (
        <div className="practice-header__context">
          <span className="practice-header__context-label">Practicing:</span>
          <span
            className={`practice-header__context-pill ${
              isMixed ? 'practice-header__context-pill--mixed' : ''
            }`}
            data-testid="formula-context-tag"
          >
            {formulaContextLabel}
          </span>
        </div>
      )}
    </header>
  );
}
