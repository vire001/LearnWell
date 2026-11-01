/**
 * PracticeSession.jsx — Interactive Practice Workbench Container.
 *
 * Route: /practice/:sessionId
 * Implements Sub-Phase 4.1 & Sub-Phase 4.2 of LearnWell M3 Phase 4 Architecture:
 * - Retrieves session using existing getSession(sessionId).
 * - Displays clean loading state and SessionNotFound recovery card.
 * - Handles learner mismatch safely with explicit confirmation flow.
 * - Mounts PracticeHeader with question counter and mixed practice anonymity.
 * - Connects QuestionCard with KaTeX parser and OptionCard components.
 * - Implements multi-attempt engine with strict Revision 2.4 rules:
 *   - Synchronous transaction-lifecycle lock (isEvaluatingRef) covering entire IndexedDB write.
 *   - Immutable firstAttempt record.
 *   - Strict retryCount semantics (0 on attempt 1, 1 on retry 1, 2 on retry 2).
 *   - Full mastery classifications (independent_correct, assisted_correct, independent_incorrect,
 *     assisted_incorrect, assisted_retry_correct).
 *   - Immediate feedback on correct / incorrect distractor exhaustion.
 *   - Automatic elimination resolution with strict invariant verification when 3 distractors are eliminated.
 *   - Rollback to previousState on simulated persistence failure or invariant violation.
 *   - Preserves disabled toolbar navigation placeholders for Sub-Phase 4.4.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertCircle,
  Home,
  Calculator,
  HelpCircle,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import PracticeHeader from '../components/PracticeHeader';
import QuestionCard from '../components/QuestionCard';
import PracticeToolbar from '../components/PracticeToolbar';
import GuideMeModal from '../components/GuideMeModal';
import SolutionModal from '../components/SolutionModal';
import QuestionPalette from '../components/QuestionPalette';
import SessionCompletionModal from '../components/SessionCompletionModal';
import {
  getSession,
  getQuestionsBySession,
  updateSession,
  updateQuestionAttempt,
  getActiveLearnerId,
  setActiveLearnerId,
  getLearner,
} from '../utils/storage';
import {
  getInitialAttemptState,
  evaluateAttemptSelection,
  recordToolView,
} from '../utils/attemptEngine';
import './PracticeSession.css';

export default function PracticeSession() {
  const { sessionId } = useParams();

  const [loading, setLoading] = useState(true);
  const [sessionNotFound, setSessionNotFound] = useState(false);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [mismatchInfo, setMismatchInfo] = useState(null);
  const [learnerName, setLearnerName] = useState('Learner');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [persistenceError, setPersistenceError] = useState(null);

  // Sub-Phase 4.3 Learning Tool Modals State
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isGuideMeOpen, setIsGuideMeOpen] = useState(false);
  const [isSolutionOpen, setIsSolutionOpen] = useState(false);

  // Sub-Phase 4.4 Navigation & Completion Modals State
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

  // Synchronous transaction-lifecycle lock ref
  const isEvaluatingRef = useRef(false);

  // Load session and verify learner profile scoping
  useEffect(() => {
    let isMounted = true;

    async function initializeWorkbench() {
      try {
        setLoading(true);
        setSessionNotFound(false);
        setMismatchInfo(null);
        setPersistenceError(null);

        // 1. Retrieve session record
        const sessionRecord = await getSession(sessionId);
        if (!sessionRecord) {
          if (isMounted) {
            setSessionNotFound(true);
            setLoading(false);
          }
          return;
        }

        // 2. Check learner scoping without mutating localStorage automatically
        const currentActiveLearnerId = getActiveLearnerId();

        if (sessionRecord.learnerId && sessionRecord.learnerId !== currentActiveLearnerId) {
          // Fetch learner profiles for explicit confirmation display
          const targetLearner = await getLearner(sessionRecord.learnerId);
          const currentLearner = await getLearner(currentActiveLearnerId);

          const targetName = targetLearner?.name || sessionRecord.learnerId;
          const currentName = currentLearner?.name || currentActiveLearnerId;

          if (isMounted) {
            setSession(sessionRecord);
            setMismatchInfo({
              targetLearnerId: sessionRecord.learnerId,
              targetLearnerName: targetName,
              activeLearnerName: currentName,
            });
            // Do NOT load questions until confirmation is provided
            setQuestions([]);
            setLoading(false);
          }
          return;
        }

        // 3. Profiles match: load questions and initialize workbench
        const currentLearner = await getLearner(currentActiveLearnerId);
        const activeName = currentLearner?.name || 'Learner';
        const sessionQuestions = await getQuestionsBySession(sessionId);

        // Normalize attemptState across all retrieved questions
        const normalizedQuestions = (sessionQuestions || []).map((q) => ({
          ...q,
          attemptState: getInitialAttemptState(q.attemptState),
        }));

        if (isMounted) {
          setSession(sessionRecord);
          setQuestions(normalizedQuestions);
          setLearnerName(activeName);

          const initialIndex = sessionRecord.currentQuestionIndex || 0;
          if (normalizedQuestions.length > 0) {
            const clampedIndex = Math.max(0, Math.min(initialIndex, normalizedQuestions.length - 1));
            setCurrentQuestionIndex(clampedIndex);
          } else {
            setCurrentQuestionIndex(0);
          }

          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load practice session:', err);
        if (isMounted) {
          setSessionNotFound(true);
          setLoading(false);
        }
      }
    }

    initializeWorkbench();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // Explicit confirmation handler: switch active profile and reveal session
  const handleConfirmSwitchLearner = async () => {
    if (!mismatchInfo || !session) return;

    try {
      setLoading(true);

      // Only now mutate active learner in localStorage
      setActiveLearnerId(mismatchInfo.targetLearnerId);
      setLearnerName(mismatchInfo.targetLearnerName);

      // Retrieve questions after intentional profile switch
      const sessionQuestions = await getQuestionsBySession(session.sessionId);
      const normalizedQuestions = (sessionQuestions || []).map((q) => ({
        ...q,
        attemptState: getInitialAttemptState(q.attemptState),
      }));
      setQuestions(normalizedQuestions);

      const initialIndex = session.currentQuestionIndex || 0;
      if (normalizedQuestions.length > 0) {
        const clampedIndex = Math.max(0, Math.min(initialIndex, normalizedQuestions.length - 1));
        setCurrentQuestionIndex(clampedIndex);
      } else {
        setCurrentQuestionIndex(0);
      }

      setMismatchInfo(null);
    } catch (err) {
      console.error('Failed to switch learner profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = session?.status === 'completed';
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex] || null;
  const attemptState = currentQuestion?.attemptState || getInitialAttemptState();
  const isMarked = Boolean(attemptState?.isMarkedForReview);

  const [prevQuestionIndex, setPrevQuestionIndex] = useState(currentQuestionIndex);
  if (prevQuestionIndex !== currentQuestionIndex) {
    setPrevQuestionIndex(currentQuestionIndex);
    setIsHintOpen(false);
    setIsGuideMeOpen(false);
    setIsSolutionOpen(false);
    setIsPaletteOpen(false);
    setIsCompletionModalOpen(false);
  }

  // Sub-Phase 4.4 Navigation & Index Persistence
  const handleNavigate = async (targetIndex) => {
    if (totalQuestions === 0) return;
    const nextIndex = Math.max(0, Math.min(targetIndex, totalQuestions - 1));
    setCurrentQuestionIndex(nextIndex);
    setIsHintOpen(false);
    setIsGuideMeOpen(false);
    setIsSolutionOpen(false);
    setIsPaletteOpen(false);
    setIsCompletionModalOpen(false);

    if (session?.sessionId) {
      try {
        await updateSession(session.sessionId, { currentQuestionIndex: nextIndex });
      } catch (err) {
        console.error('Failed to persist session question index:', err);
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      handleNavigate(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      handleNavigate(currentQuestionIndex + 1);
    } else if (!isReadOnly && currentQuestionIndex === totalQuestions - 1) {
      setIsCompletionModalOpen(true);
    }
  };

  // Sub-Phase 4.4 Mark for Review Toggle & Persistence
  const handleToggleMarkForReview = async () => {
    if (!currentQuestion || isReadOnly) return;
    const currentAttemptState = currentQuestion.attemptState || getInitialAttemptState();
    const nextMarked = !currentAttemptState.isMarkedForReview;
    const updatedState = {
      ...currentAttemptState,
      isMarkedForReview: nextMarked,
    };

    setQuestions((prevQuestions) =>
      prevQuestions.map((q) =>
        q.questionId === currentQuestion.questionId
          ? { ...q, attemptState: updatedState }
          : q
      )
    );

    try {
      await updateQuestionAttempt(currentQuestion.questionId, updatedState);
    } catch (err) {
      console.error('Failed to persist mark for review state:', err);
    }
  };

  // Sub-Phase 4.4 Tri-Action Completion Modal Handlers
  const handleReviewUnanswered = () => {
    const firstUnansweredIndex = questions.findIndex(
      (q) => !q.attemptState?.isLocked && !q.attemptState?.isCorrect
    );
    if (firstUnansweredIndex !== -1) {
      handleNavigate(firstUnansweredIndex);
    }
    setIsCompletionModalOpen(false);
  };

  const handleReviewMarked = () => {
    const firstMarkedIndex = questions.findIndex(
      (q) => q.attemptState?.isMarkedForReview
    );
    if (firstMarkedIndex !== -1) {
      handleNavigate(firstMarkedIndex);
    }
    setIsCompletionModalOpen(false);
  };

  const handleConfirmCompleteSession = async () => {
    if (!session?.sessionId) return;
    const completedAt = new Date().toISOString();
    const updatedSession = {
      ...session,
      status: 'completed',
      completedAt,
    };
    setSession(updatedSession);
    setIsCompletionModalOpen(false);
    try {
      await updateSession(session.sessionId, {
        status: 'completed',
        completedAt,
      });
    } catch (err) {
      console.error('Failed to persist session completion:', err);
    }
  };

  // Sub-Phase 4.3 Learning Assistance Tools Handler (Hint, Guide Me, Solution)
  const handleOpenTool = async (toolName) => {
    if (!currentQuestion) return;

    if (toolName === 'hint') {
      setIsHintOpen((prev) => !prev);
    } else if (toolName === 'guideMe') {
      setIsGuideMeOpen(true);
    } else if (toolName === 'solution') {
      setIsSolutionOpen(true);
    }

    // Read-only sessions allow viewing tools without modifying stored attempt state
    if (isReadOnly) return;

    const currentAttemptState = currentQuestion.attemptState || getInitialAttemptState();
    const updatedState = recordToolView({
      attemptState: currentAttemptState,
      toolName,
      isReadOnly,
    });

    const hasChanged =
      updatedState.hintViewed !== currentAttemptState.hintViewed ||
      updatedState.guideMeViewed !== currentAttemptState.guideMeViewed ||
      updatedState.solutionViewed !== currentAttemptState.solutionViewed ||
      updatedState.solutionViewedAfterAnswer !== currentAttemptState.solutionViewedAfterAnswer;

    if (hasChanged) {
      setQuestions((prevQuestions) =>
        prevQuestions.map((q) =>
          q.questionId === currentQuestion.questionId
            ? { ...q, attemptState: updatedState }
            : q
        )
      );

      try {
        await updateQuestionAttempt(currentQuestion.questionId, updatedState);
      } catch (err) {
        console.error('Failed to persist tool view state:', err);
      }
    }
  };

  // Sub-Phase 4.2 Multi-Attempt Selection & Evaluation Engine
  const handleSelectOption = async (optionId) => {
    if (isEvaluatingRef.current || !currentQuestion) return;
    const currentAttemptState = currentQuestion.attemptState || getInitialAttemptState();

    if (currentAttemptState.isLocked || isReadOnly) return;
    if (currentAttemptState.exhaustedOptions?.includes(optionId)) return;

    // 1. Transaction-Lifecycle Lock: Activate synchronously before any await
    isEvaluatingRef.current = true;
    setIsEvaluating(true);
    setPersistenceError(null);

    // Deep clone prior state for complete, uncorrupted rollback if persistence or invariant fails
    const previousState = {
      ...currentAttemptState,
      attempts: [...(currentAttemptState.attempts || [])],
      exhaustedOptions: [...(currentAttemptState.exhaustedOptions || [])],
      toolsUsedBeforeAttempt: { ...(currentAttemptState.toolsUsedBeforeAttempt || {}) },
    };

    try {
      const updatedState = evaluateAttemptSelection({
        attemptState: currentAttemptState,
        question: currentQuestion,
        optionId,
      });

      // 1. Optimistic UI update
      setQuestions((prevQuestions) =>
        prevQuestions.map((q) =>
          q.questionId === currentQuestion.questionId
            ? { ...q, attemptState: updatedState }
            : q
        )
      );

      // 2. Authoritative IndexedDB persistence
      await updateQuestionAttempt(currentQuestion.questionId, updatedState);
    } catch (err) {
      // Rollback state on persistence failure or invariant violation
      console.error('Failed to process or persist question attempt:', err);
      setQuestions((prevQuestions) =>
        prevQuestions.map((q) =>
          q.questionId === currentQuestion.questionId
            ? { ...q, attemptState: previousState }
            : q
        )
      );
      const errorMessage = err.message?.includes('invariant violation')
        ? 'Question data integrity error detected. Your previous state was safely preserved. Please skip this question or contact support.'
        : 'Failed to save your answer to local storage. Please try again.';
      setPersistenceError(errorMessage);
    } finally {
      // Strict release only after transaction completes or fails
      isEvaluatingRef.current = false;
      setIsEvaluating(false);
    }
  };

  // State A: Loading View
  if (loading) {
    return (
      <div className="practice-workbench-page">
        <div className="container">
          <div className="practice-workbench__loading" data-testid="workbench-loading">
            <div className="practice-workbench__spinner" />
            <p>Loading interactive practice session...</p>
          </div>
        </div>
      </div>
    );
  }

  // State B: Session Not Found View (Invalid ID or deleted session)
  if (sessionNotFound || !session) {
    return (
      <div className="practice-workbench-page">
        <div className="container">
          <div className="session-not-found-card" data-testid="session-not-found">
            <div className="session-not-found-card__icon-wrap">
              <AlertCircle size={38} className="session-not-found-card__icon" />
            </div>
            <h1 className="session-not-found-card__title">Practice Session Not Found</h1>
            <p className="session-not-found-card__desc">
              The requested practice session (<code>{sessionId}</code>) could not be located in
              your local offline storage. It may have been cleared, or the link may be invalid.
            </p>

            <div className="session-not-found-card__actions">
              <Link to="/practice" className="session-not-found-card__btn-primary">
                <RotateCcw size={15} />
                <span>Practice Home</span>
              </Link>
              <Link to="/subjects/mathematics" className="session-not-found-card__btn-secondary">
                <Calculator size={15} />
                <span>Mathematics Chapters</span>
              </Link>
              <Link to="/" className="session-not-found-card__btn-secondary">
                <Home size={15} />
                <span>Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State C: Learner Mismatch Safe Confirmation Flow (Data shielded until confirmed)
  if (mismatchInfo) {
    return (
      <div className="practice-workbench-page">
        <div className="container">
          <div className="learner-mismatch-card" data-testid="learner-mismatch-card">
            <div className="learner-mismatch-card__icon-wrap">
              <UserCheck size={38} className="learner-mismatch-card__icon" />
            </div>
            <h1 className="learner-mismatch-card__title">Learner Profile Mismatch</h1>
            <p className="learner-mismatch-card__desc">
              This practice session belongs to <strong>{mismatchInfo.targetLearnerName}</strong>,
              but your currently active profile is <strong>{mismatchInfo.activeLearnerName}</strong>.
            </p>
            <p className="learner-mismatch-card__subdesc">
              To view this session and protect attempt records, please confirm switching your active
              profile. Your data remains completely private until you confirm.
            </p>

            <div className="learner-mismatch-card__actions">
              <button
                type="button"
                className="learner-mismatch-card__btn-primary"
                onClick={handleConfirmSwitchLearner}
                data-testid="switch-learner-confirm-btn"
              >
                <span>Switch to {mismatchInfo.targetLearnerName} and View Session</span>
              </button>

              <Link to="/practice" className="learner-mismatch-card__btn-secondary">
                <span>Return to Practice Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="practice-workbench-page">
      <div className="container">
        {/* Practice Header & Tracker */}
        <PracticeHeader
          session={session}
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={totalQuestions}
          currentQuestion={currentQuestion}
          isMarkedForReview={isMarked}
          isReadOnly={isReadOnly}
          learnerName={learnerName}
          onToggleMarkForReview={handleToggleMarkForReview}
        />

        {/* Workbench Workspace Layout */}
        <main className="practice-workbench__main">
          {totalQuestions === 0 ? (
            /* Empty Questions Fallback */
            <div className="practice-workbench__no-questions">
              <HelpCircle size={32} />
              <h2>No Questions in this Session</h2>
              <p>This session does not currently contain verified practice questions.</p>
              <Link to="/subjects/mathematics" className="practice-btn-primary">
                Return to Curriculum
              </Link>
            </div>
          ) : (
            /* Core Practice Layout */
            <div className="practice-workbench__workspace">
              {/* Recoverable Persistence / Invariant Error Alert */}
              {persistenceError && (
                <div
                  className="practice-workbench__error-banner"
                  role="alert"
                  data-testid="persistence-error-banner"
                >
                  <div className="practice-workbench__error-content">
                    <AlertCircle size={18} className="practice-workbench__error-icon" />
                    <span>{persistenceError}</span>
                  </div>
                  <button
                    type="button"
                    className="practice-workbench__error-dismiss"
                    onClick={() => setPersistenceError(null)}
                    aria-label="Dismiss error notification"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Sub-Phase 4.2 & 4.3: QuestionCard Component with Hint Accordion */}
              <QuestionCard
                question={currentQuestion}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={totalQuestions}
                attemptState={attemptState}
                onSelectOption={handleSelectOption}
                isReadOnly={isReadOnly}
                isEvaluating={isEvaluating}
                isHintOpen={isHintOpen}
                onToggleHint={() => handleOpenTool('hint')}
              />

              {/* Sub-Phase 4.4: Practice Toolbar with Navigation, Triad Tools & Palette Trigger */}
              <PracticeToolbar
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={totalQuestions}
                attemptState={attemptState}
                isHintOpen={isHintOpen}
                onOpenHint={() => handleOpenTool('hint')}
                onOpenGuideMe={() => handleOpenTool('guideMe')}
                onOpenSolution={() => handleOpenTool('solution')}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onOpenPalette={() => setIsPaletteOpen(true)}
                onToggleMarkForReview={handleToggleMarkForReview}
                isReadOnly={isReadOnly}
              />

              {/* Sub-Phase 4.4: Question Palette Drawer */}
              <QuestionPalette
                isOpen={isPaletteOpen}
                onClose={() => setIsPaletteOpen(false)}
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                onSelectQuestion={handleNavigate}
                onOpenCompletion={() => setIsCompletionModalOpen(true)}
                isReadOnly={isReadOnly}
              />

              {/* Sub-Phase 4.4: Tri-Action Session Completion Modal */}
              <SessionCompletionModal
                isOpen={isCompletionModalOpen}
                onClose={() => setIsCompletionModalOpen(false)}
                questions={questions}
                onConfirmComplete={handleConfirmCompleteSession}
                onReviewUnanswered={handleReviewUnanswered}
                onReviewMarked={handleReviewMarked}
              />

              {/* Sub-Phase 4.3: Four-Section Guide Me Coaching Modal */}
              <GuideMeModal
                isOpen={isGuideMeOpen}
                onClose={() => setIsGuideMeOpen(false)}
                guideMe={currentQuestion?.guideMe}
                testedConcept={currentQuestion?.testedConcept}
              />

              {/* Sub-Phase 4.3: Step-by-Step Mathematical Solution Modal */}
              <SolutionModal
                isOpen={isSolutionOpen}
                onClose={() => setIsSolutionOpen(false)}
                solution={currentQuestion?.solution}
                testedConcept={currentQuestion?.testedConcept}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
