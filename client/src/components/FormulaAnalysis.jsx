/**
 * FormulaAnalysis.jsx — Formula Intelligence & AI Analysis result view.
 *
 * Displays pedagogical breakdown:
 * 1. Canonical Formula (with Copy button)
 * 2. Meaning & Intuition
 * 3. Conditions & Validity
 * 4. When to Use
 * 5. Recognition Clues
 * 6. Related Formulas
 * 7. Solved Example (expandable / collapsible)
 * 8. Common Mistakes
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Copy, Check, ChevronDown, ChevronUp,
  Sparkles, CheckCircle2, AlertTriangle, HelpCircle,
  RotateCcw, BookOpen, KeyRound, AlertCircle, Info,
} from 'lucide-react';
import MathView from './MathView';
import './FormulaAnalysis.css';

export default function FormulaAnalysis({
  analysis,
  submittedData,
  onReset,
  chapter,
}) {
  const [copied, setCopied] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(true);

  if (!analysis) return null;

  // Rejection / Not Math Case
  if (analysis.isMathFormula === false) {
    return (
      <div className="analysis-card analysis-card--rejected">
        <div className="analysis-rejected">
          <AlertCircle size={32} className="analysis-rejected__icon" />
          <h2 className="analysis-rejected__title">Input Could Not Be Analyzed</h2>
          <p className="analysis-rejected__desc">
            {analysis.rejectionReason ||
              'The submitted input does not appear to be a mathematical equation, theorem, or relevant concept.'}
          </p>
          <div className="analysis-rejected__actions">
            <button
              type="button"
              onClick={onReset}
              className="analysis-btn analysis-btn--primary"
            >
              <RotateCcw size={15} />
              <span>Try Again with a Formula</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    if (!analysis.canonicalFormula) return;
    try {
      await navigator.clipboard.writeText(analysis.canonicalFormula);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is blocked
    }
  };

  return (
    <div className="analysis-container">
      {/* 1. HERO CANONICAL FORMULA CARD */}
      <section className="analysis-section canonical-card">
        <div className="canonical-card__header">
          <div className="canonical-card__badge">
            <Sparkles size={13} />
            <span>Canonical Formula</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="canonical-card__copy-btn"
            title="Copy formula to clipboard"
            aria-label="Copy formula"
          >
            {copied ? (
              <>
                <Check size={14} className="canonical-card__copy-icon--check" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="canonical-card__formula-wrap">
          <MathView
            math={analysis.canonicalFormula}
            block
            className="canonical-card__formula"
          />
        </div>

        {submittedData?.imageUrl && (
          <div className="canonical-card__attachment-ref">
            <Info size={13} />
            <span>Extracted from attached reference image: {submittedData.imageName || 'screenshot'}</span>
          </div>
        )}
      </section>

      {/* 2. MEANING */}
      <section className="analysis-section">
        <div className="analysis-heading">
          <BookOpen size={17} className="analysis-heading__icon" />
          <h2 className="analysis-heading__title">Meaning & Intuition</h2>
        </div>
        <div className="analysis-card">
          <p className="analysis-text">{analysis.meaning}</p>
        </div>
      </section>

      {/* 3. CONDITIONS & RESTRICTIONS */}
      {analysis.conditions && analysis.conditions.length > 0 && (
        <section className="analysis-section">
          <div className="analysis-heading">
            <CheckCircle2 size={17} className="analysis-heading__icon analysis-heading__icon--green" />
            <h2 className="analysis-heading__title">Conditions & Validity</h2>
          </div>
          <div className="analysis-card">
            <ul className="conditions-list">
              {analysis.conditions.map((item, idx) => (
                <li key={idx} className="conditions-item">
                  <span className="conditions-bullet">&bull;</span>
                  <span className="conditions-text">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 4. WHEN TO USE */}
      {analysis.whenToUse && (
        <section className="analysis-section">
          <div className="analysis-heading">
            <HelpCircle size={17} className="analysis-heading__icon analysis-heading__icon--accent" />
            <h2 className="analysis-heading__title">When to Use</h2>
          </div>
          <div className="analysis-card">
            <p className="analysis-text">{analysis.whenToUse}</p>
          </div>
        </section>
      )}

      {/* 5. RECOGNITION CLUES */}
      {analysis.recognitionClues && analysis.recognitionClues.length > 0 && (
        <section className="analysis-section">
          <div className="analysis-heading">
            <KeyRound size={17} className="analysis-heading__icon analysis-heading__icon--amber" />
            <h2 className="analysis-heading__title">Recognition Clues</h2>
          </div>
          <div className="analysis-card">
            <div className="clues-grid">
              {analysis.recognitionClues.map((clue, idx) => (
                <div key={idx} className="clue-chip">
                  <span className="clue-chip__num">#{idx + 1}</span>
                  <span className="clue-chip__text">{clue}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. RELATED FORMULAS */}
      {analysis.relatedFormulas && analysis.relatedFormulas.length > 0 && (
        <section className="analysis-section">
          <div className="analysis-heading">
            <Sparkles size={17} className="analysis-heading__icon" />
            <h2 className="analysis-heading__title">Related Formulas</h2>
          </div>
          <div className="analysis-card">
            <div className="related-formulas-grid">
              {analysis.relatedFormulas.map((formula, idx) => (
                <div key={idx} className="related-formula-item">
                  <MathView math={formula} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. SOLVED EXAMPLE (COLLAPSIBLE) */}
      {analysis.solvedExample && (
        <section className="analysis-section">
          <div className="solved-example-header">
            <div className="analysis-heading">
              <CheckCircle2 size={17} className="analysis-heading__icon analysis-heading__icon--accent" />
              <h2 className="analysis-heading__title">Step-by-Step Solved Example</h2>
            </div>
            <button
              type="button"
              className="solved-example-toggle"
              onClick={() => setExampleOpen((prev) => !prev)}
              aria-expanded={exampleOpen}
            >
              <span>{exampleOpen ? 'Collapse' : 'Expand Example'}</span>
              {exampleOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>

          {exampleOpen && (
            <div className="analysis-card solved-example-card">
              <div className="example-problem">
                <span className="example-problem__tag">Practice Problem</span>
                <p className="example-problem__text">{analysis.solvedExample.problem}</p>
              </div>

              {analysis.solvedExample.stepByStep && analysis.solvedExample.stepByStep.length > 0 && (
                <div className="example-steps">
                  <h3 className="example-steps__heading">Solution Steps:</h3>
                  <ol className="example-steps__list">
                    {analysis.solvedExample.stepByStep.map((step, idx) => (
                      <li key={idx} className="example-step">
                        <span className="example-step__num">Step {idx + 1}</span>
                        <div className="example-step__content">
                          <MathView math={step} />
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {analysis.solvedExample.finalAnswer && (
                <div className="example-answer">
                  <span className="example-answer__tag">Final Answer</span>
                  <div className="example-answer__text">
                    <MathView math={analysis.solvedExample.finalAnswer} />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 8. COMMON MISTAKES */}
      {analysis.commonMistakes && analysis.commonMistakes.length > 0 && (
        <section className="analysis-section">
          <div className="analysis-heading">
            <AlertTriangle size={17} className="analysis-heading__icon analysis-heading__icon--warning" />
            <h2 className="analysis-heading__title">Common Mistakes to Avoid</h2>
          </div>
          <div className="analysis-card analysis-card--mistakes">
            <ul className="mistakes-list">
              {analysis.commonMistakes.map((mistake, idx) => (
                <li key={idx} className="mistake-item">
                  <span className="mistake-item__bullet">&times;</span>
                  <span className="mistake-item__text">{mistake}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* BOTTOM ACTIONS */}
      <footer className="analysis-actions">
        <button
          type="button"
          onClick={onReset}
          className="analysis-btn analysis-btn--primary"
        >
          <RotateCcw size={15} />
          <span>Submit Another Formula</span>
        </button>

        {chapter && (
          <Link
            to={`/subjects/mathematics/${chapter.id}`}
            className="analysis-btn analysis-btn--secondary"
          >
            <span>Choose Another Topic in {chapter.title}</span>
          </Link>
        )}
      </footer>
    </div>
  );
}
