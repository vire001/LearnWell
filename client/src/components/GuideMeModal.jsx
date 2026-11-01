/**
 * GuideMeModal.jsx — Four-Part Constructive Coaching Drawer/Modal.
 *
 * Implements Section 4.1, 9.1 & Sub-Phase 4.3 of LearnWell M3 Phase 4 Architecture:
 * - Renders 4 forward-looking pedagogical quadrants:
 *   1. What to Think: Cognitive framing and pattern recognition cues.
 *   2. How to Approach: Step-by-step actionable problem-solving plan.
 *   3. Remember This: Fundamental identity, theorem condition, or domain constraint.
 *   4. Apply Next Time: Generalizable strategy for future problems.
 * - Strict Pedagogical Rule: Zero negative or judgmental language.
 * - Full KaTeX math support in all sections.
 * - Accessible modal dialog with backdrop dismissal and Escape key binding.
 * - Dark and light theme fidelity.
 */

import React, { useEffect, useCallback } from 'react';
import {
  Compass,
  X,
  Lightbulb,
  Workflow,
  BookmarkCheck,
  Rocket,
} from 'lucide-react';
import MathText from './MathText';
import './GuideMeModal.css';

export default function GuideMeModal({
  isOpen,
  onClose,
  guideMe,
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
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !guideMe) {
    return null;
  }

  const {
    whatToThink = '',
    howToApproach = '',
    rememberThis = '',
    applyNextTime = '',
  } = guideMe;

  return (
    <div
      className="guide-me-modal-overlay"
      onClick={onClose}
      data-testid="guide-me-modal-overlay"
      role="presentation"
    >
      <div
        className="guide-me-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-me-modal-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="guide-me-modal"
      >
        {/* Header */}
        <header className="guide-me-modal__header">
          <div className="guide-me-modal__title-group">
            <div className="guide-me-modal__icon-wrap">
              <Compass size={22} className="guide-me-modal__icon" />
            </div>
            <div>
              <h2 id="guide-me-modal-title" className="guide-me-modal__title">
                Guide Me — Structured Coaching
              </h2>
              <p className="guide-me-modal__subtitle">
                {testedConcept || 'Constructive, forward-looking mathematical problem solving'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="guide-me-modal__close-btn"
            onClick={onClose}
            aria-label="Close guide me modal"
            data-testid="guide-me-modal-close"
          >
            <X size={20} />
          </button>
        </header>

        {/* 4 Quadrants Body */}
        <div className="guide-me-modal__body">
          <div className="guide-me-grid">
            {/* 1. What to Think */}
            <div className="guide-me-card guide-me-card--think" data-testid="guide-me-think">
              <div className="guide-me-card__header">
                <div className="guide-me-card__icon-badge">
                  <Lightbulb size={16} />
                </div>
                <h3 className="guide-me-card__title">1. What to Think</h3>
              </div>
              <p className="guide-me-card__role">Cognitive Framing & Pattern Recognition</p>
              <div className="guide-me-card__content">
                <MathText text={whatToThink || 'Focus on the given structure and identify the fundamental variables.'} />
              </div>
            </div>

            {/* 2. How to Approach */}
            <div className="guide-me-card guide-me-card--approach" data-testid="guide-me-approach">
              <div className="guide-me-card__header">
                <div className="guide-me-card__icon-badge">
                  <Workflow size={16} />
                </div>
                <h3 className="guide-me-card__title">2. How to Approach</h3>
              </div>
              <p className="guide-me-card__role">Actionable Step-by-Step Algorithm</p>
              <div className="guide-me-card__content">
                <MathText text={howToApproach || 'Isolate known quantities, formulate the mathematical relationship, and solve sequentially.'} />
              </div>
            </div>

            {/* 3. Remember This */}
            <div className="guide-me-card guide-me-card--remember" data-testid="guide-me-remember">
              <div className="guide-me-card__header">
                <div className="guide-me-card__icon-badge">
                  <BookmarkCheck size={16} />
                </div>
                <h3 className="guide-me-card__title">3. Remember This</h3>
              </div>
              <p className="guide-me-card__role">Core Identity & Mathematical Condition</p>
              <div className="guide-me-card__content">
                <MathText text={rememberThis || 'Check domain constraints and ensure sign consistency.'} />
              </div>
            </div>

            {/* 4. Apply Next Time */}
            <div className="guide-me-card guide-me-card--apply" data-testid="guide-me-apply">
              <div className="guide-me-card__header">
                <div className="guide-me-card__icon-badge">
                  <Rocket size={16} />
                </div>
                <h3 className="guide-me-card__title">4. Apply Next Time</h3>
              </div>
              <p className="guide-me-card__role">Generalizable Examination Strategy</p>
              <div className="guide-me-card__content">
                <MathText text={applyNextTime || 'When encountering similar forms, start by establishing discriminant conditions.'} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="guide-me-modal__footer">
          <button
            type="button"
            className="guide-me-modal__btn-ready"
            onClick={onClose}
          >
            I'm Ready to Try
          </button>
        </footer>
      </div>
    </div>
  );
}
