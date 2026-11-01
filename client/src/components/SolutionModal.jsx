/**
 * SolutionModal.jsx — Step-by-Step Mathematical Solution Modal.
 *
 * Implements Section 4, 9.1 & Sub-Phase 4.3 of LearnWell M3 Phase 4 Architecture:
 * - Displays complete verified mathematical derivation (`stepByStep` array).
 * - Highlights final verified answer callout with KaTeX math rendering.
 * - Accessible modal dialog with backdrop dismissal and Escape key binding.
 * - Non-judgmental, purely mathematical tone.
 * - Supports dark and light themes cleanly.
 */

import React, { useEffect, useCallback } from 'react';
import { FileText, X, CheckCircle2 } from 'lucide-react';
import MathText from './MathText';
import './SolutionModal.css';

export default function SolutionModal({
  isOpen,
  onClose,
  solution,
  testedConcept = '',
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
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !solution) {
    return null;
  }

  const steps = solution.stepByStep || [];
  const finalAnswer = solution.finalAnswer || '';

  return (
    <div
      className="solution-modal-overlay"
      onClick={onClose}
      data-testid="solution-modal-overlay"
      role="presentation"
    >
      <div
        className="solution-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="solution-modal-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="solution-modal"
      >
        {/* Header */}
        <header className="solution-modal__header">
          <div className="solution-modal__title-group">
            <div className="solution-modal__icon-wrap">
              <FileText size={20} className="solution-modal__icon" />
            </div>
            <div>
              <h2 id="solution-modal-title" className="solution-modal__title">
                Step-by-Step Solution
              </h2>
              {testedConcept && (
                <p className="solution-modal__concept">{testedConcept}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            className="solution-modal__close-btn"
            onClick={onClose}
            aria-label="Close solution modal"
            data-testid="solution-modal-close"
          >
            <X size={20} />
          </button>
        </header>

        {/* Modal Body */}
        <div className="solution-modal__body">
          {/* Step-by-Step Derivation */}
          <div className="solution-modal__section">
            <h3 className="solution-modal__section-heading">Mathematical Derivation</h3>
            {steps.length === 0 ? (
              <p className="solution-modal__empty">No derivation steps provided.</p>
            ) : (
              <ol className="solution-steps-list">
                {steps.map((step, idx) => (
                  <li key={idx} className="solution-step-item">
                    <span className="solution-step-item__badge">
                      Step {idx + 1}
                    </span>
                    <div className="solution-step-item__content">
                      <MathText text={step} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Final Verified Answer Callout */}
          {finalAnswer && (
            <div className="solution-final-box" data-testid="solution-final-answer">
              <div className="solution-final-box__header">
                <CheckCircle2 size={16} className="solution-final-box__icon" />
                <span className="solution-final-box__label">Final Verified Answer</span>
              </div>
              <div className="solution-final-box__content">
                <MathText text={finalAnswer} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="solution-modal__footer">
          <button
            type="button"
            className="solution-modal__btn-done"
            onClick={onClose}
          >
            Done Reviewing
          </button>
        </footer>
      </div>
    </div>
  );
}
