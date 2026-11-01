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
 */
export async function extractFormulas({ formulaText, imageFile, chapterId, topicId }) {
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
