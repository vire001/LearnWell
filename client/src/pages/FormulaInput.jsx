/**
 * FormulaInput.jsx — Formula & Concept Input Page for chosen Topic.
 *
 * Route: /subjects/mathematics/:chapterId/:topicId
 * Features:
 *  - Unified chat-style composer (text + image attachment + voice placeholder)
 *  - Local image preview and removal (no server upload)
 *  - Clickable suggested formula chips to prefill text
 *  - Clean submission preview with milestone disclaimer (no fake AI)
 *  - Robust error handling for invalid chapter or topic IDs
 */

import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Send, Image as ImageIcon, Mic, X,
  AlertCircle, CheckCircle2, Sparkles, RotateCcw, Info
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { getTopicById, getChapterById } from '../data/mathCurriculum';
import './FormulaInput.css';

export default function FormulaInput() {
  const { chapterId, topicId } = useParams();
  const topic = getTopicById(chapterId, topicId);
  const chapter = getChapterById(chapterId);

  const [formulaText, setFormulaText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [voiceNotice, setVoiceNotice] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

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

    // Reset input value so same file can be re-selected if removed
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
    textareaRef.current?.focus();
  };

  // Handle composer submission
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = formulaText.trim();
    if (!trimmed && !selectedImage) return;

    setSubmittedData({
      text: trimmed,
      imageName: selectedImage?.name || null,
      imageUrl: imagePreview,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  // Reset composer to enter another formula
  const handleReset = () => {
    setSubmittedData(null);
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

  const isSubmitDisabled = !formulaText.trim() && !selectedImage;

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
          <h1 className="formula-page__title">Add Formula or Concept</h1>
          <p className="formula-page__subtitle">{topic.desc}</p>
        </header>

        {/* State A: Submission Preview (Clear Milestone 2 state, no fake AI) */}
        {submittedData ? (
          <div className="submission-card">
            <div className="submission-card__header">
              <div className="submission-card__status">
                <CheckCircle2 size={20} className="submission-card__status-icon" />
                <span className="submission-card__status-text">Input Received Successfully</span>
              </div>
              <span className="submission-card__time">{submittedData.timestamp}</span>
            </div>

            <div className="submission-card__body">
              <h2 className="submission-card__title">Submitted Formula / Concept:</h2>

              {submittedData.text && (
                <pre className="submission-card__code">
                  <code>{submittedData.text}</code>
                </pre>
              )}

              {submittedData.imageUrl && (
                <div className="submission-card__image-preview">
                  <p className="submission-card__image-label">Attached Reference:</p>
                  <img
                    src={submittedData.imageUrl}
                    alt="Submitted formula reference"
                    className="submission-card__img"
                  />
                  {submittedData.imageName && (
                    <span className="submission-card__filename">{submittedData.imageName}</span>
                  )}
                </div>
              )}

              <div className="milestone-notice">
                <Info size={18} className="milestone-notice__icon" />
                <div className="milestone-notice__content">
                  <p className="milestone-notice__heading">Milestone 2 Navigation Complete</p>
                  <p className="milestone-notice__text">
                    Your formula input has been structured and validated. AI-driven step-by-step
                    concept explanation, formula derivation, and question generation will be
                    connected in <strong>Milestone 3</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="submission-card__actions">
              <button
                type="button"
                onClick={handleReset}
                className="submission-card__reset-btn"
              >
                <RotateCcw size={15} />
                <span>Submit Another Formula</span>
              </button>
              <Link
                to={`/subjects/mathematics/${chapter.id}`}
                className="submission-card__back-link"
              >
                Choose Another Topic
              </Link>
            </div>
          </div>
        ) : (
          /* State B: Active Unified Composer */
          <div className="composer-container">
            {/* Suggested formula quick-pick chips */}
            {topic.suggestedFormulas && topic.suggestedFormulas.length > 0 && (
              <div className="suggested-chips">
                <div className="suggested-chips__label">
                  <Sparkles size={13} />
                  <span>Quick-add standard formulas:</span>
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
            <form onSubmit={handleSubmit} className="composer-card">
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
                    {selectedImage?.name} (Ready to send)
                  </span>
                </div>
              )}

              {/* Text Input Area */}
              <div className="composer-input-wrap">
                <textarea
                  ref={textareaRef}
                  value={formulaText}
                  onChange={(e) => setFormulaText(e.target.value)}
                  placeholder="Type or paste a formula, theorem, or mathematical problem statement (e.g. ax² + bx + c = 0)…"
                  className="composer-textarea"
                  rows={4}
                  aria-label="Formula or concept statement"
                />
              </div>

              {/* Composer Toolbar (Image, Voice, Send) */}
              <div className="composer-toolbar">
                <div className="composer-toolbar__left">
                  {/* Hidden native file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="sr-only"
                    id="formula-image-upload"
                  />

                  {/* Attachment button */}
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

                  {/* Voice recording button (coming soon) */}
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
                    title={isSubmitDisabled ? 'Enter text or attach an image to send' : 'Send formula'}
                    aria-label="Send formula"
                  >
                    <span>Send</span>
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </form>

            {/* Helper tips */}
            <div className="composer-hints">
              <p className="composer-hint-item">
                <strong>Tip:</strong> You can combine typed notes with a textbook photo in the same submission.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
