/**
 * services/gemini.js — Official Google GenAI SDK Service for Formula Intelligence.
 *
 * Utilizes the official @google/genai SDK with the Google AI Studio Free Tier.
 * Uses exclusively the verified free model `gemini-3.8-flash` with zero automatic fallback.
 * Enforces structured JSON output matching LearnWell's Version 3.4 architecture.
 */

const { GoogleGenAI } = require('@google/genai');
const { deduplicateFormulas } = require('./formulaNormalizer');

// Exclusive model - No automatic fallback model per Version 3.4
const ACTIVE_MODEL = 'gemini-3.8-flash';

const FORMULA_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    isMathFormula: {
      type: 'boolean',
      description:
        'True if the input contains one or more genuine mathematical formulas, equations, or concepts. False if non-mathematical, greeting, gibberish, or irrelevant.',
    },
    rejectionReason: {
      type: 'string',
      description:
        'If isMathFormula is false, explain politely why extraction cannot proceed. Leave empty if valid.',
    },
    formulas: {
      type: 'array',
      description:
        'List of distinct mathematical formulas extracted from the text and/or image.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier, e.g. f1, f2' },
          name: {
            type: 'string',
            description:
              'Concise descriptive name of the formula (e.g. "Quadratic Formula", "Discriminant", "Vertex Formula")',
          },
          latex: {
            type: 'string',
            description: 'Standard, cleanly formatted LaTeX representation for KaTeX display',
          },
          rawText: {
            type: 'string',
            description: 'Plain-text / ASCII representation of the formula',
          },
        },
        required: ['id', 'name', 'latex', 'rawText'],
      },
    },
  },
  required: ['isMathFormula', 'formulas'],
};

const FORMULA_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    isMathFormula: {
      type: 'boolean',
      description:
        'True if input represents a genuine mathematical formula, concept, or problem statement. False if non-mathematical, greeting, gibberish, or irrelevant.',
    },
    rejectionReason: {
      type: 'string',
      description:
        'If isMathFormula is false or ambiguous, explain politely why analysis cannot proceed and prompt for valid input. Leave empty if valid.',
    },
    canonicalFormula: {
      type: 'string',
      description: 'The standard, cleanly formatted representation of the formula or concept.',
    },
    meaning: {
      type: 'string',
      description: 'Student-friendly explanation of what the formula represents and its intuition.',
    },
    conditions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Mathematical domains, constraints, and restrictions under which the formula is valid.',
    },
    whenToUse: {
      type: 'string',
      description: 'Guidance on problem types and scenarios where this formula should be applied.',
    },
    recognitionClues: {
      type: 'array',
      items: { type: 'string' },
      description: 'Keywords, question patterns, or structural cues indicating this formula is needed.',
    },
    relatedFormulas: {
      type: 'array',
      items: { type: 'string' },
      description: 'Directly related, corollary, or foundational formulas.',
    },
    solvedExample: {
      type: 'object',
      properties: {
        problem: {
          type: 'string',
          description: 'A realistic textbook or exam problem demonstrating this formula.',
        },
        stepByStep: {
          type: 'array',
          items: { type: 'string' },
          description: 'Step-by-step mathematical solution with calculations verified for accuracy.',
        },
        finalAnswer: {
          type: 'string',
          description: 'The final evaluated answer with units if applicable.',
        },
      },
      required: ['problem', 'stepByStep', 'finalAnswer'],
    },
    commonMistakes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Frequent student pitfalls, sign errors, domain oversights, or misapplications.',
    },
  },
  required: [
    'isMathFormula',
    'canonicalFormula',
    'meaning',
    'conditions',
    'whenToUse',
    'recognitionClues',
    'relatedFormulas',
    'solvedExample',
    'commonMistakes',
  ],
};

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    const error = new Error(
      'GEMINI_API_KEY is not configured on the server. Please add your key to server/.env.'
    );
    error.code = 'MISSING_API_KEY';
    error.status = 500;
    throw error;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Maps upstream Gemini errors to standard LearnWell errors adhering to Free Tier safety.
 */
