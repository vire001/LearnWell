/**
 * backup.js — Schema-Validated JSON Backup & Restore for LearnWell.
 *
 * Implements:
 * - Version 1 JSON Schema validation
 * - Exactly 4 options (A, B, C, D) validation for all questions
 * - Deterministic SHA-256 checksum generation and validation
 * - Scoped export (all learners or specific learner)
 * - Atomic restore across all stores with full rollback on failure
 * - Rejection of corrupted, forged, or incompatible backups
 *
 * Conforms to LearnWell Architecture Specification Version 3.4.
 */

import {
  dumpDatabase,
  getSessionsByLearner,
  getQuestionsBySession,
  getLearner,
  executeAtomicImport,
} from './storage.js';

export const BACKUP_SCHEMA_VERSION = 1;
export const REQUIRED_OPTION_IDS = ['A', 'B', 'C', 'D'];

/**
 * Deterministically serializes an object into a canonical JSON string
 * with alphabetically sorted keys at every nesting level.
 */
export function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(
    (key) => JSON.stringify(key) + ':' + canonicalJsonStringify(obj[key])
  );
  return '{' + pairs.join(',') + '}';
}

/**
 * Computes a deterministic SHA-256 hex checksum over a backup payload
 * (excluding the checksum field itself).
 */
export async function computeChecksum(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Cannot compute checksum of non-object payload.');
  }

  // Omit existing checksum from the computation
  const { checksum: _existingChecksum, ...contentToHash } = payload;
  const canonicalString = canonicalJsonStringify(contentToHash);

  const encoder = new TextEncoder();
  const dataUint8 = encoder.encode(canonicalString);

  const subtle =
    (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) ||
    (typeof window !== 'undefined' && window.crypto?.subtle);

  if (!subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not available in this environment.');
  }

  const hashBuffer = await subtle.digest('SHA-256', dataUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates the structure and data integrity of an imported backup object.
 * Returns { valid: boolean, errors: string[] }.
 */
export function validateBackupSchema(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Backup payload must be a non-null JSON object.'] };
  }

  // 1. Schema version check
  if (data.version !== BACKUP_SCHEMA_VERSION) {
    errors.push(
      `Unsupported backup schema version: ${data.version}. Expected version ${BACKUP_SCHEMA_VERSION}.`
    );
  }

  // 2. Export metadata
  if (typeof data.exportedAt !== 'string' || !data.exportedAt) {
    errors.push('Missing or invalid "exportedAt" timestamp.');
  }

  // 3. Checksum format validation
  if (!data.checksum || typeof data.checksum !== 'string' || data.checksum.length !== 64) {
    errors.push('Missing or invalid 64-character SHA-256 "checksum" in backup.');
  }

  // 4. Learners collection validation
  if (!Array.isArray(data.learners)) {
    errors.push('Missing "learners" array in backup.');
  } else {
    data.learners.forEach((learner, idx) => {
      if (!learner || typeof learner !== 'object') {
        errors.push(`Learner at index ${idx} is not an object.`);
      } else {
        if (!learner.learnerId || typeof learner.learnerId !== 'string') {
          errors.push(`Learner at index ${idx} is missing a valid "learnerId".`);
        }
        if (!learner.name || typeof learner.name !== 'string') {
          errors.push(`Learner at index ${idx} is missing a valid "name".`);
        }
      }
    });
  }

  // 5. Sessions collection validation
  if (!Array.isArray(data.sessions)) {
    errors.push('Missing "sessions" array in backup.');
  } else {
    data.sessions.forEach((session, idx) => {
      if (!session || typeof session !== 'object') {
        errors.push(`Session at index ${idx} is not an object.`);
      } else {
        if (!session.sessionId || typeof session.sessionId !== 'string') {
          errors.push(`Session at index ${idx} is missing a valid "sessionId".`);
        }
        if (!session.learnerId || typeof session.learnerId !== 'string') {
          errors.push(`Session at index ${idx} is missing a valid "learnerId".`);
        }
        if (!session.chapterId || typeof session.chapterId !== 'string') {
          errors.push(`Session at index ${idx} is missing a valid "chapterId".`);
        }
        if (!session.topicId || typeof session.topicId !== 'string') {
          errors.push(`Session at index ${idx} is missing a valid "topicId".`);
        }
      }
    });
  }

  // 6. Questions collection validation (strictly exactly 4 options: A, B, C, D)
  if (!Array.isArray(data.questions)) {
    errors.push('Missing "questions" array in backup.');
  } else {
    data.questions.forEach((q, idx) => {
      if (!q || typeof q !== 'object') {
        errors.push(`Question at index ${idx} is not an object.`);
      } else {
        if (!q.questionId || typeof q.questionId !== 'string') {
          errors.push(`Question at index ${idx} is missing a valid "questionId".`);
        }
        if (!q.sessionId || typeof q.sessionId !== 'string') {
          errors.push(`Question at index ${idx} is missing a valid "sessionId".`);
        }
        if (!q.statement || typeof q.statement !== 'string') {
          errors.push(`Question at index ${idx} is missing a valid "statement".`);
        }

        // Validate exactly 4 options
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          errors.push(
            `Question at index ${idx} ("${q.questionId || 'unknown'}") must have exactly 4 options (found ${Array.isArray(q.options) ? q.options.length : 0}).`
          );
        } else {
          const ids = q.options.map((opt) => (opt && typeof opt === 'object' ? opt.id : null));
          const hasExactIds =
            REQUIRED_OPTION_IDS.every((id) => ids.includes(id)) && ids.length === 4;

          if (!hasExactIds) {
            errors.push(
              `Question at index ${idx} ("${q.questionId}") options must have unique IDs exactly matching A, B, C, and D.`
            );
          }

          q.options.forEach((opt, optIdx) => {
            if (!opt || typeof opt !== 'object') {
              errors.push(`Question at index ${idx} option at index ${optIdx} is not an object.`);
            } else if (typeof opt.text !== 'string' || !opt.text.trim()) {
              errors.push(
                `Question at index ${idx} option "${opt.id || optIdx}" must have non-empty text.`
              );
            }
          });
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gathers data, constructs a Version 1 backup payload, and attaches a deterministic SHA-256 checksum.
 * Supports exporting all data or scoping to a single learner.
 */
export async function exportData({ learnerId = null } = {}) {
  let learners = [];
  let sessions = [];
  let questions = [];

  if (learnerId) {
    const learner = await getLearner(learnerId);
    if (!learner) {
      throw new Error(`Cannot export: Learner "${learnerId}" not found.`);
    }
    learners = [learner];
    sessions = await getSessionsByLearner(learnerId);

    for (const session of sessions) {
      const sessionQuestions = await getQuestionsBySession(session.sessionId);
      questions.push(...sessionQuestions);
    }
  } else {
    const dump = await dumpDatabase();
    learners = dump.learners;
    sessions = dump.sessions;
    questions = dump.questions;
  }

  const payloadWithoutChecksum = {
    version: BACKUP_SCHEMA_VERSION,
    app: 'LearnWell',
    exportedAt: new Date().toISOString(),
    exportScope: learnerId ? 'learner' : 'all',
    learnerId: learnerId || null,
    learners,
    sessions,
    questions,
  };

  const checksum = await computeChecksum(payloadWithoutChecksum);

  return {
    ...payloadWithoutChecksum,
    checksum,
  };
}

/**
 * Exports data and triggers a browser file download of the JSON backup.
 */
export async function exportBackupToFile({ learnerId = null, filename = null } = {}) {
  const data = await exportData({ learnerId });
  const jsonString = JSON.stringify(data, null, 2);

  const defaultFilename = `learnwell-backup-${learnerId || 'all'}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  const finalFilename = filename || defaultFilename;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return { filename: finalFilename, data };
}

/**
 * Validates, checks cryptographic checksum, and restores a backup payload into IndexedDB.
 * Restores all entities atomically in a single IndexedDB transaction.
 * If any error or validation issue occurs, the transaction rolls back completely.
 */
export async function importData(input) {
  let parsed = input;

  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (parseError) {
      throw new Error(`Failed to parse backup JSON: ${parseError.message}`);
    }
  }

  // 1. Schema structure validation
  const validation = validateBackupSchema(parsed);
  if (!validation.valid) {
    throw new Error(`Invalid LearnWell backup file:\n- ${validation.errors.join('\n- ')}`);
  }

  // 2. Cryptographic SHA-256 Checksum Verification
  const computedChecksum = await computeChecksum(parsed);
  if (parsed.checksum !== computedChecksum) {
    throw new Error(
      `Backup checksum verification failed: The backup data has been modified, corrupted, or forged.\nExpected: ${computedChecksum}\nFound:    ${parsed.checksum}`
    );
  }

  // 3. Prepare backup audit log entry
  const backupRecord = {
    backupId: `backup_import_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'import',
    scope: parsed.exportScope || 'all',
    sourceExportedAt: parsed.exportedAt,
    checksum: parsed.checksum,
    stats: {
      learnersCount: parsed.learners.length,
      sessionsCount: parsed.sessions.length,
      questionsCount: parsed.questions.length,
    },
  };

  // 4. Atomic multi-store import (single transaction across all stores)
  const result = await executeAtomicImport({
    learners: parsed.learners,
    sessions: parsed.sessions,
    questions: parsed.questions,
    backupRecord,
  });

  return {
    success: true,
    imported: {
      learners: result.learnersCount,
      sessions: result.sessionsCount,
      questions: result.questionsCount,
    },
    checksum: parsed.checksum,
  };
}
