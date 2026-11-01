/**
 * routes/formula.js — Formula Extraction & Intelligence Endpoints.
 *
 * Endpoints:
 * - POST /api/formula/extract: Extracts 1–5 distinct formulas from text, image, or both.
 * - POST /api/formula/validate-set: Enforces 1–5 formula limits, deduplication, and case preservation.
 * - POST /api/formula/analyze: Pedagogical formula analysis (M2/early M3 backward compatibility).
 */

const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { getTopicById, getChapterById } = require('../data/mathCurriculum');
const {
  extractFormulasWithGemini,
  analyzeFormulaWithGemini,
} = require('../services/gemini');
const { deduplicateFormulas } = require('../services/formulaNormalizer');

/**
 * Conditionally runs multer only when request is multipart/form-data.
 */
function handleUpload(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Image is too large. Maximum size is 5 MB.',
            code: 'FILE_TOO_LARGE',
          });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            error: err.message,
            code: 'INVALID_FILE_TYPE',
          });
        }
        return res.status(400).json({
          error: err.message || 'Image upload failed.',
          code: 'UPLOAD_ERROR',
        });
      }
      next();
    });
  } else {
    next();
  }
}

/**
 * POST /api/formula/extract
 * Extracts distinct formulas from text and/or image.
 */
router.post('/formula/extract', handleUpload, async (req, res) => {
  const startTime = Date.now();
  try {
    const { formulaText, chapterId, topicId } = req.body;
    const file = req.file;

    const trimmedText = typeof formulaText === 'string' ? formulaText.trim() : '';
    console.log(
      `[Formula Extract] Inbound request: chapter="${chapterId || ''}", topic="${topicId || ''}", hasImage=${Boolean(file)}, textLength=${trimmedText.length}`
    );

    // Validate chapter
    if (!chapterId || typeof chapterId !== 'string') {
      console.warn('[Formula Extract] Rejected: Missing or invalid chapterId');
      return res.status(400).json({
        error: 'Missing or invalid chapterId.',
        code: 'INVALID_CHAPTER_ID',
      });
    }

    const chapter = getChapterById(chapterId.trim());
    if (!chapter) {
      console.warn(`[Formula Extract] Rejected: Chapter "${chapterId}" not found`);
      return res.status(404).json({
        error: `Mathematics chapter '${chapterId}' not found.`,
        code: 'CHAPTER_NOT_FOUND',
      });
    }

    // Validate topic
    if (!topicId || typeof topicId !== 'string') {
      console.warn('[Formula Extract] Rejected: Missing or invalid topicId');
      return res.status(400).json({
        error: 'Missing or invalid topicId.',
        code: 'INVALID_TOPIC_ID',
      });
    }

    const topic = getTopicById(chapter.id, topicId.trim());
    if (!topic) {
      console.warn(`[Formula Extract] Rejected: Topic "${topicId}" not found in chapter "${chapter.title}"`);
      return res.status(404).json({
        error: `Topic '${topicId}' does not belong to chapter '${chapter.title}'.`,
        code: 'TOPIC_NOT_FOUND',
      });
    }

    // Validate input presence
    if (!trimmedText && !file) {
      console.warn('[Formula Extract] Rejected: Empty input (no text, no image)');
      return res.status(400).json({
        error: 'Please enter formula text or attach a formula image.',
        code: 'EMPTY_INPUT',
      });
    }

    if (trimmedText.length > 2000) {
      console.warn(`[Formula Extract] Rejected: Input too long (${trimmedText.length} chars)`);
      return res.status(400).json({
        error: 'Formula text exceeds the maximum limit of 2,000 characters.',
        code: 'INPUT_TOO_LONG',
      });
    }

    // Call Gemini for structured formula extraction
    console.log(`[Formula Extract] Gemini request started for topic="${topic.title}"`);
    const extractionResult = await extractFormulasWithGemini({
      formulaText: trimmedText,
      imageBuffer: file?.buffer,
      imageMimeType: file?.mimetype,
      chapterTitle: chapter.title,
      topicTitle: topic.title,
      topicDesc: topic.desc,
    });

    if (!extractionResult.isMathFormula) {
      console.warn(`[Formula Extract] Not a math formula: ${extractionResult.rejectionReason || 'Unknown'}`);
      return res.status(400).json({
        error:
          extractionResult.rejectionReason ||
          'No valid mathematical formulas, equations, or concepts were detected.',
        code: 'NOT_A_FORMULA',
      });
    }

    const formulas = deduplicateFormulas(extractionResult.formulas || []);

    if (formulas.length === 0) {
      console.warn('[Formula Extract] No formulas detected after deduplication');
      return res.status(400).json({
        error: 'No valid mathematical formulas could be identified in the submission.',
        code: 'NO_FORMULAS_DETECTED',
      });
    }

    const limitExceeded = formulas.length > 5;
    const message = limitExceeded
      ? `Limit Exceeded: ${formulas.length} formulas detected. LearnWell supports a maximum of 5 formulas per practice session. Please remove ${formulas.length - 5} formula${formulas.length - 5 === 1 ? '' : 's'} to continue.`
      : `${formulas.length} formula${formulas.length === 1 ? '' : 's'} extracted successfully.`;

    const durationMs = Date.now() - startTime;
    console.log(
      `[Formula Extract] Extraction succeeded in ${durationMs}ms: count=${formulas.length}, limitExceeded=${limitExceeded}`
    );

    return res.json({
      success: true,
      count: formulas.length,
      limitExceeded,
      formulas,
      message,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const status = err.status || 500;
    const code = err.code || 'INTERNAL_ERROR';
    console.error(
      `[Formula Extract] Extraction failed in ${durationMs}ms [status=${status}, code=${code}]: ${err.message}`
    );
    return res.status(status).json({
      error: err.message || 'An error occurred while extracting formulas.',
      code,
    });
  }
});

/**
 * POST /api/formula/validate-set
 * Enforces the 1–5 formula boundary on a user-submitted formula set before session confirmation.
 */
router.post('/formula/validate-set', (req, res) => {
  const { formulas } = req.body;

  if (!Array.isArray(formulas)) {
    return res.status(400).json({
      error: 'Formulas must be provided as an array.',
      code: 'INVALID_PAYLOAD',
    });
  }

  const deduplicated = deduplicateFormulas(formulas);

  // 1. Zero valid formulas: Blocked
  if (deduplicated.length === 0) {
    return res.status(400).json({
      error: 'Please enter or select at least one valid mathematical formula.',
      code: 'EMPTY_FORMULA_SET',
    });
  }

  // 2. More than 5 formulas: Rejected with clear count
  if (deduplicated.length > 5) {
    const excess = deduplicated.length - 5;
    return res.status(400).json({
      error: `Limit Exceeded: ${deduplicated.length} formulas detected. LearnWell supports a maximum of 5 formulas per practice session. Please remove ${excess} formula${excess === 1 ? '' : 's'} to continue.`,
      code: 'FORMULA_LIMIT_EXCEEDED',
      count: deduplicated.length,
    });
  }

  // 3. Exactly 1 to 5 valid formulas: Accepted
  return res.json({
    success: true,
    count: deduplicated.length,
    formulas: deduplicated,
  });
});

/**
 * POST /api/formula/analyze
 * Single-formula explanation endpoint (M2/early M3 backward compatibility).
 */
router.post('/formula/analyze', handleUpload, async (req, res) => {
  try {
    const { formulaText, chapterId, topicId } = req.body;
    const file = req.file;

    if (!chapterId || typeof chapterId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid chapterId.',
        code: 'INVALID_CHAPTER_ID',
      });
    }

    const chapter = getChapterById(chapterId.trim());
    if (!chapter) {
      return res.status(404).json({
        error: `Mathematics chapter '${chapterId}' not found.`,
        code: 'CHAPTER_NOT_FOUND',
      });
    }

    if (!topicId || typeof topicId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid topicId.',
        code: 'INVALID_TOPIC_ID',
      });
    }

    const topic = getTopicById(chapter.id, topicId.trim());
    if (!topic) {
      return res.status(404).json({
        error: `Topic '${topicId}' does not belong to chapter '${chapter.title}'.`,
        code: 'TOPIC_NOT_FOUND',
      });
    }

    const trimmedText = typeof formulaText === 'string' ? formulaText.trim() : '';
    if (!trimmedText && !file) {
      return res.status(400).json({
        error: 'Please enter formula text or attach a formula image.',
        code: 'EMPTY_INPUT',
      });
    }

    if (trimmedText.length > 2000) {
      return res.status(400).json({
        error: 'Formula text exceeds the maximum limit of 2,000 characters.',
        code: 'INPUT_TOO_LONG',
      });
    }

    const result = await analyzeFormulaWithGemini({
      formulaText: trimmedText,
      imageBuffer: file?.buffer,
      imageMimeType: file?.mimetype,
      chapterTitle: chapter.title,
      topicTitle: topic.title,
      topicDesc: topic.desc,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'An error occurred while analyzing the formula.',
      code: err.code || 'INTERNAL_ERROR',
    });
  }
});

module.exports = router;