function handleGeminiError(err) {
  // 1. Quota / Rate Throttling (429)
  if (
    err.status === 429 ||
    err.message?.includes('RESOURCE_EXHAUSTED') ||
    err.message?.includes('quota')
  ) {
    let retryAfterSeconds = 60;
    if (err.headers?.get?.('retry-after')) {
      const parsed = parseInt(err.headers.get('retry-after'), 10);
      if (!Number.isNaN(parsed) && parsed > 0) retryAfterSeconds = parsed;
    } else if (err.retryAfter) {
      retryAfterSeconds = parseInt(err.retryAfter, 10) || 60;
    }
    const quotaErr = new Error(
      'Gemini API free tier rate limit reached. Generation paused. Please wait a moment before trying again.'
    );
    quotaErr.status = 429;
    quotaErr.code = 'QUOTA_EXCEEDED';
    quotaErr.retryAfter = retryAfterSeconds;
    throw quotaErr;
  }

  // 2. High Demand / Temporary Unavailable (503)
  if (err.status === 503 || err.message?.includes('UNAVAILABLE')) {
    const demandErr = new Error(
      'The Gemini Free Tier service is currently experiencing high demand. No paid resources will be used. Please wait a moment and retry.'
    );
    demandErr.status = 503;
    demandErr.code = 'HIGH_DEMAND';
    throw demandErr;
  }

  // 3. Auth Errors (401/403)
  if (err.status === 401 || err.status === 403 || err.message?.includes('API_KEY_INVALID')) {
    const authErr = new Error(
      'Gemini API authentication failed. Please verify the API key configured in server/.env.'
    );
    authErr.status = 401;
    authErr.code = 'AUTH_ERROR';
    throw authErr;
  }

  if (err.code === 'MISSING_API_KEY') {
    throw err;
  }

  let cleanMessage = err.message || 'AI service error.';
  try {
    const parsedMsg = JSON.parse(cleanMessage);
    if (parsedMsg.error?.message) {
      cleanMessage = parsedMsg.error.message;
    }
  } catch {
    // Message is plain text
  }

  const genErr = new Error(cleanMessage);
  genErr.status = err.status || 500;
  genErr.code = 'AI_SERVICE_ERROR';
  throw genErr;
}

/**
 * Extracts 1–5 distinct mathematical formulas from text, image, or combined input.
 * Strictly preserves exact variable letter casing.
 */
async function extractFormulasWithGemini({
  formulaText,
  imageBuffer,
  imageMimeType,
  chapterTitle,
  topicTitle,
  topicDesc,
}) {
  const ai = getClient();
  const contents = [];

  if (imageBuffer && imageMimeType) {
    contents.push({
      inlineData: {
        mimeType: imageMimeType,
        data: imageBuffer.toString('base64'),
      },
    });
  }

  let promptText = `You are LearnWell's expert Mathematics tutor.
Extract the distinct mathematical formulas, equations, or theorems from the user's input in the context of:
- Chapter: ${chapterTitle || 'Mathematics'}
- Topic: ${topicTitle || 'General Topic'}
${topicDesc ? `- Topic Description: ${topicDesc}` : ''}
`;

  if (formulaText && formulaText.trim()) {
    promptText += `\nUser's submitted expression or notes:\n"${formulaText.trim()}"`;
  }

  if (imageBuffer) {
    promptText += `\nAn image has been attached containing formulas, handwriting, or textbook excerpts. Extract all mathematical formulas visible in the image.`;
  }

  promptText += `\nExtraction & Pedagogical Rules:
1. If the input is NOT genuine mathematical material (e.g. conversational greetings, spam, non-mathematical text), set "isMathFormula": false and explain in "rejectionReason".
2. Extract all distinct mathematical formulas present.
3. CRITICAL: Preserve the exact variable casing of every mathematical variable. In mathematics, capital letters and lowercase letters carry fundamentally distinct semantics (e.g., A != a, V != v, T != t, R != r). Do not lowercase or uppercase variables during extraction.
4. For each formula, provide a descriptive "name", clean "latex" syntax for KaTeX rendering, and standard "rawText".
5. Return valid JSON conforming strictly to the requested schema.`;

  contents.push({ text: promptText });

  const requestConfig = {
    responseMimeType: 'application/json',
    responseSchema: FORMULA_EXTRACTION_SCHEMA,
    systemInstruction:
      'You are LearnWell AI, an expert mathematical formula extractor. You extract clean, well-formed mathematical formulas while strictly preserving the exact letter casing of all variables.',
  };

  try {
    const response = await ai.models.generateContent({
      model: ACTIVE_MODEL,
      contents,
      config: requestConfig,
    });

    if (!response.text) {
      throw new Error('Received an empty response from Gemini API during formula extraction.');
    }

    const parsed = JSON.parse(response.text);

    if (parsed.isMathFormula && Array.isArray(parsed.formulas)) {
      // Apply safe, case-preserving deduplication
      parsed.formulas = deduplicateFormulas(parsed.formulas);
    }

    return parsed;
  } catch (err) {
    handleGeminiError(err);
  }
}

