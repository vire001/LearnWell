/**
 * routes/practice.js — API Routes for AI Practice Question Generation.
 *
 * Implements Section 5, 6, 7 & 8 of LearnWell Architecture Version 3.4:
 * - POST /practice/generate-formula: Generates 6–8 MCQs for a single formula.
 * - POST /practice/generate-mixed: Generates mixed practice MCQs per Section 5.A matrix.
 * - Independent deterministic validation of every question before acceptance.
 * - Formula anonymity enforced for mixed practice problem statements.
 * - Quota-safe 429 and 503 error responses with retryAfter metadata.
 */

const express = require('express');
const router = express.Router();
const {
  generateQuestionsForFormula,
  generateMixedPracticeQuestions,
} = require('../services/gemini');
const { validateQuestion } = require('../services/questionValidator');

/**
 * Authoritative Mixed Practice Matrix (Section 5.A)
 */
function getMixedPracticeCount(formulaCount) {
  switch (formulaCount) {
    case 1:
      return 0;
    case 2:
      return 4;
    case 3:
      return 5;
    case 4:
      return 6;
    case 5:
      return 8;
    default:
      return 0;
  }
}

/**
 * POST /practice/generate-formula
 * Generates 6–8 independently verified MCQs for a confirmed formula.
 */
router.post('/practice/generate-formula', async (req, res) => {
  try {
    const { formula, chapterTitle, topicTitle, count = 8 } = req.body;

    if (!formula || !formula.id || (!formula.latex && !formula.rawText && !formula.name)) {
      return res.status(400).json({
        error: 'A valid formula object with id, name, and mathematical expression is required.',
        code: 'INVALID_FORMULA',
      });
    }

    const targetCount = Math.min(8, Math.max(6, parseInt(count, 10) || 8));

    // Call Gemini with schema
    const result = await generateQuestionsForFormula({
      formula,
      chapterTitle,
      topicTitle,
      count: targetCount,
    });

    const candidateQuestions = Array.isArray(result?.questions) ? result.questions : [];
    const validQuestions = [];
    const rejectedQuestions = [];

    // Strictly validate every question with our deterministic engine
    for (const q of candidateQuestions) {
      // Ensure formulaId is set
      q.formulaId = formula.id;
      q.formulaText = formula.latex || formula.rawText || formula.name;

      const validation = validateQuestion(q);
      if (validation.isValid) {
        // Enforce independently verified answer
        q.correctAnswer = validation.verifiedOptionId;
        q.verification = {
          verified: true,
          method: validation.method,
          template: validation.template,
        };
        validQuestions.push(q);
      } else {
        rejectedQuestions.push({
          questionId: q.questionId,
          reason: validation.reason,
        });
      }
    }

    // Return the verified batch
    return res.json({
      success: true,
      formulaId: formula.id,
      totalRequested: targetCount,
      totalValidated: validQuestions.length,
      rejectedCount: rejectedQuestions.length,
      rejectedDetails: rejectedQuestions,
      questions: validQuestions,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to generate practice questions.',
      code: err.code || 'GENERATION_ERROR',
      retryAfter: err.retryAfter,
    });
  }
});

/**
 * POST /practice/generate-mixed
 * Generates mixed practice MCQs synthesizing 2–5 confirmed formulas.
 * Enforces Section 5.A quantity matrix and statement anonymity.
 */
router.post('/practice/generate-mixed', async (req, res) => {
  try {
    const { formulas, chapterTitle, topicTitle } = req.body;

    if (!Array.isArray(formulas) || formulas.length === 0) {
      return res.status(400).json({
        error: 'An array of confirmed formulas is required for mixed practice.',
        code: 'INVALID_FORMULAS',
      });
    }

    if (formulas.length === 1) {
      return res.json({
        success: true,
        formulaId: 'mixed',
        totalRequested: 0,
        totalValidated: 0,
        questions: [],
        message: 'Single formula sessions have 0 mixed practice questions (Section 5.A).',
      });
    }

    if (formulas.length > 5) {
      return res.status(400).json({
        error: 'Mixed practice supports a maximum of 5 formulas.',
        code: 'TOO_MANY_FORMULAS',
      });
    }

    const targetCount = getMixedPracticeCount(formulas.length);

    const result = await generateMixedPracticeQuestions({
      formulas,
      chapterTitle,
      topicTitle,
      count: targetCount,
    });

    const candidateQuestions = Array.isArray(result?.questions) ? result.questions : [];
    const validQuestions = [];
    const rejectedQuestions = [];

    for (const q of candidateQuestions) {
      // Validate question independently
      const validation = validateQuestion(q);
      if (validation.isValid) {
        q.correctAnswer = validation.verifiedOptionId;
        q.verification = {
          verified: true,
          method: validation.method,
          template: validation.template,
        };

        // Section 5.C Anonymity Check:
        // Ensure problem statement does not leak formula name
        for (const f of formulas) {
          if (f.name && f.name.length > 3) {
            const regex = new RegExp(`\\b${f.name}\\b`, 'gi');
            if (regex.test(q.statement)) {
              // Obfuscate explicit formula name leak in problem statement
              q.statement = q.statement.replace(regex, 'the standard formula');
            }
          }
        }

        // Keep internal formulaId for post-practice analytics
        if (!q.formulaId || !formulas.some((f) => f.id === q.formulaId)) {
          q.formulaId = formulas[0].id;
        }

        validQuestions.push(q);
      } else {
        rejectedQuestions.push({
          questionId: q.questionId,
          reason: validation.reason,
        });
      }
    }

    return res.json({
      success: true,
      formulaId: 'mixed',
      totalRequested: targetCount,
      totalValidated: validQuestions.length,
      rejectedCount: rejectedQuestions.length,
      rejectedDetails: rejectedQuestions,
      questions: validQuestions,
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Failed to generate mixed practice questions.',
      code: err.code || 'GENERATION_ERROR',
      retryAfter: err.retryAfter,
    });
  }
});

module.exports = router;
