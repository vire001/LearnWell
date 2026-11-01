/**
 * storage.js — Promise-based IndexedDB Storage Layer for LearnWell.
 *
 * Implements offline-first persistence for:
 * - Learners (multi-learner scoping on shared devices)
 * - Practice Sessions
 * - Pre-generated MCQs and attempt tracking
 * - Backups & Audit logs
 *
 * Conforms to LearnWell Architecture Specification Version 3.4.
 */

const DB_NAME = 'LearnWellDB';
const DB_VERSION = 1;

export const DEFAULT_LEARNER_ID = 'learner_default';
export const DEFAULT_LEARNER_NAME = 'Default Learner';
const ACTIVE_LEARNER_KEY = 'learnwell_active_learner_id';

let dbPromise = null;

/**
 * Opens or initializes the LearnWellDB IndexedDB database.
 * Returns a cached Promise resolving to the IDBDatabase instance.
 */
export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Learners store
      if (!db.objectStoreNames.contains('learners')) {
        db.createObjectStore('learners', { keyPath: 'learnerId' });
      }

      // 2. Sessions store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
        sessionStore.createIndex('by_learner', 'learnerId', { unique: false });
        sessionStore.createIndex('by_updated', 'updatedAt', { unique: false });
      }

      // 3. Questions store
      if (!db.objectStoreNames.contains('questions')) {
        const questionStore = db.createObjectStore('questions', { keyPath: 'questionId' });
        questionStore.createIndex('by_session', 'sessionId', { unique: false });
        questionStore.createIndex('by_learner', 'learnerId', { unique: false });
        questionStore.createIndex('by_formula', 'formulaId', { unique: false });
      }

      // 4. Backups store
      if (!db.objectStoreNames.contains('backups')) {
        const backupStore = db.createObjectStore('backups', { keyPath: 'backupId' });
        backupStore.createIndex('by_timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = (event) => {
      dbPromise = null;
      reject(new Error(`Failed to open IndexedDB: ${event.target.error?.message || 'Unknown error'}`));
    };

    request.onblocked = () => {
      console.warn('LearnWellDB open request was blocked by an older open connection.');
    };
  });

  return dbPromise;
}

/**
 * Generic helper to execute a transaction on a single object store.
 */
function executeTransaction(storeName, mode, callback) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);

      let result;
      try {
        result = callback(store, tx);
      } catch (err) {
        reject(err);
        return;
      }

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error(`Transaction error on ${storeName}`));
      tx.onabort = () => reject(tx.error || new Error(`Transaction aborted on ${storeName}`));
    });
  });
}

/* ==========================================================================
   Learner Profile Scoping (Local convenience, non-security boundary)
   ========================================================================== */

/**
 * Returns the currently active learner ID from local storage.
 * Defaults to DEFAULT_LEARNER_ID ('learner_default').
 */
export function getActiveLearnerId() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_LEARNER_ID;
  }
  return window.localStorage.getItem(ACTIVE_LEARNER_KEY) || DEFAULT_LEARNER_ID;
}

/**
 * Sets the active learner ID in local storage.
 */
export function setActiveLearnerId(learnerId) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(ACTIVE_LEARNER_KEY, learnerId);
  }
}

/**
 * Ensures the default learner profile exists in the database.
 */
export async function initDefaultLearner() {
  const existing = await getLearner(DEFAULT_LEARNER_ID);
  if (!existing) {
    const defaultLearner = {
      learnerId: DEFAULT_LEARNER_ID,
      name: DEFAULT_LEARNER_NAME,
      createdAt: new Date().toISOString(),
      activeSessionId: null,
    };
    await saveLearner(defaultLearner);
    return defaultLearner;
  }
  return existing;
}

/**
 * Retrieves a learner record by ID.
 */
export function getLearner(learnerId) {
  return executeTransaction('learners', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(learnerId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }).then((res) => res);
}

/**
 * Retrieves all registered learners.
 */
export function getLearners() {
  return executeTransaction('learners', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }).then((res) => res);
}

/**
 * Retrieves the currently active learner object (initializes default if empty).
 */
export async function getActiveLearner() {
  await initDefaultLearner();
  const activeId = getActiveLearnerId();
  const learner = await getLearner(activeId);
  if (!learner) {
    setActiveLearnerId(DEFAULT_LEARNER_ID);
    return getLearner(DEFAULT_LEARNER_ID);
  }
  return learner;
}

/**
 * Saves or updates a learner profile.
 */
export function saveLearner(learner) {
  if (!learner || !learner.learnerId) {
    return Promise.reject(new Error('Invalid learner: learnerId is required.'));
  }
  return executeTransaction('learners', 'readwrite', (store) => {
    store.put(learner);
    return learner;
  });
}

/**
 * Creates a new learner profile and returns it.
 */
