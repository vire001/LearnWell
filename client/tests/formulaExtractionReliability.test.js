/**
 * formulaExtractionReliability.test.js
 *
 * Deterministic automated tests for Formula Extraction reliability, timeout, and cancellation:
 * 1. Successful extraction.
 * 2. Frontend timeout after 35 seconds (using fake timers).
 * 3. Manual cancellation.
 * 4. HTTP 429 response handling.
 * 5. HTTP 503 response handling.
 * 6. Backend timeout handling (status 504 / TIMEOUT).
 * 7. Loading state reset after errors.
 * 8. Duplicate submission prevention while active.
 * 9. Cancellation followed by a new extraction request.
 * 10. Formula validation and deduplication regression.
 *
 * Zero live Gemini API calls are made during these tests.
 */

import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { extractFormulas } from '../src/utils/api.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const geminiService = require('../../server/services/gemini.js');
const formulaNormalizer = require('../../server/services/formulaNormalizer.js');

describe('M3 Formula Extraction Reliability & Timeout Suite', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // Test 1: Successful extraction
  test('1. Successful extraction parses valid formula response', async () => {
    const mockData = {
      success: true,
      count: 2,
      limitExceeded: false,
      formulas: [
        { id: 'f1', name: 'Quadratic Formula', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', rawText: 'x = (-b +- sqrt(b^2-4ac))/(2a)' },
        { id: 'f2', name: 'Discriminant', latex: '\\Delta = b^2 - 4ac', rawText: 'D = b^2 - 4ac' },
      ],
      message: '2 formulas extracted successfully.',
    };

    globalThis.fetch = async (url, options) => {
      assert.match(url, /\/api\/formula\/extract$/);
      assert.strictEqual(options.method, 'POST');
      const body = JSON.parse(options.body);
      assert.strictEqual(body.chapterId, 'algebra');
      assert.strictEqual(body.topicId, 'quadratic-equations');
      assert.strictEqual(body.formulaText, 'x = (-b +- sqrt(b^2 - 4ac))/(2a)');
      return {
        ok: true,
        status: 200,
        json: async () => mockData,
      };
    };

    const result = await extractFormulas({
      formulaText: 'x = (-b +- sqrt(b^2 - 4ac))/(2a)',
      chapterId: 'algebra',
      topicId: 'quadratic-equations',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.count, 2);
    assert.strictEqual(result.formulas.length, 2);
    assert.strictEqual(result.formulas[0].id, 'f1');
    assert.strictEqual(result.formulas[1].id, 'f2');
  });

  // Test 2: Frontend timeout after 35 seconds
  test('2. Frontend timeout aborts after 35 seconds and throws TimeoutError', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });

    globalThis.fetch = (url, options) => {
      return new Promise((resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    };

    const promise = extractFormulas({
      formulaText: 'test formula',
      chapterId: 'algebra',
      topicId: 'quadratic-equations',
    });

    // Advance fake timers by 35,000ms
    t.mock.timers.tick(35000);

    await assert.rejects(
      async () => await promise,
      (err) => {
        assert.strictEqual(err.name, 'TimeoutError');
        assert.strictEqual(err.code, 'TIMEOUT');
        assert.strictEqual(err.status, 504);
        assert.match(err.message, /timed out after 35 seconds/i);
        return true;
      }
    );
  });

  // Test 3: Manual cancellation
  test('3. Manual cancellation via AbortSignal aborts and throws CANCELLED error', async () => {
    const controller = new AbortController();

    globalThis.fetch = (url, options) => {
      return new Promise((resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    };

    const promise = extractFormulas({
      formulaText: 'test formula',
      chapterId: 'algebra',
      topicId: 'quadratic-equations',
      signal: controller.signal,
    });

    // Immediately trigger manual cancellation
    controller.abort();

    await assert.rejects(
      async () => await promise,
      (err) => {
        assert.strictEqual(err.name, 'AbortError');
        assert.strictEqual(err.code, 'CANCELLED');
        assert.match(err.message, /cancelled/i);
        return true;
      }
    );
  });

  // Test 4: HTTP 429 rate limit response
  test('4. HTTP 429 response propagates QUOTA_EXCEEDED with status 429', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'Gemini API free tier rate limit reached. Generation paused. Please wait a moment before trying again.',
        code: 'QUOTA_EXCEEDED',
      }),
    });

    await assert.rejects(
      async () =>
        await extractFormulas({
          formulaText: 'x^2 = 4',
          chapterId: 'algebra',
          topicId: 'quadratic-equations',
        }),
      (err) => {
        assert.strictEqual(err.status, 429);
        assert.strictEqual(err.code, 'QUOTA_EXCEEDED');
        assert.match(err.message, /rate limit reached/i);
        return true;
      }
    );
  });

  // Test 5: HTTP 503 high demand response
  test('5. HTTP 503 response propagates HIGH_DEMAND with status 503', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 503,
      json: async () => ({
        error: 'The Gemini Free Tier service is currently experiencing high demand. No paid resources will be used. Please wait a moment and retry.',
        code: 'HIGH_DEMAND',
      }),
    });

    await assert.rejects(
      async () =>
        await extractFormulas({
          formulaText: 'x^2 = 4',
          chapterId: 'algebra',
          topicId: 'quadratic-equations',
        }),
      (err) => {
        assert.strictEqual(err.status, 503);
        assert.strictEqual(err.code, 'HIGH_DEMAND');
        assert.match(err.message, /high demand/i);
        return true;
      }
    );
  });

  // Test 6: Backend Gemini error mapping in handleGeminiError
  test('6. Backend handleGeminiError maps timeouts, deadlines, and preserves error taxonomy', () => {
    assert.strictEqual(geminiService.ACTIVE_MODEL, 'gemini-3.8-flash');
    const { handleGeminiError } = geminiService;
    const EXPECTED_TIMEOUT_MSG = 'Gemini API request timed out. The service took too long to respond. Please try again.';

    // 1. HTTP 504 maps to TIMEOUT
    const err504 = new Error('Gateway Timeout');
    err504.status = 504;
    assert.throws(
      () => handleGeminiError(err504),
      (err) => {
        assert.strictEqual(err.status, 504);
        assert.strictEqual(err.code, 'TIMEOUT');
        assert.strictEqual(err.message, EXPECTED_TIMEOUT_MSG);
        return true;
      }
    );

    // 2. DEADLINE_EXCEEDED maps to TIMEOUT
    const errDeadline = new Error('The operation was interrupted');
    errDeadline.code = 'DEADLINE_EXCEEDED';
    assert.throws(
      () => handleGeminiError(errDeadline),
      (err) => {
        assert.strictEqual(err.status, 504);
        assert.strictEqual(err.code, 'TIMEOUT');
        assert.strictEqual(err.message, EXPECTED_TIMEOUT_MSG);
        return true;
      }
    );

    // 2b. err.error.status = 'DEADLINE_EXCEEDED'
    const errNestedDeadline = new Error('Nested failure');
    errNestedDeadline.error = { status: 'DEADLINE_EXCEEDED' };
    assert.throws(
      () => handleGeminiError(errNestedDeadline),
      (err) => {
        assert.strictEqual(err.status, 504);
        assert.strictEqual(err.code, 'TIMEOUT');
        assert.strictEqual(err.message, EXPECTED_TIMEOUT_MSG);
        return true;
      }
    );

    // 3. Mixed-case deadline/timeout messages map correctly
    const mixedCaseMessages = [
      'Deadline expired before operation could complete.',
      'DEADLINE_EXCEEDED occurred in backend upstream',
      'Request TiMeOuT after waiting for generation',
      'Operation AbOrTeD by upstream client',
    ];

    for (const msg of mixedCaseMessages) {
      const mixedErr = new Error(msg);
      assert.throws(
        () => handleGeminiError(mixedErr),
        (err) => {
          assert.strictEqual(err.status, 504);
          assert.strictEqual(err.code, 'TIMEOUT');
          assert.strictEqual(err.message, EXPECTED_TIMEOUT_MSG);
          return true;
        }
      );
    }

    // 4. Existing AbortError, TimeoutError, and ETIMEDOUT handling still works
    const abortErr = new Error('abort');
    abortErr.name = 'AbortError';
    assert.throws(
      () => handleGeminiError(abortErr),
      (err) => {
        assert.strictEqual(err.status, 504);
        assert.strictEqual(err.code, 'TIMEOUT');
        assert.strictEqual(err.message, EXPECTED_TIMEOUT_MSG);
        return true;
      }
    );

    const timeoutNameErr = new Error('timeout name');
    timeoutNameErr.name = 'TimeoutError';
    assert.throws(
      () => handleGeminiError(timeoutNameErr),
      (err) => {
        assert.strictEqual(err.status, 504);
        assert.strictEqual(err.code, 'TIMEOUT');
        assert.strictEqual(err.message, EXPECTED_TIMEOUT_MSG);
        return true;
      }
    );

    const etimedoutErr = new Error('connect ETIMEDOUT 142.250.190.42:443');
    etimedoutErr.code = 'ETIMEDOUT';
    assert.throws(
      () => handleGeminiError(etimedoutErr),
      (err) => {
        assert.strictEqual(err.status, 504);
        assert.strictEqual(err.code, 'TIMEOUT');
        assert.strictEqual(err.message, EXPECTED_TIMEOUT_MSG);
        return true;
      }
    );

    // 5. HTTP 429 remains QUOTA_EXCEEDED
    const quotaErr = new Error('Resource exhausted');
    quotaErr.status = 429;
    assert.throws(
      () => handleGeminiError(quotaErr),
      (err) => {
        assert.strictEqual(err.status, 429);
        assert.strictEqual(err.code, 'QUOTA_EXCEEDED');
        assert.match(err.message, /rate limit reached/i);
        return true;
      }
    );

    // 6. HTTP 503 remains HIGH_DEMAND
    const demandErr = new Error('Service Unavailable');
    demandErr.status = 503;
    assert.throws(
      () => handleGeminiError(demandErr),
      (err) => {
        assert.strictEqual(err.status, 503);
        assert.strictEqual(err.code, 'HIGH_DEMAND');
        assert.match(err.message, /high demand/i);
        return true;
      }
    );

    // 7. Other genuine errors retain their existing classifications
    const authErr = new Error('API key not valid');
    authErr.status = 401;
    assert.throws(
      () => handleGeminiError(authErr),
      (err) => {
        assert.strictEqual(err.status, 401);
        assert.strictEqual(err.code, 'AUTH_ERROR');
        return true;
      }
    );

    const missingKeyErr = new Error('GEMINI_API_KEY is not configured on the server.');
    missingKeyErr.code = 'MISSING_API_KEY';
    assert.throws(
      () => handleGeminiError(missingKeyErr),
      (err) => {
        assert.strictEqual(err.code, 'MISSING_API_KEY');
        return true;
      }
    );

    const genericErr = new Error('Invalid JSON received');
    genericErr.status = 400;
    assert.throws(
      () => handleGeminiError(genericErr),
      (err) => {
        assert.strictEqual(err.status, 400);
        assert.strictEqual(err.code, 'AI_SERVICE_ERROR');
        assert.strictEqual(err.message, 'Invalid JSON received');
        return true;
      }
    );
  });

  // Test 7: Loading state reset after errors
  test('7. Loading state is always reset to false after errors', async () => {
    let loading = false;
    let error = null;

    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'AI service error.', code: 'AI_SERVICE_ERROR' }),
    });

    // Simulated component action mimicking handleExtractSubmit
    const execute = async () => {
      loading = true;
      error = null;
      try {
        await extractFormulas({
          formulaText: 'x = 1',
          chapterId: 'algebra',
          topicId: 'quadratic-equations',
        });
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
    };

    assert.strictEqual(loading, false);
    await execute();
    assert.strictEqual(loading, false);
    assert.strictEqual(error, 'AI service error.');
  });

  // Test 8: Duplicate submission prevention
  test('8. Duplicate submissions are prevented while an extraction is active', async () => {
    let fetchCallCount = 0;
    let resolveFirst;

    globalThis.fetch = () => {
      fetchCallCount++;
      return new Promise((resolve) => {
        resolveFirst = resolve;
      });
    };

    let loading = false;
    let abortController = null;

    const submit = async () => {
      if (loading || abortController) return false;
      const controller = new AbortController();
      abortController = controller;
      loading = true;

      try {
        await extractFormulas({
          formulaText: 'x=1',
          chapterId: 'algebra',
          topicId: 'quadratic-equations',
          signal: controller.signal,
        });
        return true;
      } finally {
        if (abortController === controller) abortController = null;
        loading = false;
      }
    };

    // First submit starts
    const p1 = submit();
    assert.strictEqual(loading, true);
    assert.strictEqual(fetchCallCount, 1);

    // Second submit while active should be ignored
    const p2Result = await submit();
    assert.strictEqual(p2Result, false);
    assert.strictEqual(fetchCallCount, 1); // No second fetch triggered

    // Complete first
    resolveFirst({
      ok: true,
      status: 200,
      json: async () => ({ success: true, count: 1, formulas: [{ id: 'f1', name: 'Formula 1', latex: 'x=1', rawText: 'x=1' }] }),
    });

    const p1Result = await p1;
    assert.strictEqual(p1Result, true);
    assert.strictEqual(loading, false);
    assert.strictEqual(abortController, null);
  });

  // Test 9: Cancellation followed by a new extraction request
  test('9. Cancellation resets state and allows a subsequent extraction request', async () => {
    let fetchCallCount = 0;
    let firstAbortHandled = false;

    globalThis.fetch = (url, options) => {
      fetchCallCount++;
      if (fetchCallCount === 1) {
        return new Promise((resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            firstAbortHandled = true;
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }

      // Second call succeeds
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          count: 1,
          formulas: [{ id: 'f1', name: 'New Formula', latex: 'E = mc^2', rawText: 'E = mc^2' }],
        }),
      });
    };

    let loading = false;
    let error = null;
    let activeController = null;
    let formulas = [];

    const startExtraction = async (text) => {
      if (loading || activeController) return;
      const controller = new AbortController();
      activeController = controller;
      loading = true;
      error = null;

      try {
        const res = await extractFormulas({
          formulaText: text,
          chapterId: 'algebra',
          topicId: 'quadratic-equations',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        formulas = res.formulas;
      } catch (err) {
        if (err.name === 'AbortError' || err.code === 'CANCELLED' || controller.signal.aborted) {
          return;
        }
        error = err.message;
      } finally {
        if (activeController === controller) activeController = null;
        loading = false;
      }
    };

    const cancelExtraction = () => {
      if (activeController) {
        activeController.abort();
        activeController = null;
      }
      loading = false;
      error = null;
    };

    // 1. Start first extraction
    const p1 = startExtraction('initial formula');
    assert.strictEqual(loading, true);
    assert.strictEqual(fetchCallCount, 1);

    // 2. User clicks Cancel & Return
    cancelExtraction();
    assert.strictEqual(loading, false);
    assert.strictEqual(error, null); // No error banner on cancel
    await p1;
    assert.strictEqual(firstAbortHandled, true);

    // 3. User submits a second extraction request
    await startExtraction('E = mc^2');
    assert.strictEqual(fetchCallCount, 2);
    assert.strictEqual(loading, false);
    assert.strictEqual(error, null);
    assert.strictEqual(formulas.length, 1);
    assert.strictEqual(formulas[0].name, 'New Formula');
  });

  // Test 10: Formula validation and deduplication regression
  test('10. Formula validation, deduplication, and case preservation preserve invariants', () => {
    const rawFormulas = [
      { id: '1', name: 'Formula A', latex: 'A = \\pi r^2', rawText: 'A = pi * r^2' },
      { id: '2', name: 'Formula a', latex: 'a = \\pi r^2', rawText: 'a = pi * r^2' }, // Distinct casing (A vs a)
      { id: '3', name: 'Formula A Dup', latex: 'A = \\pi r^2', rawText: 'A = pi * r^2' }, // Exact duplicate
    ];

    const deduplicated = formulaNormalizer.deduplicateFormulas(rawFormulas);

    // Exactly 2 distinct formulas preserved: A and a are kept, duplicate A is removed
    assert.strictEqual(deduplicated.length, 2);
    assert.strictEqual(deduplicated[0].id, 'f1');
    assert.strictEqual(deduplicated[0].latex, 'A = \\pi r^2');
    assert.strictEqual(deduplicated[1].id, 'f2');
    assert.strictEqual(deduplicated[1].latex, 'a = \\pi r^2');
  });
});