/**
 * Analyzes a formula via Gemini API (for backward compatibility).
 * Uses exclusively ACTIVE_MODEL (gemini-3.8-flash) with zero fallback.
 */
async function analyzeFormulaWithGemini({
  formulaText,
  imageBuffer,
  imageMimeType,
  chapterTitle,
  topicTitle,
  topicDesc,
}) {
  const ai = getClient();
  const contents = [];

  if (imageBuffer && imageMimeType) {
    contents.push({
      inlineData: {
        mimeType: imageMimeType,
        data: imageBuffer.toString('base64'),
      },
    });
  }

  let promptText = `You are LearnWell's expert Mathematics tutor.
Analyze the following formula or concept in the context of:
- Chapter: ${chapterTitle || 'Mathematics'}
- Topic: ${topicTitle || 'General Topic'}
${topicDesc ? `- Topic Description: ${topicDesc}` : ''}
`;

  if (formulaText && formulaText.trim()) {
    promptText += `\nUser's submitted expression or question: "${formulaText.trim()}"`;
  }

  if (imageBuffer) {
    promptText += `\nAn image has been attached containing a formula, problem statement, or textbook excerpt. Extract and analyze the mathematical formula or concept shown in the image.`;
  }

  promptText += `\nPedagogical Instructions:
1. If the input is NOT a valid mathematical formula, equation, theorem, or relevant concept, set "isMathFormula": false and explain in "rejectionReason".
2. Explain the intuition clearly in student-friendly terms.
3. List explicit mathematical conditions and domain restrictions.
4. Verify all calculations in the solved example with complete precision.
5. Provide actionable recognition clues and common student errors.
6. Return only valid JSON conforming strictly to the requested schema.`;

  contents.push({ text: promptText });

  const requestConfig = {
    responseMimeType: 'application/json',
    responseSchema: FORMULA_ANALYSIS_SCHEMA,
    systemInstruction:
      'You are LearnWell AI, a pedagogical mathematical assistant. You provide mathematically sound, clearly formatted, and student-friendly formula analyses.',
  };

  try {
    const response = await ai.models.generateContent({
      model: ACTIVE_MODEL,
      contents,
      config: requestConfig,
    });

    if (!response.text) {
      throw new Error('Received an empty response from Gemini API.');
    }

    return JSON.parse(response.text);
  } catch (err) {
    handleGeminiError(err);
  }
}