export async function createLearner(name) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) throw new Error('Learner name cannot be empty.');

  const learnerId = `learner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newLearner = {
    learnerId,
    name: trimmedName,
    createdAt: new Date().toISOString(),
    activeSessionId: null,
  };

  await saveLearner(newLearner);
  return newLearner;
}

/**
 * Deletes a learner and all associated sessions and questions.
 */
export async function deleteLearner(learnerId) {
  if (learnerId === DEFAULT_LEARNER_ID) {
    throw new Error('The default learner profile cannot be deleted.');
  }

  // 1. Delete all sessions and questions associated with this learner
  const sessions = await getSessionsByLearner(learnerId);
  for (const session of sessions) {
    await deleteSession(session.sessionId);
  }

  // 2. Delete learner record
  await executeTransaction('learners', 'readwrite', (store) => {
    store.delete(learnerId);
  });

  // 3. Reset active learner if it was the deleted one
  if (getActiveLearnerId() === learnerId) {
    setActiveLearnerId(DEFAULT_LEARNER_ID);
  }

  return true;
}

/* ==========================================================================
   Practice Session Management
   ========================================================================== */

/**
 * Saves a new practice session or updates an existing one.
 */
export function saveSession(sessionData) {
  if (!sessionData || !sessionData.sessionId) {
    return Promise.reject(new Error('Invalid session: sessionId is required.'));
  }

  const learnerId = sessionData.learnerId || getActiveLearnerId();
  const now = new Date().toISOString();

  const record = {
    ...sessionData,
    learnerId,
    createdAt: sessionData.createdAt || now,
    updatedAt: now,
  };

  return executeTransaction('sessions', 'readwrite', (store) => {
    store.put(record);
    return record;
  });
}

/**
 * Retrieves a session by sessionId.
 */
export function getSession(sessionId) {
  return executeTransaction('sessions', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(sessionId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }).then((res) => res);
}

/**
 * Retrieves all sessions for a specific learner, ordered by updatedAt descending.
 */
export function getSessionsByLearner(learnerId = getActiveLearnerId()) {
  return executeTransaction('sessions', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const index = store.index('by_learner');
      const req = index.getAll(learnerId);
      req.onsuccess = () => {
        const results = req.result || [];
        // Sort descending by updatedAt
        results.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }).then((res) => res);
}

/**
 * Updates specific fields on an existing session.
 */
export async function updateSession(sessionId, updates) {
  const existing = await getSession(sessionId);
  if (!existing) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const updatedRecord = {
    ...existing,
    ...updates,
    sessionId, // Prevent accidental ID alteration
    updatedAt: new Date().toISOString(),
  };

  return saveSession(updatedRecord);
}

/**
 * Deletes a session and all its questions from IndexedDB.
 */
export async function deleteSession(sessionId) {
  // 1. Delete all questions in this session
  await deleteQuestionsBySession(sessionId);

  // 2. Delete session record
  return executeTransaction('sessions', 'readwrite', (store) => {
    store.delete(sessionId);
    return true;
  });
}

/* ==========================================================================
   Question Management & Attempt Tracking
   ========================================================================== */

/**
 * Bulk-saves an array of questions in a single readwrite transaction.
 * Validates that every question contains exactly 4 options with unique IDs A, B, C, D.
 */
export function saveQuestions(questionsArray) {
  if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
    return Promise.resolve([]);
  }

  const REQUIRED_IDS = ['A', 'B', 'C', 'D'];

  return executeTransaction('questions', 'readwrite', (store) => {
    for (const q of questionsArray) {
      if (!q.questionId) {
        throw new Error('Each question must have a valid questionId.');
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(
          `Question "${q.questionId}" must have exactly 4 options (found ${Array.isArray(q.options) ? q.options.length : 0}).`
        );
      }
      const ids = q.options.map((opt) => (opt && typeof opt === 'object' ? opt.id : null));
      const hasExactIds = REQUIRED_IDS.every((id) => ids.includes(id)) && ids.length === 4;
      if (!hasExactIds) {
        throw new Error(
          `Question "${q.questionId}" options must have unique IDs exactly matching A, B, C, and D.`
        );
      }
      for (const opt of q.options) {
        if (!opt || typeof opt !== 'object' || typeof opt.text !== 'string' || !opt.text.trim()) {
          throw new Error(
            `Question "${q.questionId}" option "${opt?.id || '?'}" must contain non-empty text.`
          );
        }
      }
      store.put(q);
    }
    return questionsArray;
  });
}

/**
 * Retrieves a single question by questionId.
 */
export function getQuestion(questionId) {
  return executeTransaction('questions', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(questionId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }).then((res) => res);
}

/**
 * Retrieves all questions belonging to a session, ordered by questionNumber.
 */
export function getQuestionsBySession(sessionId) {
  return executeTransaction('questions', 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const index = store.index('by_session');
      const req = index.getAll(sessionId);
      req.onsuccess = () => {
        const results = req.result || [];
        results.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }).then((res) => res);
}

/**
 * Updates the attempt state of a question (e.g. answer selection, hint/solution views, time spent).
 */
export async function updateQuestionAttempt(questionId, attemptStateUpdates) {
  const question = await getQuestion(questionId);
  if (!question) {
    throw new Error(`Question not found: ${questionId}`);
  }

  const currentAttempt = question.attemptState || {
    selectedOption: null,
    isCorrect: null,
    isAssisted: false,
    hintViewed: false,
    solutionViewed: false,
    guideMeViewed: false,
    solutionViewedAfterAnswer: false,
    isMarkedForReview: false,
    timeSpentSeconds: 0,
  };

  const updatedAttempt = {
    ...currentAttempt,
    ...attemptStateUpdates,
  };

  question.attemptState = updatedAttempt;

  await executeTransaction('questions', 'readwrite', (store) => {
    store.put(question);
  });

  return question;
}

/**
 * Deletes all questions belonging to a specific session.
 */
export function deleteQuestionsBySession(sessionId) {
  return executeTransaction('questions', 'readwrite', (store) => {
    const index = store.index('by_session');
    const req = index.openKeyCursor(IDBKeyRange.only(sessionId));

    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    return true;
  });
}

/* ==========================================================================
   Raw Database Access (Used by Backup & Diagnostics)
   ========================================================================== */

/**
 * Returns raw dump of all stores for backup/export.
 */
export async function dumpDatabase() {
  const learners = await executeTransaction('learners', 'readonly', (store) => {
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  });

  const sessions = await executeTransaction('sessions', 'readonly', (store) => {
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  });

  const questions = await executeTransaction('questions', 'readonly', (store) => {
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
    });
  });

  return { learners, sessions, questions };
}

/**
 * Atomically imports learners, sessions, questions, and an optional backup log record
 * across all relevant stores in a single readwrite transaction.
 *
 * If any record fails or an error is thrown, the transaction is aborted and
 * all writes to learners, sessions, questions, and backups roll back completely.
 */
export function executeAtomicImport({ learners = [], sessions = [], questions = [], backupRecord = null }) {
  const REQUIRED_IDS = ['A', 'B', 'C', 'D'];

  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const storeNames = ['learners', 'sessions', 'questions', 'backups'];
      const tx = db.transaction(storeNames, 'readwrite');

      const learnersStore = tx.objectStore('learners');
      const sessionsStore = tx.objectStore('sessions');
      const questionsStore = tx.objectStore('questions');
      const backupsStore = tx.objectStore('backups');

      tx.oncomplete = () => {
        resolve({
          learnersCount: learners.length,
          sessionsCount: sessions.length,
          questionsCount: questions.length,
        });
      };

      tx.onerror = () => {
        reject(tx.error || new Error('Atomic import transaction failed. All changes rolled back.'));
      };

      tx.onabort = () => {
        reject(tx.error || new Error('Atomic import transaction was aborted. No partial changes were saved.'));
      };

      try {
        // 1. Put learners
        for (const learner of learners) {
          if (!learner || !learner.learnerId) {
            throw new Error('Atomic import failed: Invalid learner record missing learnerId.');
          }
          learnersStore.put(learner);
        }

        // 2. Put sessions
        for (const session of sessions) {
          if (!session || !session.sessionId) {
            throw new Error('Atomic import failed: Invalid session record missing sessionId.');
          }
          sessionsStore.put(session);
        }

        // 3. Put questions (verifying 4 options strictly)
        for (const q of questions) {
          if (!q || !q.questionId) {
            throw new Error('Atomic import failed: Invalid question record missing questionId.');
          }
          if (!Array.isArray(q.options) || q.options.length !== 4) {
            throw new Error(
              `Atomic import failed: Question "${q.questionId}" must have exactly 4 options.`
            );
          }
          const ids = q.options.map((opt) => (opt && typeof opt === 'object' ? opt.id : null));
          const hasExactIds = REQUIRED_IDS.every((id) => ids.includes(id)) && ids.length === 4;
          if (!hasExactIds) {
            throw new Error(
              `Atomic import failed: Question "${q.questionId}" options must have IDs A, B, C, D.`
            );
          }
          questionsStore.put(q);
        }

        // 4. Put backup log record
        if (backupRecord) {
          backupsStore.put(backupRecord);
        }
      } catch (err) {
        tx.abort();
        reject(err);
      }
    });
  });
}

/**
 * Saves a backup log record into the backups store.
 */
export function logBackupRecord(backupRecord) {
  const record = {
    backupId: backupRecord.backupId || `backup_${Date.now()}`,
    timestamp: backupRecord.timestamp || new Date().toISOString(),
    ...backupRecord,
  };

  return executeTransaction('backups', 'readwrite', (store) => {
    store.put(record);
    return record;
  });
}

/**
 * Clears and resets all data in the database (used in testing and explicit user wipe).
 */
export async function resetDatabase() {
  const stores = ['learners', 'sessions', 'questions', 'backups'];
  for (const s of stores) {
    await executeTransaction(s, 'readwrite', (store) => {
      store.clear();
    });
  }
  await initDefaultLearner();
  return true;
}
