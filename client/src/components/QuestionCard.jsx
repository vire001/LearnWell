/**
 * QuestionCard.jsx — Comprehensive Question Card with KaTeX & Multi-Attempt Support.
 *
 * Implements Section 5, 9.1 & Sub-Phase 4.2 of LearnWell M3 Phase 4 Architecture:
 * - Renders mathematical question statements with KaTeX inline and block expressions.
 * - Displays metadata header: difficulty badge, pattern tag, tested concept, and question counter.
 * - Renders exactly four options (A, B, C, D) using OptionCard.
 * - Binds keyboard shortcuts ('1'-'4' / 'A'-'D' or 'a'-'d') to option selection.
 * - Reflects immediate feedback:
 *   - Correct answers highlighted in green, locked from further selection.
 *   - Automatic elimination detection with dedicated banner and elimination badges.
 *   - Incorrect distractors marked as exhausted with strikethrough and inline learning guidance.
 * - Fully responsive with dark and light theme fidelity.
 */

import React, { useEffect, useCallback } from 'react';
import { Sparkles, BookOpen, Lightbulb, ChevronDown } from 'lucide-react';
import MathText from './MathText';
import OptionCard from './OptionCard';
import './QuestionCard.css';

/**
 * Format raw pattern identifiers into clean human-readable titles.
 */
