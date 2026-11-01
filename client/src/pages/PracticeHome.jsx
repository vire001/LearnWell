/**
 * PracticeHome.jsx — Session Selector & Practice Dashboard.
 *
 * Route: /practice
 * Implements Section 2.1 & Sub-Phase 4.1 of LearnWell M3 Phase 4 Architecture:
 * - Retrieves sessions strictly for the active learner via getSessionsByLearner().
 * - Displays active sessions (in-progress) with progress indicator and "Resume Practice" CTA.
 * - Displays completed sessions with review status and "Review Session" CTA.
 * - Displays an intuitive empty state when no practice sessions exist.
 * - Displays a user-friendly error state with Retry action when retrieval fails.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Layers,
  Calendar,
  User,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { getSessionsByLearner, getActiveLearner, getActiveLearnerId } from '../utils/storage';
import './PracticeHome.css';

/**
 * Formats ISO date string into readable local format.
 */
function formatDate(isoString) {
  if (!isoString) return 'Recently';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

export default function PracticeHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeLearner, setActiveLearner] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'in_progress' | 'completed'
  const [reloadKey, setReloadKey] = useState(0);

  // Load active learner and sessions strictly scoped to them
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const learner = await getActiveLearner();
        const activeId = getActiveLearnerId();
        if (isMounted) setActiveLearner(learner);

        // Retrieve sessions strictly for active learner
        const allLearnerSessions = await getSessionsByLearner(activeId);

        if (isMounted) {
          // Double verify scoping by learnerId
          const filtered = (allLearnerSessions || []).filter(
            (s) => !s.learnerId || s.learnerId === activeId
          );
          setSessions(filtered);
        }
      } catch (err) {
        console.error('Failed to load practice sessions:', err);
        if (isMounted) {
          setError(err?.message || 'Failed to retrieve practice sessions from offline storage.');
          setSessions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  // Split sessions by status
  const activeSessions = sessions.filter((s) => s.status !== 'completed');
  const completedSessions = sessions.filter((s) => s.status === 'completed');

  // Filtered list based on active tab
  const displayedSessions =
    filterTab === 'in_progress'
      ? activeSessions
      : filterTab === 'completed'
      ? completedSessions
      : sessions;

  return (
    <div className="practice-home-page">
      <div className="container">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          backTo="/"
          backLabel="Back to Home"
          items={[
            { label: 'Home', to: '/' },
            { label: 'Practice' },
          ]}
        />

        {/* Header Section */}
        <header className="practice-home__header">
          <div className="practice-home__header-meta">
            <div className="practice-home__badge">
              <Compass size={14} />
              <span>Interactive Practice</span>
            </div>

            {activeLearner && (
              <div className="practice-home__learner-tag">
                <User size={13} />
                <span>Learner: <strong>{activeLearner.name || 'Default Learner'}</strong></span>
              </div>
            )}
          </div>

          <h1 className="practice-home__title">Practice Sessions</h1>
          <p className="practice-home__subtitle">
            Continue your active formula drills, review completed sessions, or launch a new topic.
          </p>
        </header>

        {/* Loading State */}
        {loading && (
          <div className="practice-home__loading" data-testid="practice-loading">
            <div className="practice-home__spinner" />
            <p>Loading your practice sessions...</p>
          </div>
        )}

        {/* Error State: Retrieval Failure */}
        {!loading && error && (
          <div className="practice-home__error-state" data-testid="practice-error-state">
            <div className="practice-home__error-icon-wrap">
              <AlertCircle size={40} className="practice-home__error-icon" />
            </div>
            <h2 className="practice-home__error-title">Unable to Load Practice Sessions</h2>
            <p className="practice-home__error-desc">{error}</p>
            <div className="practice-home__error-actions">
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="practice-home__retry-btn"
                data-testid="practice-retry-btn"
              >
                <RotateCcw size={15} />
                <span>Retry Loading</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty State: No sessions exist at all */}
        {!loading && !error && sessions.length === 0 && (
          <div className="practice-empty-state" data-testid="empty-sessions-state">
            <div className="practice-empty-state__icon-wrap">
              <BookOpen size={40} className="practice-empty-state__icon" />
            </div>
            <h2 className="practice-empty-state__title">No Practice Sessions Yet</h2>
            <p className="practice-empty-state__desc">
              You haven't generated any practice sessions yet. Choose a topic from the
              mathematics curriculum to generate targeted formula questions.
            </p>
            <div className="practice-empty-state__actions">
              <Link to="/subjects/mathematics" className="practice-empty-state__cta">
                <span>Explore Mathematics Curriculum</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}

        {/* Session Content (when sessions exist and no error) */}
        {!loading && !error && sessions.length > 0 && (
          <div className="practice-home__content">
            {/* Filter Tabs */}
            <div className="practice-home__tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={filterTab === 'all'}
                className={`practice-home__tab ${filterTab === 'all' ? 'practice-home__tab--active' : ''}`}
                onClick={() => setFilterTab('all')}
              >
                All Sessions ({sessions.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterTab === 'in_progress'}
                className={`practice-home__tab ${filterTab === 'in_progress' ? 'practice-home__tab--active' : ''}`}
                onClick={() => setFilterTab('in_progress')}
              >
                In Progress ({activeSessions.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterTab === 'completed'}
                className={`practice-home__tab ${filterTab === 'completed' ? 'practice-home__tab--active' : ''}`}
                onClick={() => setFilterTab('completed')}
              >
                Completed ({completedSessions.length})
              </button>
            </div>

            {/* Filtered Empty State */}
            {displayedSessions.length === 0 && (
              <div className="practice-home__sub-empty">
                <p>No sessions found in this category.</p>
              </div>
            )}

            {/* Sessions Grid */}
            <div className="practice-home__grid">
              {displayedSessions.map((sess) => {
                const isCompleted = sess.status === 'completed';
                const totalQ = sess.totalQuestions || 0;
                const currentIdx = sess.currentQuestionIndex || 0;
                const progressNum = Math.min(totalQ, currentIdx + (isCompleted ? totalQ : 1));
                const progressPct = totalQ > 0 ? Math.round((progressNum / totalQ) * 100) : 0;
                const formulaCount = sess.formulas?.length || 0;

                return (
                  <article
                    key={sess.sessionId}
                    className={`practice-card ${isCompleted ? 'practice-card--completed' : 'practice-card--active'}`}
                    data-testid={`session-card-${sess.sessionId}`}
                  >
                    <div className="practice-card__top">
                      <span className="practice-card__chapter-badge">
                        {sess.chapterTitle || 'Mathematics'}
                      </span>
                      <span
                        className={`practice-card__status-pill ${
                          isCompleted
                            ? 'practice-card__status-pill--completed'
                            : 'practice-card__status-pill--active'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>Completed</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw size={12} />
                            <span>In Progress</span>
                          </>
                        )}
                      </span>
                    </div>

                    <h2 className="practice-card__title">
                      {sess.topicTitle || 'Practice Session'}
                    </h2>

                    <div className="practice-card__stats">
                      <div className="practice-card__stat-item" title="Formulas Practiced">
                        <Layers size={13} />
                        <span>{formulaCount} {formulaCount === 1 ? 'Formula' : 'Formulas'}</span>
                      </div>
                      <div className="practice-card__stat-item" title="Total Questions">
                        <BookOpen size={13} />
                        <span>{totalQ} Questions</span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="practice-card__progress-section">
                      <div className="practice-card__progress-label">
                        <span>{isCompleted ? 'Completed' : `Question ${progressNum} of ${totalQ}`}</span>
                        <span className="practice-card__progress-pct">{progressPct}%</span>
                      </div>
                      <div className="practice-card__progress-track">
                        <div
                          className={`practice-card__progress-bar ${
                            isCompleted ? 'practice-card__progress-bar--completed' : ''
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="practice-card__footer">
                      <span className="practice-card__date" title="Last Updated">
                        <Calendar size={12} />
                        <span>{formatDate(sess.updatedAt || sess.createdAt)}</span>
                      </span>

                      <Link
                        to={`/practice/${sess.sessionId}`}
                        className={`practice-card__action-btn ${
                          isCompleted
                            ? 'practice-card__action-btn--review'
                            : 'practice-card__action-btn--resume'
                        }`}
                      >
                        <span>{isCompleted ? 'Review Session' : 'Resume Practice'}</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
