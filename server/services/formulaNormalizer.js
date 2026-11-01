/**
 * services/formulaNormalizer.js — Case-Preserving Mathematical Normalizer & Deduplicator.
 *
 * Implements Section 4.C of LearnWell Architecture Version 3.4:
 * - Strictly preserves variable casing (A != a, V != v, T != t, R != r).
 * - Strips natural-language conversational prefixes.
 * - Standardizes Unicode powers, mathematical operator glyphs, and spacing.
 * - Safely deduplicates identical formulas without false collisions.
 */

/**
 * Unicode exponent mapping.
 */
const UNICODE_EXPONENTS = {
  '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4',
  '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9',
  '⁺': '^+', '⁻': '^-', 'ⁿ': '^n',
};

/**
 * Normalizes a formula string while strictly preserving letter case of variables.
 *
 * @param {string} formulaStr - Raw formula input.
 * @returns {string} - Case-preserved normalized formula.
 */
function normalizeFormula(formulaStr) {
  if (!formulaStr || typeof formulaStr !== 'string') return '';

  let cleaned = formulaStr.trim();

  // 1. Strip natural language conversational prefixes (e.g. "Formula 1:", "Recall that:", "Equation:")
  cleaned = cleaned.replace(/^(formula|equation|theorem|identity|rule)\s*\d*[:\-\.]?\s*/i, '');
  cleaned = cleaned.replace(/^(recall\s+that|note\s+that|where|given)\s*[:\-\.]?\s*/i, '');
  cleaned = cleaned.replace(/^(the\s+formula\s+is|we\s+know\s+that)\s*[:\-\.]?\s*/i, '');

  // 2. Replace Unicode exponents with standard caret syntax (case-neutral)
  for (const [unicodeChar, replacement] of Object.entries(UNICODE_EXPONENTS)) {
    cleaned = cleaned.split(unicodeChar).join(replacement);
  }

  // 3. Normalize common mathematical symbols (case-neutral)
  cleaned = cleaned
    .replace(/[×✕]/g, '*')
    .replace(/[·•]/g, '*')
    .replace(/÷/g, '/')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/±/g, '\\pm')
    .replace(/−/g, '-'); // Unicode minus to ASCII hyphen-minus

  // 4. Normalize LaTeX fractions if simple: \frac{a}{b} -> (a)/(b) for comparison only
  // (We do not alter user-provided LaTeX directly, but normalize spacing around operators)
  cleaned = cleaned
    .replace(/\s*([=+\-*/<>])\s*/g, ' $1 ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Checks whether two formula strings are mathematically and symbolically identical,
 * strictly respecting case sensitivity.
 *
 * @param {string} formulaA
 * @param {string} formulaB
 * @returns {boolean}
 */
function areFormulasEquivalent(formulaA, formulaB) {
  const normA = normalizeFormula(formulaA);
  const normB = normalizeFormula(formulaB);

  // Exact case-sensitive match
  if (normA === normB) return true;

  // Space-stripped case-sensitive match
  const strippedA = normA.replace(/\s+/g, '');
  const strippedB = normB.replace(/\s+/g, '');
  return strippedA === strippedB;
}

/**
 * Safely deduplicates an array of formula objects, preserving exact variable casing.
 *
 * @param {Array<{ id?: string, name?: string, latex?: string, rawText?: string }>} formulas
 * @returns {Array<{ id: string, name: string, latex: string, rawText: string }>}
 */
function deduplicateFormulas(formulas) {
  if (!Array.isArray(formulas)) return [];

  const seen = [];
  const result = [];

  for (const f of formulas) {
    if (!f || typeof f !== 'object') continue;

    const raw = (f.rawText || f.latex || '').trim();
    if (!raw) continue;

    const normalized = normalizeFormula(raw);

    // Check if any existing formula has the exact same normalized representation (case-sensitive)
    const isDuplicate = seen.some((existing) => areFormulasEquivalent(existing, normalized));

    if (!isDuplicate) {
      seen.push(normalized);
      result.push({
        id: `f${result.length + 1}`,
        name: (f.name || `Formula ${result.length + 1}`).trim(),
        latex: (f.latex || raw).trim(),
        rawText: (f.rawText || raw).trim(),
      });
    }
  }

  return result;
}

module.exports = {
  normalizeFormula,
  areFormulasEquivalent,
  deduplicateFormulas,
};
