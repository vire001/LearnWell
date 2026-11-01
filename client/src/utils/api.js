/**
 * api.js — Lightweight API helper.
 *
 * Centralises the base URL and provides a thin wrapper around fetch.
 * In development, Vite's proxy forwards /api/* to the Express server.
 */

const BASE_URL = '/api';

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

/**
 * Extracts 1–5 distinct mathematical formulas using the backend AI endpoint.
 * Supports text-only (JSON) and image/combined inputs (FormData).
 * Includes 35-second client-side timeout and manual cancellation via AbortSignal.
 */
export async function extractFormulas({
  formulaText,
  imageFile,
  chapterId,
  topicId,
  signal,
}) {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort('timeout');
  }, 35000);

  const onCallerAbort = () => {
    controller.abort('manual');
  };

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      const cancelError = new Error('Formula extraction was cancelled.');
      cancelError.name = 'AbortError';
      cancelError.code = 'CANCELLED';
      throw cancelError;
    }
    signal.addEventListener('abort', onCallerAbort, { once: true });
  }

  try {
    let response;

    if (imageFile) {
      const formData = new FormData();
      if (formulaText) formData.append('formulaText', formulaText);
      formData.append('chapterId', chapterId);
      formData.append('topicId', topicId);
      formData.append('image', imageFile);

      response = await fetch(`${BASE_URL}/formula/extract`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
    } else {
      response = await fetch(`${BASE_URL}/formula/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formulaText,
          chapterId,
          topicId,
        }),
        signal: controller.signal,
      });
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(result.error || `Extraction failed with status ${response.status}`);
      error.code = result.code;
      error.status = response.status;
      error.count = result.count;
      throw error;
    }

    return result;
  } catch (err) {
    if (timedOut || controller.signal.reason === 'timeout') {
      const timeoutError = new Error(
        'Formula extraction timed out after 35 seconds. LearnWell AI took too long to respond. Please check your connection and try again.'
      );
      timeoutError.name = 'TimeoutError';
      timeoutError.code = 'TIMEOUT';
      timeoutError.status = 504;
      throw timeoutError;
    }

    if (signal?.aborted || controller.signal.reason === 'manual' || err.name === 'AbortError') {
      const cancelError = new Error('Formula extraction was cancelled.');
      cancelError.name = 'AbortError';
      cancelError.code = 'CANCELLED';
      throw cancelError;
    }

    if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
      const netError = new Error(
        'Unable to connect to the LearnWell server. Please verify the server is running.'
      );
      netError.code = 'NETWORK_ERROR';
      netError.status = 0;
      throw netError;
    }

    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', onCallerAbort);
    }
  }
}

/**
 * Validates a set of formulas against the strict 1–5 limit and mathematical deduplication.
 */
export async function validateFormulaSet(formulas) {
  const response = await fetch(`${BASE_URL}/formula/validate-set`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ formulas }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.error || `Validation failed with status ${response.status}`);
    error.code = result.code;
    error.status = response.status;
    error.count = result.count;
    throw error;
  }

  return result;
}

/**
 * Analyzes a formula or concept using the backend AI endpoint (backward compatibility).
 * Supports text-only (JSON) and image/combined inputs (FormData).
 */
export async function analyzeFormula({ formulaText, imageFile, chapterId, topicId }) {
  let response;

  if (imageFile) {
    const formData = new FormData();
    if (formulaText) formData.append('formulaText', formulaText);
    formData.append('chapterId', chapterId);
    formData.append('topicId', topicId);
    formData.append('image', imageFile);

    response = await fetch(`${BASE_URL}/formula/analyze`, {
      method: 'POST',
      body: formData,
    });
  } else {
    response = await fetch(`${BASE_URL}/formula/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formulaText,
        chapterId,
        topicId,
      }),
    });
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.error || `Analysis request failed with status ${response.status}`);
    error.code = result.code;
    error.status = response.status;
    throw error;
  }

  return result.data;
}

/**
 * Generates 6–8 MCQs for a confirmed formula using the backend AI practice endpoint.
 */
export async function generateFormulaQuestions({ formula, chapterTitle, topicTitle, count = 8 }) {
  const response = await fetch(`${BASE_URL}/practice/generate-formula`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      formula,
      chapterTitle,
      topicTitle,
      count,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.error || `Question generation failed with status ${response.status}`);
    error.code = result.code;
    error.status = response.status;
    error.retryAfter = result.retryAfter;
    throw error;
  }

  return result;
}

/**
 * Generates mixed practice MCQs for 2–5 confirmed formulas.
 */
export async function generateMixedQuestions({ formulas, chapterTitle, topicTitle }) {
  const response = await fetch(`${BASE_URL}/practice/generate-mixed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      formulas,
      chapterTitle,
      topicTitle,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.error || `Mixed question generation failed with status ${response.status}`);
    error.code = result.code;
    error.status = response.status;
    error.retryAfter = result.retryAfter;
    throw error;
  }

  return result;
}