function formatPattern(pattern) {
  if (!pattern) return '';
  return pattern
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function QuestionCard({
  question,
  questionNumber = 1,
  totalQuestions = 1,
  attemptState = {},
  onSelectOption,
  isReadOnly = false,
  isEvaluating = false,
  isHintOpen = false,
  onToggleHint,
}) {
  const {
    selectedOption = null,
    isLocked = false,
    exhaustedOptions = [],
    attempts = [],
  } = attemptState;

  // Keyboard shortcut listener ('1'-'4', 'A'-'D', 'a'-'d')
  const handleKeyDown = useCallback(
    (e) => {
      // Ignore if question is missing, locked, read-only, or currently evaluating
      if (!question || isLocked || isReadOnly || isEvaluating) {
        return;
      }

      // Ignore if user is inside an input, textarea, or other editable field
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      const key = e.key.toUpperCase();
      let targetOptionId = null;

      if (key === '1' || key === 'A') targetOptionId = 'A';
      else if (key === '2' || key === 'B') targetOptionId = 'B';
      else if (key === '3' || key === 'C') targetOptionId = 'C';
      else if (key === '4' || key === 'D') targetOptionId = 'D';

      if (targetOptionId && !exhaustedOptions.includes(targetOptionId)) {
        e.preventDefault();
        if (onSelectOption) {
          onSelectOption(targetOptionId);
        }
      }
    },
    [question, isLocked, isReadOnly, isEvaluating, exhaustedOptions, onSelectOption]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!question) {
    return (
      <div className="question-card question-card--loading" data-testid="question-card-loading">
        <p>Loading question...</p>
      </div>
    );
  }

  // Check if current question was solved via automatic elimination
  const isAutomaticElimination = attempts.some(
    (att) => att.resolutionMethod === 'automatic_elimination' && att.isCorrect
  );

  // Ensure exactly four options (A, B, C, D) in predictable order
  const orderedOptionIds = ['A', 'B', 'C', 'D'];
  const optionsMap = new Map((question.options || []).map((opt) => [opt.id, opt]));
  const renderedOptions = orderedOptionIds.map((id) => {
    return optionsMap.get(id) || { id, text: `Option ${id}` };
  });

  return (
    <article
      className={`question-card ${isLocked ? 'question-card--locked' : ''}`}
      aria-label={`Question ${questionNumber}`}
      data-testid="question-card"
    >
      {/* 1. Question Metadata Header */}
      <header className="question-card__meta">
        <div className="question-card__tags">
          {/* Difficulty Badge */}
          <span
            className={`question-pill question-pill--${
              question.difficulty || 'intermediate'
            }`}
          >
            {question.difficulty
              ? question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)
              : 'Intermediate'}
          </span>

          {/* Pattern Tag */}
          {question.pattern && (
            <span className="question-pill question-pill--pattern">
              {formatPattern(question.pattern)}
            </span>
          )}

          {/* Mixed Synthesis Indicator */}
          {question.formulaId === 'mixed' && (
            <span className="question-pill question-pill--mixed">
              Mixed Synthesis
            </span>
          )}
        </div>

        {/* Question Counter */}
        <span className="question-card__counter">
          Question {questionNumber} of {totalQuestions}
        </span>
      </header>

      {/* Tested Concept Bar */}
      {question.testedConcept && (
        <div className="question-card__concept" data-testid="question-tested-concept">
          <BookOpen size={14} className="question-card__concept-icon" />
          <span className="question-card__concept-label">Tested Concept:</span>
          <span className="question-card__concept-text">{question.testedConcept}</span>
        </div>
      )}

      {/* 2. Problem Statement with KaTeX Rendering */}
      <div className="question-card__statement" data-testid="question-statement">
        <MathText text={question.statement} block={false} />
      </div>

      {/* 3. Automatic Elimination Resolution Banner */}
      {isAutomaticElimination && (
        <div
          className="question-card__elimination-banner"
          data-testid="automatic-elimination-banner"
          role="status"
        >
          <Sparkles size={18} className="question-card__elimination-icon" />
          <div className="question-card__elimination-body">
            <strong>Deduction Complete:</strong> All 3 distractors were eliminated.
            Option {question.correctAnswer} is verified as the correct answer.
          </div>
        </div>
      )}

      {/* 4. Hint Accordion (Expandable constructive clue panel above options) */}
      {question.hint && (
        <div
          className={`question-card__hint-accordion ${
            isHintOpen ? 'question-card__hint-accordion--open' : ''
          }`}
          data-testid="hint-accordion"
        >
          <button
            type="button"
            className="question-card__hint-toggle"
            onClick={onToggleHint}
            aria-expanded={isHintOpen}
            data-testid="hint-toggle-btn"
          >
            <div className="question-card__hint-toggle-left">
              <Lightbulb size={16} className="question-card__hint-icon" />
              <span>
                {isHintOpen
                  ? 'Constructive Hint'
                  : 'Need a hint? Click to reveal constructive clue.'}
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`question-card__hint-chevron ${
                isHintOpen ? 'question-card__hint-chevron--open' : ''
              }`}
            />
          </button>

          {isHintOpen && (
            <div className="question-card__hint-body" data-testid="hint-content">
              <div className="question-card__hint-text">
                <MathText text={question.hint} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Options Grid: Exactly 4 Options (A, B, C, D) */}
      <div
        className="question-card__options-grid"
        role="group"
        aria-label="Answer options"
        data-testid="options-grid"
      >
        {renderedOptions.map((opt, idx) => {
          const isSelected = selectedOption === opt.id;
          // An option is marked correct if it matches correctAnswer and question is resolved/locked
          const isThisOptionCorrect = isLocked && opt.id === question.correctAnswer;
          const isExhausted = exhaustedOptions.includes(opt.id);
          const guidanceText = question.optionGuidance?.[opt.id] || '';

          return (
            <OptionCard
              key={opt.id}
              option={opt}
              index={idx}
              isSelected={isSelected}
              isCorrect={isThisOptionCorrect}
              isExhausted={isExhausted}
              isLocked={isLocked}
              isReadOnly={isReadOnly}
              isEvaluating={isEvaluating}
              isAutomaticElimination={isThisOptionCorrect && isAutomaticElimination}
              guidanceText={guidanceText}
              onSelect={onSelectOption}
            />
          );
        })}
      </div>

      {/* Evaluation In-Flight Indicator */}
      {isEvaluating && (
        <div className="question-card__evaluating-overlay" aria-live="polite">
          <div className="question-card__evaluating-spinner" />
          <span>Verifying answer...</span>
        </div>
      )}
    </article>
  );
}