const QUESTION_GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    batchSuccess: {
      type: 'boolean',
      description: 'True if questions were successfully generated.',
    },
    formulaId: {
      type: 'string',
      description: 'Identifier of the primary formula, e.g. f1, f2, or mixed.',
    },
    questions: {
      type: 'array',
      description: 'List of generated multiple-choice questions.',
      items: {
        type: 'object',
        properties: {
          questionId: {
            type: 'string',
            description: 'Unique identifier, e.g. q_f1_01',
          },
          formulaId: {
            type: 'string',
            description: 'ID of the formula tested (e.g. f1, f2, etc.)',
          },
          formulaText: {
            type: 'string',
            description: 'LaTeX or plain text of the formula tested',
          },
          difficulty: {
            type: 'string',
            enum: ['basic', 'intermediate', 'advanced'],
          },
          pattern: {
            type: 'string',
            enum: [
              'basic_direct',
              'formula_recognition',
              'when_to_use',
              'variable_rearrangement',
              'missing_value',
              'conceptual_domain',
              'multi_step',
              'advanced_tricky',
            ],
          },
          testedConcept: {
            type: 'string',
            description: 'Specific mathematical concept or skill evaluated',
          },
          statement: {
            type: 'string',
            description:
              'Self-contained mathematical problem statement with clean LaTeX formatting where needed.',
          },
          options: {
            type: 'array',
            description: 'Exactly 4 distinct multiple-choice options with IDs A, B, C, D.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
                text: { type: 'string', description: 'Option text or mathematical expression' },
              },
              required: ['id', 'text'],
            },
          },
          verificationPayload: {
            type: 'object',
            description:
              'Structured parameters for independent deterministic JavaScript verification.',
            properties: {
              template: {
                type: 'string',
                description:
                  'The solver template name from the registry: quadratic_roots, quadratic_discriminant_parameter, ap_nth_term_and_sum, gp_nth_term_and_sum, vector_dot_and_cross_product, line_distance_and_angle, calculus_extrema_second_derivative, or symbolic_predicate.',
              },
              inputs: {
                type: 'object',
                description: 'Input arguments matching the template schema.',
              },
            },
            required: ['template', 'inputs'],
          },
          hint: {
            type: 'string',
            description:
              'Constructive mathematical clue that points toward the underlying principle without giving away the answer.',
          },
          solution: {
            type: 'object',
            properties: {
              stepByStep: {
                type: 'array',
                items: { type: 'string' },
                description: 'Step-by-step mathematical reasoning.',
              },
              finalAnswer: {
                type: 'string',
                description: 'Final simplified result including units or option identifier.',
              },
            },
            required: ['stepByStep', 'finalAnswer'],
          },
          optionGuidance: {
            type: 'object',
            description: 'Guidance explaining each option (A, B, C, D).',
            properties: {
              A: { type: 'string' },
              B: { type: 'string' },
              C: { type: 'string' },
              D: { type: 'string' },
            },
            required: ['A', 'B', 'C', 'D'],
          },
          guideMe: {
            type: 'object',
            description: 'Pedagogical, non-judgmental 4-part coaching guide.',
            properties: {
              whatToThink: {
                type: 'string',
                description: 'Initial cognitive framing and pattern recognition.',
              },
              howToApproach: {
                type: 'string',
                description: 'Step-by-step actionable problem-solving plan.',
              },
              rememberThis: {
                type: 'string',
                description: 'Key mathematical identity, condition, or rule.',
              },
              applyNextTime: {
                type: 'string',
                description: 'Generalizable strategy for future problems.',
              },
            },
            required: ['whatToThink', 'howToApproach', 'rememberThis', 'applyNextTime'],
          },
        },
        required: [
          'questionId',
          'formulaId',
          'formulaText',
          'difficulty',
          'pattern',
          'testedConcept',
          'statement',
          'options',
          'verificationPayload',
          'hint',
          'solution',
          'optionGuidance',
          'guideMe',
        ],
      },
    },
  },
  required: ['batchSuccess', 'questions'],
};

