/**
 * FormulaInput.jsx — Formula & Concept Input Page for chosen Topic.
 *
 * Route: /subjects/mathematics/:chapterId/:topicId
 * Features:
 *  - Stage 1: Unified chat-style composer (text + image attachment + voice placeholder)
 *  - Stage 2: Editable Confirmation Preview enforcing strict 1–5 formula rules
 *  - Stage 3: IndexedDB Session Confirmation ready for Phase 3 practice generation
 *  - Real-time KaTeX preview of mathematical formulas
 *  - Case-preserving normalization and deduplication
 */

import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Send, Image as ImageIcon, Mic, X,
  AlertCircle, Sparkles, RotateCcw, Info,
  AlertTriangle, Check, Plus, Edit2, ArrowRight,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import MathView from '../components/MathView';
import GenerationProgress from '../components/GenerationProgress';
import { getTopicById, getChapterById } from '../data/mathCurriculum';
import { extractFormulas, validateFormulaSet } from '../utils/api';
import { saveSession, getActiveLearner } from '../utils/storage';
import './FormulaInput.css';

// External helper to generate session IDs cleanly
function generateSessionId(chapterId, topicId) {
  return `sess_${chapterId}_${topicId}_${Date.now()}`;
}

export default function FormulaInput() {
  const { chapterId, topicId } = useParams();
  const navigate = useNavigate();
  const topic = getTopicById(chapterId, topicId);
  const chapter = getChapterById(chapterId);

  // Stage: 'input' | 'preview' | 'confirmed'
  const [stage, setStage] = useState('input');

  // Input Stage State
  const [formulaText, setFormulaText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [voiceNotice, setVoiceNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Preview Stage State (List of formulas)
  const [formulas, setFormulas] = useState([]);
  const [inlineNewFormula, setInlineNewFormula] = useState('');

  // Confirmed Stage State
  const [confirmedSession, setConfirmedSession] = useState(null);
  const [activeLearner, setActiveLearner] = useState(null);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Fetch active learner on mount
  useEffect(() => {
    getActiveLearner().then(setActiveLearner).catch(() => {});
  }, []);

  // Clean up object URL when image changes or component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Handle image file selection locally
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedImage(file);
    setImagePreview(previewUrl);
    setVoiceNotice(false);
    setError(null);

    e.target.value = '';
  };

  // Remove attached image
  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Click voice button - show coming soon notice
  const handleVoiceClick = () => {
    setVoiceNotice(true);
    setTimeout(() => setVoiceNotice(false), 4000);
  };

  // Insert suggested formula chip into textarea
  const handleSelectFormulaChip = (formula) => {
    setFormulaText((prev) => {
      if (!prev.trim()) return formula;
      return `${prev}\n${formula}`;
    });
    setError(null);
    textareaRef.current?.focus();
  };

  // Stage 1: Submit to AI backend for extraction
  const handleExtractSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = formulaText.trim();
    if ((!trimmed && !selectedImage) || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await extractFormulas({
        formulaText: trimmed,
        imageFile: selectedImage,
        chapterId,
        topicId,
      });

      if (Array.isArray(result.formulas) && result.formulas.length > 0) {
        setFormulas(result.formulas);
        setStage('preview');
      } else {
        throw new Error('No formulas were returned from extraction.');
      }
    } catch (err) {
      setError(err.message || 'Failed to extract formulas. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Update formula name in editable list
  const handleUpdateFormulaName = (id, newName) => {
    setFormulas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
    );
  };

  // Stage 2: Update formula text in editable list (re-renders KaTeX in real-time)
  const handleUpdateFormulaText = (id, newText) => {
    setFormulas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, latex: newText, rawText: newText } : f))
    );
  };

  // Stage 2: Remove a formula from editable list
  const handleRemoveFormula = (id) => {
    setFormulas((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      return filtered.map((f, idx) => ({ ...f, id: `f${idx + 1}` }));
    });
  };

  // Stage 2: Add another formula inline
  const handleAddInlineFormula = (e) => {
    if (e) e.preventDefault();
    const trimmed = inlineNewFormula.trim();
    if (!trimmed) return;

    if (formulas.length >= 5) {
      alert('You have reached the maximum limit of 5 formulas for this practice session.');
      return;
    }

    const newId = `f${formulas.length + 1}`;
    const newFormulaObj = {
      id: newId,
      name: `Formula ${formulas.length + 1}`,
      latex: trimmed,
      rawText: trimmed,
    };

    setFormulas((prev) => [...prev, newFormulaObj]);
    setInlineNewFormula('');
  };

  // Stage 2: Quick-add a suggested chip directly into the confirmation list
  const handleAddSuggestedDirect = (formulaStr) => {
    if (formulas.length >= 5) {
      alert('Maximum of 5 formulas allowed per session.');
      return;
    }
    const newId = `f${formulas.length + 1}`;
    setFormulas((prev) => [
      ...prev,
      {
        id: newId,
        name: `Formula ${prev.length + 1}`,
        latex: formulaStr,
        rawText: formulaStr,
      },
    ]);
  };

  // Stage 2 -> 3: Confirm and save session into IndexedDB
  const handleConfirmSession = async () => {
    if (formulas.length === 0 || formulas.length > 5) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Enforce backend validation
      const validated = await validateFormulaSet(formulas);

      // 2. Persist to IndexedDB
      const sessionId = generateSessionId(chapter.id, topic.id);
      const sessionRecord = {
        sessionId,
        learnerId: activeLearner?.learnerId || 'learner_default',
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        topicId: topic.id,
        topicTitle: topic.title,
        formulas: validated.formulas,
        totalQuestions: 0,
        currentQuestionIndex: 0,
        status: 'ready_for_generation',
      };

      await saveSession(sessionRecord);
      setConfirmedSession(sessionRecord);
      setStage('confirmed');
    } catch (err) {
      setError(err.message || 'Failed to confirm formulas.');
    } finally {
      setLoading(false);
    }
  };

  // Reset entire workflow back to input
  const handleResetToInput = () => {
    setStage('input');
    setFormulas([]);
    setConfirmedSession(null);
    setError(null);
    setFormulaText('');
    handleRemoveImage();
    setVoiceNotice(false);
  };

  // Error handling: Invalid chapter or topic
  if (!chapter || !topic) {
    return (
      <div className="formula-page">
        <div className="container">
          <Breadcrumb
            backTo="/subjects/mathematics"
            backLabel="Back to Chapters"
            items={[
              { label: 'Home', to: '/' },
              { label: 'Mathematics', to: '/subjects/mathematics' },
              { label: 'Not Found' },
            ]}
          />
          <div className="not-found-card">
            <AlertCircle size={36} className="not-found-card__icon" />
            <h1 className="not-found-card__title">Topic Not Found</h1>
            <p className="not-found-card__desc">
              The requested mathematics topic or chapter could not be located.
            </p>
            <Link to="/subjects/mathematics" className="not-found-card__btn">
              Explore Mathematics
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formulaCount = formulas.length;
  const isCountValid = formulaCount >= 1 && formulaCount <= 5;
  const isSubmitDisabled = (!formulaText.trim() && !selectedImage) || loading;

  return (
    <div className="formula-page">
      <div className="container">
        {/* Breadcrumb navigation */}
        <Breadcrumb
          backTo={`/subjects/mathematics/${chapter.id}`}
          backLabel={`Back to ${chapter.title}`}
          items={[
            { label: 'Home', to: '/' },
            { label: 'Mathematics', to: '/subjects/mathematics' },
            { label: chapter.title, to: `/subjects/mathematics/${chapter.id}` },
            { label: topic.title },
          ]}
        />

        {/* Page Context Header */}
        <header className="formula-page__header">
          <div className="formula-page__meta">
            <span className="formula-page__tag">{chapter.title}</span>
            <span className="formula-page__dot">&bull;</span>
            <span className="formula-page__topic-name">{topic.title}</span>
          </div>
          <h1 className="formula-page__title">
            {stage === 'confirmed'
              ? 'Practice Session Initialized'
              : stage === 'preview'
              ? 'Review & Confirm Formulas'
              : 'Add Formulas & Concepts'}
          </h1>
          <p className="formula-page__subtitle">
            {stage === 'confirmed'
              ? 'Formulas verified and stored offline. Ready for intelligent question generation.'
              : stage === 'preview'
              ? 'Verify, edit, or adjust your formula set (1–5 formulas allowed per practice session).'
              : topic.desc}
          </p>
        </header>

        {/* Global Error Banner */}
        {error && (
          <div className="formula-error-banner" role="alert">
            <AlertTriangle size={18} className="formula-error-icon" />
            <div className="formula-error-content">
              <p className="formula-error-heading">Validation Error</p>
              <p className="formula-error-text">{error}</p>
            </div>
            <div className="formula-error-actions">
              <button
                type="button"
                onClick={() => setError(null)}
                className="formula-error-dismiss-btn"
                aria-label="Dismiss error"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* State A: Loading State */}
        {loading && (
          <div className="analysis-loading-card">
            <div className="loading-spinner-wrap">
              <div className="loading-spinner" />
            </div>
            <h2 className="loading-title">Extracting Formulas with LearnWell AI…</h2>
            <p className="loading-subtitle">
              Parsing mathematical notation, identifying distinct equations, and preserving variable casing for {topic.title}…
            </p>
          </div>
        )}

        {/* State B: Stage 1 - Input Composer */}
        {!loading && stage === 'input' && (
          <div className="composer-container">
            {/* Suggested formula quick-pick chips */}
            {topic.suggestedFormulas && topic.suggestedFormulas.length > 0 && (
              <div className="suggested-chips">
                <div className="suggested-chips__label">
                  <Sparkles size={13} />
                  <span>Quick-add standard formulas (up to 5):</span>
                </div>
                <div className="suggested-chips__list">
                  {topic.suggestedFormulas.map((formula) => (
                    <button
                      key={formula}
                      type="button"
                      className="suggested-chip"
                      onClick={() => handleSelectFormulaChip(formula)}
                      title="Click to insert into composer"
                    >
                      {formula}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Voice coming soon notice toast */}
            {voiceNotice && (
              <div className="voice-notice" role="alert">
                <Info size={15} />
                <span>Voice input is coming soon in a future update. Use text or image upload below.</span>
              </div>
            )}

            {/* Unified Chat-Style Composer */}
            <form onSubmit={handleExtractSubmit} className="composer-card">
              {/* Image attachment preview inside composer */}
              {imagePreview && (
                <div className="composer-preview">
                  <div className="composer-preview__thumb-wrap">
                    <img
                      src={imagePreview}
                      alt="Attachment preview"
                      className="composer-preview__thumb"
                    />
                    <button
                      type="button"
                      className="composer-preview__remove"
                      onClick={handleRemoveImage}
                      title="Remove image"
                      aria-label="Remove image"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <span className="composer-preview__name">
                    {selectedImage?.name} (Ready to extract)
                  </span>
                </div>
              )}

              {/* Text Input Area */}
              <div className="composer-input-wrap">
                <textarea
                  ref={textareaRef}
                  value={formulaText}
                  onChange={(e) => {
                    setFormulaText(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Type or paste 1 to 5 mathematical formulas (e.g. x = (-b ± √(b² - 4ac)) / (2a))…"
                  className="composer-textarea"
                  rows={4}
                  aria-label="Formula or concept statement"
                />
              </div>

              {/* Composer Toolbar (Image, Voice, Send) */}
              <div className="composer-toolbar">
                <div className="composer-toolbar__left">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageChange}
                    className="sr-only"
                    id="formula-image-upload"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`composer-icon-btn ${selectedImage ? 'composer-icon-btn--active' : ''}`}
                    title="Attach formula image or textbook screenshot"
                    aria-label="Attach image"
                  >
                    <ImageIcon size={18} />
                    <span className="composer-btn-text">
                      {selectedImage ? 'Image Attached' : 'Attach Image'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleVoiceClick}
                    className="composer-icon-btn composer-icon-btn--muted"
                    title="Voice input (Coming soon)"
                    aria-label="Voice input"
                  >
                    <Mic size={18} />
                    <span className="composer-btn-text">Voice</span>
                    <span className="composer-badge-mini">Soon</span>
                  </button>
                </div>

                <div className="composer-toolbar__right">
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="composer-send-btn"
                    title={isSubmitDisabled ? 'Enter text or attach an image to proceed' : 'Extract formulas'}
                    aria-label="Extract formulas"
                  >
                    <span>Extract & Review</span>
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </form>

            <div className="composer-hints">
              <p className="composer-hint-item">
                <strong>Tip:</strong> You can submit 1 to 5 formulas. If an image contains more than 5 formulas, you will be able to select and trim them in the next step.
              </p>
            </div>
          </div>
        )}

        {/* State C: Stage 2 - Editable Confirmation Preview */}
        {!loading && stage === 'preview' && (
          <div className="formula-preview-panel">
            {/* Header with Counter Badge */}
            <div className="formula-preview-header">
              <div className="formula-preview-header__left">
                <h2 className="formula-preview-title">Detected Formulas</h2>
                <span
                  className={`formula-count-badge ${
                    isCountValid
                      ? 'formula-count-badge--valid'
                      : 'formula-count-badge--warning'
                  }`}
                >
                  {formulaCount} of 5 formulas
                  {formulaCount > 5 && ` (Limit Exceeded: Please remove ${formulaCount - 5})`}
                  {formulaCount === 0 && ' (Please add at least 1)'}
                </span>
              </div>
            </div>

            {/* Limit Exceeded Alert */}
            {formulaCount > 5 && (
              <div className="formula-limit-alert" role="alert">
                <AlertTriangle size={20} className="formula-limit-alert__icon" />
                <p className="formula-limit-alert__text">
                  <strong>Limit Exceeded:</strong> {formulaCount} formulas detected. LearnWell supports a maximum of 5 formulas per practice session. Please remove {formulaCount - 5} formula{formulaCount - 5 === 1 ? '' : 's'} using the delete buttons below.
                </p>
              </div>
            )}

            {/* List of Editable Formula Cards */}
            <div className="formula-cards-list">
              {formulas.map((item, index) => (
                <div key={item.id} className="formula-card">
                  <div className="formula-card__top">
                    <span className="formula-card__badge">Formula {index + 1}</span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateFormulaName(item.id, e.target.value)}
                      className="formula-card__name-input"
                      placeholder="Formula Name"
                      aria-label={`Name for formula ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFormula(item.id)}
                      className="formula-card__remove-btn"
                      title="Remove this formula"
                      aria-label={`Remove formula ${index + 1}`}
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Real-time KaTeX math preview */}
                  <div className="formula-card__preview">
                    {item.latex ? (
                      <MathView math={item.latex} block={false} />
                    ) : (
                      <span className="formula-card__preview-empty">No expression entered</span>
                    )}
                  </div>

                  {/* Editable LaTeX/Raw formula input */}
                  <div className="formula-card__expr-wrap">
                    <label className="formula-card__expr-label" htmlFor={`formula-expr-${item.id}`}>
                      Formula Expression (LaTeX / Math notation):
                    </label>
                    <input
                      id={`formula-expr-${item.id}`}
                      type="text"
                      value={item.latex}
                      onChange={(e) => handleUpdateFormulaText(item.id, e.target.value)}
                      className="formula-card__expr-input"
                      placeholder="e.g. x = (-b \pm \sqrt{b^2 - 4ac}) / (2a)"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add Another Formula Section (Visible when < 5) */}
            {formulaCount < 5 && (
              <div className="formula-add-card">
                <span className="formula-add-card__label">
                  Add Another Formula ({5 - formulaCount} remaining slots):
                </span>
                <form onSubmit={handleAddInlineFormula} className="formula-add-form">
                  <input
                    type="text"
                    value={inlineNewFormula}
                    onChange={(e) => setInlineNewFormula(e.target.value)}
                    placeholder="Type formula (e.g. Δ = b² - 4ac)…"
                    className="formula-add-input"
                  />
                  <button
                    type="submit"
                    disabled={!inlineNewFormula.trim()}
                    className="formula-add-btn"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </form>

                {/* Quick chip suggestions if any remain */}
                {topic.suggestedFormulas && (
                  <div style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Quick-add standard topic formulas:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {topic.suggestedFormulas.slice(0, 4).map((f) => (
                        <button
                          key={f}
                          type="button"
                          className="suggested-chip"
                          onClick={() => handleAddSuggestedDirect(f)}
                          style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                        >
                          + {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions Toolbar */}
            <div className="formula-preview-actions">
              <button
                type="button"
                onClick={handleResetToInput}
                className="formula-btn-secondary"
              >
                <RotateCcw size={14} />
                <span>Discard & Start Over</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmSession}
                disabled={!isCountValid || loading}
                className="formula-btn-primary"
                title={
                  !isCountValid
                    ? 'Please have between 1 and 5 formulas to proceed'
                    : 'Confirm formulas and save session'
                }
              >
                <span>Confirm Practice Formulas</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* State D: Stage 3 - Session Confirmed */}
        {!loading && stage === 'confirmed' && confirmedSession && (
          <div className="formula-confirmed-card">
            <div className="formula-confirmed-icon-wrap">
              <Check size={28} />
            </div>
            <h2 className="formula-confirmed-title">Practice Session Initialized</h2>
            <p className="formula-confirmed-desc">
              Your formula set has been verified and saved to your local offline storage. You are ready to generate intelligent practice questions.
            </p>

            <div className="formula-confirmed-meta">
              <div className="formula-confirmed-meta-row">
                <span>Session ID:</span>
                <span className="formula-confirmed-meta-val">{confirmedSession.sessionId}</span>
              </div>
              <div className="formula-confirmed-meta-row">
                <span>Learner Profile:</span>
                <span className="formula-confirmed-meta-val">
                  {activeLearner?.name || 'Default Learner'}
                </span>
              </div>
              <div className="formula-confirmed-meta-row">
                <span>Chapter & Topic:</span>
                <span className="formula-confirmed-meta-val">
                  {confirmedSession.chapterTitle} &bull; {confirmedSession.topicTitle}
                </span>
              </div>
              <div className="formula-confirmed-meta-row">
                <span>Confirmed Formulas:</span>
                <span className="formula-confirmed-meta-val">
                  {confirmedSession.formulas.length} of 5
                </span>
              </div>
            </div>

            <h3 className="formula-confirmed-list-title">Confirmed Formulas:</h3>
            <div className="formula-confirmed-list">
              {confirmedSession.formulas.map((f, i) => (
                <div key={f.id} className="formula-confirmed-item">
                  <span className="formula-confirmed-item-name">
                    {i + 1}. {f.name}:
                  </span>
                  <MathView math={f.latex} block={false} />
                </div>
              ))}
            </div>

            <div className="formula-confirmed-actions">
              <button
                type="button"
                onClick={() => setStage('generating')}
                className="formula-btn-primary"
              >
                <Sparkles size={15} />
                <span>Generate Practice Questions (6–8 MCQs per formula)</span>
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => setStage('preview')}
                className="formula-btn-secondary"
              >
                <Edit2 size={14} />
                <span>Edit Formulas</span>
              </button>
              <button
                type="button"
                onClick={handleResetToInput}
                className="formula-btn-secondary"
              >
                <Plus size={14} />
                <span>Start Another Session</span>
              </button>
            </div>
          </div>
        )}

        {/* State E: Stage 4 - AI Question Generation & Batch Engine */}
        {!loading && stage === 'generating' && confirmedSession && (
          <GenerationProgress
            session={confirmedSession}
            onComplete={(res) => {
              const targetId = res?.sessionId || confirmedSession.sessionId;
              if (targetId) {
                navigate(`/practice/${targetId}`);
              }
            }}
            onCancel={() => setStage('confirmed')}
          />
        )}
      </div>
    </div>
  );
}