/**
 * Executes a Gemini model call with up to 2 immediate retries exclusively for malformed JSON.
 * Per Architecture Version 3.4 Section 8.B.2:
 * "For syntax errors resulting from partial token streams, allow a maximum of 2 immediate programmatic retries."
 * API errors (429, 503, etc.) are NOT retried in automated loops.
 */
async function callGeminiWithJsonRetries(generateCallFn, maxRetries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await generateCallFn();
      if (!response || !response.text) {
        throw new Error('Received an empty response from Gemini API.');
      }
      return JSON.parse(response.text);
    } catch (err) {
      lastErr = err;
      const isJsonParseError = err instanceof SyntaxError || err.message?.includes('JSON');
      if (isJsonParseError && attempt < maxRetries) {
        // Immediate programmatic retry for malformed JSON
        continue;
      }
      break;
    }
  }
  handleGeminiError(lastErr);
}

/**
 * Generates a batch of 6–8 unique MCQs for a single confirmed formula.
 */
async function generateQuestionsForFormula({
  formula,
  chapterTitle,
  topicTitle,
  count = 8,
}) {
  const ai = getClient();
  const targetCount = Math.min(8, Math.max(6, count));

  const promptText = `You are LearnWell's expert Mathematics Question Engine.
Generate exactly ${targetCount} high-quality, diverse multiple-choice practice questions (MCQs) for the following mathematical formula:
- Formula ID: ${formula.id}
- Formula Name: ${formula.name || 'Mathematical Formula'}
- Formula Expression: ${formula.latex || formula.rawText || ''}
- Context: Chapter "${chapterTitle || 'Mathematics'}", Topic "${topicTitle || 'General Topic'}"

Pedagogical & Structural Mandates (Version 3.4 Architecture):
1. QUANTITY & VARIETY:
   Generate exactly ${targetCount} unique MCQs spanning Basic, Intermediate, and Advanced tiers.
   Vary the question patterns across:
   - basic_direct (baseline application)
   - formula_recognition (spotting the formula in context)
   - when_to_use (selecting between methods)
   - variable_rearrangement (isolating alternate variables)
   - missing_value (finding intermediate parameters first)
   - conceptual_domain (boundary conditions, real vs complex)
   - multi_step (2-3 sequential stages)
   - advanced_tricky (edge cases, extraneous info)

2. EXACTLY FOUR OPTIONS:
   Each question MUST have exactly 4 options with unique IDs 'A', 'B', 'C', and 'D'.
   Distractors must be mathematically distinct and plausible (common misconceptions, sign flips, missing factors).
   NO duplicate options.

3. DETERMINISTIC INDEPENDENT VERIFICATION:
   Every question MUST include a "verificationPayload" with one of the supported templates:
   - "quadratic_roots": { a: number (≠0), b: number, c: number }
   - "quadratic_discriminant_parameter": { a: number, b_param: string, c: number, targetCondition: 'equal_real' | 'distinct_real', targetVariable: string, constraint: 'positive' | 'negative' | 'none' }
   - "ap_nth_term_and_sum": { a1: number, d: number, n: number, query: 'nth_term' | 'sum' }
   - "gp_nth_term_and_sum": { a1: number, r: number, n: number, query: 'nth_term' | 'sum' | 'infinite_sum' } (For infinite_sum, |r| < 1 is strictly enforced)
   - "vector_dot_and_cross_product": { u: [x,y,z], v: [x,y,z], query: 'dot_product' | 'angle_cosine' | 'cross_product_magnitude' }
   - "line_distance_and_angle": { line1: { a, b, c }, point: { x, y } }
   - "calculus_extrema_second_derivative": { functionType: 'polynomial', coefficients: [c0, c1, ...], domainInterval: [-10, 10], criticalPoint: number, targetExtreme: 'local_minimum' | 'local_maximum' }
   - "symbolic_predicate": { targetCondition: "Δ > 0", domain: "real" }
   Our deterministic validator will independently solve the verificationPayload. Exactly one option must match!

4. NON-JUDGMENTAL GUIDE ME:
   "guideMe" MUST have all four sections: "whatToThink", "howToApproach", "rememberThis", "applyNextTime".
   Strict rule: NEVER say "You made a calculation mistake" or "You forgot...". Always maintain a supportive, forward-looking coaching tone.

5. OPTION GUIDANCE:
   Provide specific, helpful guidance for each option: A, B, C, D explaining why it is correct or diagnosing the specific mistake for distractors.

6. Return valid JSON strictly matching the schema. Set batchSuccess to true.`;

  const requestConfig = {
    responseMimeType: 'application/json',
    responseSchema: QUESTION_GENERATION_SCHEMA,
    systemInstruction:
      'You are LearnWell AI Question Engine. You generate mathematically rigorous, diverse multiple-choice questions with deterministic verification payloads.',
  };

  return await callGeminiWithJsonRetries(() =>
    ai.models.generateContent({
      model: ACTIVE_MODEL,
      contents: [{ text: promptText }],
      config: requestConfig,
    })
  );
}

/**
 * Generates mixed practice MCQs synthesizing multiple confirmed formulas.
 * Withholds formula names from the question statement so students diagnose which formula applies.
 * Retains internal formulaId in the question payload for post-session analytics.
 */
async function generateMixedPracticeQuestions({
  formulas,
  chapterTitle,
  topicTitle,
  count,
}) {
  const ai = getClient();
  const formulaSummaries = formulas
    .map((f, idx) => `Formula ${idx + 1} (ID: ${f.id}): "${f.name}" — ${f.latex || f.rawText}`)
    .join('\n');

  const promptText = `You are LearnWell's expert Mathematics Question Engine.
Generate exactly ${count} mixed practice multiple-choice questions (MCQs) integrating or synthesizing across these confirmed formulas:
${formulaSummaries}

Context: Chapter "${chapterTitle || 'Mathematics'}", Topic "${topicTitle || 'General Topic'}"

CRITICAL MIXED PRACTICE RULES (Version 3.4 Architecture Section 5.C):
1. FORMULA ANONYMITY IN STATEMENT:
   Do NOT state the formula name or formula title in the question statement or hint!
   The student must independently diagnose which formula applies from the problem context alone.
2. INTERNAL MAPPING PRESERVATION:
   Assign the primary tested formula's ID (e.g. "${formulas[0]?.id || 'f1'}") to the "formulaId" field of each question so our system can track per-formula analytics after submission.
3. EXACTLY FOUR OPTIONS:
   Each question must have exactly 4 options with IDs 'A', 'B', 'C', 'D'.
4. DETERMINISTIC INDEPENDENT VERIFICATION:
   Every question must supply a valid "verificationPayload" with one of the 8 supported templates from our registry.
5. NON-JUDGMENTAL GUIDE ME:
   Provide all 4 sections: "whatToThink", "howToApproach", "rememberThis", "applyNextTime".
6. OPTION GUIDANCE:
   Provide specific explanation for A, B, C, D.

Return valid JSON conforming to the schema with batchSuccess set to true.`;

  const requestConfig = {
    responseMimeType: 'application/json',
    responseSchema: QUESTION_GENERATION_SCHEMA,
    systemInstruction:
      'You are LearnWell AI Question Engine. You generate rigorous mixed-practice questions with formula anonymity in problem statements.',
  };

  return await callGeminiWithJsonRetries(() =>
    ai.models.generateContent({
      model: ACTIVE_MODEL,
      contents: [{ text: promptText }],
      config: requestConfig,
    })
  );
}

module.exports = {
  ACTIVE_MODEL,
  QUESTION_GENERATION_SCHEMA,
  extractFormulasWithGemini,
  analyzeFormulaWithGemini,
  generateQuestionsForFormula,
  generateMixedPracticeQuestions,
};
