/**
 * questionValidator.js — Deterministic Mathematical Validator & Solver Registry (Client-side).
 *
 * Implements Section 7 of LearnWell Architecture Version 3.4.
 * Safely evaluates mathematical solutions and verifies options with zero eval().
 */

const EPSILON = 1e-6;

export function safeEvaluateMathExpression(exprStr) {
  if (typeof exprStr === 'number') return exprStr;
  if (!exprStr || typeof exprStr !== 'string') return null;

  let clean = exprStr.trim();
  clean = clean.replace(/^[a-zA-Z_][\w_{}]*\s*=\s*/, '');
  clean = clean.replace(/^\$+|\$+$/g, '').replace(/\\\(|\\\)/g, '');
  clean = clean.replace(/\\left|\\right/g, '');
  clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))');
  clean = clean.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  clean = clean.replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/−/g, '-');

  const tokens = tokenizeMath(clean);
  if (!tokens || tokens.length === 0) return null;

  try {
    const parser = new MathParser(tokens);
    const value = parser.parseExpression();
    if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

function tokenizeMath(str) {
  const tokens = [];
  let i = 0;

  while (i < str.length) {
    const char = str[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < str.length && /[0-9.]/.test(str[i])) {
        numStr += str[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
      continue;
    }
    if (char === 's' && str.slice(i, i + 4) === 'sqrt') {
      tokens.push({ type: 'SQRT' });
      i += 4;
      continue;
    }
    if (['+', '-', '*', '/', '(', ')', '^'].includes(char)) {
      tokens.push({ type: 'OP', value: char });
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({ type: 'COMMA' });
      i++;
      continue;
    }
    // Any unhandled character (unexpected letters, code, symbols) invalidates mathematical parsing
    return null;
  }
  return tokens;
}

class MathParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }
  peek() { return this.tokens[this.pos] || null; }
  consume(expectedType, expectedValue) {
    const token = this.peek();
    if (!token || token.type !== expectedType) throw new Error('Token error');
    if (expectedValue !== undefined && token.value !== expectedValue) throw new Error('Value error');
    this.pos++;
    return token;
  }
  parseExpression() {
    const val = this.parseAddSub();
    if (this.pos < this.tokens.length) throw new Error('Trailing tokens');
    return val;
  }
  parseAddSub() {
    let left = this.parseMulDiv();
    while (this.peek() && this.peek().type === 'OP' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.consume('OP').value;
      const right = this.parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }
  parseMulDiv() {
    let left = this.parseUnary();
    while (this.peek() && this.peek().type === 'OP' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.consume('OP').value;
      const right = this.parseUnary();
      if (op === '/') {
        if (Math.abs(right) < 1e-12) throw new Error('Division by zero');
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }
  parseUnary() {
    if (this.peek() && this.peek().type === 'OP' && this.peek().value === '-') {
      this.consume('OP', '-');
      return -this.parseUnary();
    }
    if (this.peek() && this.peek().type === 'OP' && this.peek().value === '+') {
      this.consume('OP', '+');
      return this.parseUnary();
    }
    return this.parsePrimary();
  }
  parsePrimary() {
    const token = this.peek();
    if (!token) throw new Error('End of input');
    if (token.type === 'NUMBER') {
      this.consume('NUMBER');
      return token.value;
    }
    if (token.type === 'SQRT') {
      this.consume('SQRT');
      let val;
      if (this.peek() && this.peek().type === 'OP' && this.peek().value === '(') {
        this.consume('OP', '(');
        val = this.parseExpression();
        this.consume('OP', ')');
      } else {
        val = this.parsePrimary();
      }
      if (val < 0) throw new Error('Negative sqrt');
      return Math.sqrt(val);
    }
    if (token.type === 'OP' && token.value === '(') {
      this.consume('OP', '(');
      const val = this.parseExpression();
      this.consume('OP', ')');
      return val;
    }
    throw new Error('Primary parse error');
  }
}

export function extractNumbersFromOption(text) {
  if (typeof text === 'number') return [text];
  if (!text || typeof text !== 'string') return [];

  // If text contains delimiters like comma, semicolon, 'and', 'or', split first
  if (/[,;]|\band\b|\bor\b/i.test(text)) {
    const parts = text.split(/[,;]|\band\b|\bor\b/i);
    const nums = [];
    for (const part of parts) {
      const val = safeEvaluateMathExpression(part.trim());
      if (val !== null) nums.push(val);
    }
    if (nums.length > 0) return nums;
  }

  const singleVal = safeEvaluateMathExpression(text);
  if (singleVal !== null) return [singleVal];

  return [];
}

export const SOLVER_REGISTRY = {
  quadratic_roots: {
    solve(inputs) {
      const { a, b, c } = inputs;
      if (Math.abs(a) < EPSILON) throw new Error('a cannot be 0');
      const delta = b * b - 4 * a * c;
      if (delta < -EPSILON) return { type: 'complex', delta };
      const sqrtDelta = Math.sqrt(Math.max(0, delta));
      return {
        type: 'roots',
        delta,
        roots: [(-b - sqrtDelta) / (2 * a), (-b + sqrtDelta) / (2 * a)].sort((x, y) => x - y),
      };
    },
    matchesOption(optionText, expected) {
      if (expected.type === 'complex' || expected.type === 'complex_roots') {
        const lower = optionText.toLowerCase();
        return (
          lower.includes('no real roots') ||
          lower.includes('not real') ||
          lower.includes('complex') ||
          lower.includes('imaginary')
        );
      }
      const nums = extractNumbersFromOption(optionText);
      if (nums.length === 0 || !expected.roots) return false;
      if (nums.length === 1 && Math.abs(expected.roots[0] - expected.roots[1]) < EPSILON) {
        return Math.abs(nums[0] - expected.roots[0]) < EPSILON;
      }
      if (nums.length === 2) {
        const sorted = [...nums].sort((x, y) => x - y);
        return Math.abs(sorted[0] - expected.roots[0]) < EPSILON && Math.abs(sorted[1] - expected.roots[1]) < EPSILON;
      }
      return false;
    },
  },

  quadratic_discriminant_parameter: {
    solve(inputs) {
      const { a, c, constraint = 'none' } = inputs;
      const fourAC = 4 * a * c;
      const rootMag = Math.sqrt(Math.max(0, fourAC));
      let solutions = [-rootMag, rootMag];
      if (constraint === 'positive') solutions = solutions.filter((k) => k > EPSILON);
      else if (constraint === 'negative') solutions = solutions.filter((k) => k < -EPSILON);
      return { type: 'parameter', values: solutions };
    },
    matchesOption(optionText, expected) {
      const nums = extractNumbersFromOption(optionText);
      if (nums.length === 0) return false;
      return expected.values.some((val) => Math.abs(nums[0] - val) < EPSILON);
    },
  },

  ap_nth_term_and_sum: {
    solve(inputs) {
      const { a1, d, n, query = 'nth_term' } = inputs;
      if (query === 'nth_term') return a1 + (n - 1) * d;
      if (query === 'sum') return (n / 2) * (2 * a1 + (n - 1) * d);
      throw new Error('Unsupported AP query');
    },
    matchesOption(optionText, expectedValue) {
      const val = safeEvaluateMathExpression(optionText);
      return val !== null && Math.abs(val - expectedValue) < EPSILON;
    },
  },

  gp_nth_term_and_sum: {
    solve(inputs) {
      const { a1, r, n, query = 'nth_term' } = inputs;
      if (query === 'nth_term') return a1 * Math.pow(r, n - 1);
      if (query === 'sum') {
        if (Math.abs(r - 1) < EPSILON) return n * a1;
        return a1 * ((1 - Math.pow(r, n)) / (1 - r));
      }
      if (query === 'infinite_sum') {
        if (Math.abs(r) >= 1) throw new Error('Divergent infinite GP');
        return a1 / (1 - r);
      }
      throw new Error('Unsupported GP query');
    },
    matchesOption(optionText, expectedValue) {
      const val = safeEvaluateMathExpression(optionText);
      return val !== null && Math.abs(val - expectedValue) < EPSILON;
    },
  },

  vector_dot_and_cross_product: {
    solve(inputs) {
      const { u, v, query = 'dot_product' } = inputs;
      if (!Array.isArray(u) || !Array.isArray(v)) {
        throw new Error('Vectors u and v must be numerical arrays');
      }
      if (u.length !== v.length || (u.length !== 2 && u.length !== 3)) {
        throw new Error('Vectors u and v must both be 2D or 3D numerical arrays');
      }
      const dot = u.reduce((sum, u_i, i) => sum + u_i * v[i], 0);
      if (query === 'dot_product') return dot;
      const magU = Math.sqrt(u.reduce((sum, u_i) => sum + u_i ** 2, 0));
      const magV = Math.sqrt(v.reduce((sum, v_i) => sum + v_i ** 2, 0));
      if (query === 'angle_cosine') {
        if (magU < EPSILON || magV < EPSILON) throw new Error('Vectors must be non-zero to evaluate angle');
        return dot / (magU * magV);
      }
      if (query === 'cross_product_magnitude') {
        if (u.length === 2) return Math.abs(u[0] * v[1] - u[1] * v[0]);
        const cx = u[1] * v[2] - u[2] * v[1];
        const cy = u[2] * v[0] - u[0] * v[2];
        const cz = u[0] * v[1] - u[1] * v[0];
        return Math.sqrt(cx ** 2 + cy ** 2 + cz ** 2);
      }
      throw new Error(`Unsupported vector query: ${query}`);
    },
    matchesOption(optionText, expectedValue) {
      const val = safeEvaluateMathExpression(optionText);
      return val !== null && Math.abs(val - expectedValue) < EPSILON;
    },
  },

  line_distance_and_angle: {
    solve(inputs) {
      const { line1, line2, point, query = 'distance' } = inputs;
      if (!line1) throw new Error('line_distance_and_angle requires line1');

      if (point || query === 'distance') {
        if (!point) throw new Error('Point-to-line distance requires point { x, y }');
        const norm = Math.sqrt(line1.a ** 2 + line1.b ** 2);
        if (norm < EPSILON) throw new Error('Line coefficients a and b cannot both be zero');
        return Math.abs(line1.a * point.x + line1.b * point.y + line1.c) / norm;
      }

      if (line2 || query === 'angle_degrees' || query === 'angle_cosine' || query === 'angle_radians') {
        if (!line2) throw new Error('Angle calculation requires line2');
        const norm1 = Math.sqrt(line1.a ** 2 + line1.b ** 2);
        const norm2 = Math.sqrt(line2.a ** 2 + line2.b ** 2);
        if (norm1 < EPSILON || norm2 < EPSILON) throw new Error('Line coefficients a and b cannot both be zero');

        const dot = Math.abs(line1.a * line2.a + line1.b * line2.b);
        let cosTheta = Math.min(1, Math.max(0, dot / (norm1 * norm2)));
        if (Math.abs(cosTheta - 1) < EPSILON) cosTheta = 1;
        else if (cosTheta < EPSILON) cosTheta = 0;
        if (query === 'angle_cosine') return cosTheta;
        const thetaRad = Math.acos(cosTheta);
        if (query === 'angle_radians') return thetaRad;
        return (thetaRad * 180) / Math.PI;
      }

      throw new Error(`Unsupported line_distance_and_angle configuration or query: ${query}`);
    },
    matchesOption(optionText, expectedValue) {
      const val = safeEvaluateMathExpression(optionText);
      return val !== null && Math.abs(val - expectedValue) < EPSILON;
    },
  },

  calculus_extrema_second_derivative: {
    solve(inputs) {
      const { functionType, coefficients, criticalPoint, targetExtreme } = inputs;
      if (functionType && functionType !== 'polynomial') {
        throw new Error('calculus solver currently supports polynomials');
      }
      if (!Array.isArray(coefficients)) {
        throw new Error('coefficients must be an array');
      }

      const d1 = coefficients.slice(1).map((c, k) => (k + 1) * c);
      const d2 = d1.slice(1).map((c, k) => (k + 1) * c);
      const x0 = criticalPoint;
      const fPrimeX0 = d1.reduce((sum, c, k) => sum + c * Math.pow(x0, k), 0);
      if (Math.abs(fPrimeX0) >= 1e-4) {
        throw new Error(`x0 = ${x0} is not a stationary critical point (f'(${x0}) = ${fPrimeX0} ≠ 0)`);
      }

      const fDoublePrimeX0 = d2.reduce((sum, c, k) => sum + c * Math.pow(x0, k), 0);
      if (Math.abs(fDoublePrimeX0) <= EPSILON) {
        return null;
      }

      const provenExtreme = fDoublePrimeX0 > EPSILON ? 'local_minimum' : 'local_maximum';
      if (targetExtreme && targetExtreme !== provenExtreme) {
        throw new Error(`Target extreme (${targetExtreme}) contradicts mathematical proof (${provenExtreme})`);
      }

      return {
        isConfirmed: true,
        provenExtreme,
        fDoublePrimeX0,
        signCondition: fDoublePrimeX0 > 0 ? '>' : '<',
      };
    },
    matchesOption(optionText, expected) {
      if (!expected || !expected.isConfirmed) return false;
      const lower = optionText.toLowerCase();
      if (expected.provenExtreme === 'local_minimum') {
        return lower.includes('minimum') || lower.includes('local min') || lower.includes('> 0');
      }
      if (expected.provenExtreme === 'local_maximum') {
        return lower.includes('maximum') || lower.includes('local max') || lower.includes('< 0');
      }
      return false;
    },
  },
};

export function parsePredicate(str) {
  if (!str || typeof str !== 'string') return null;
  let clean = str.trim().replace(/\$/g, '');
  clean = clean.replace(/\\geq?/g, '>=').replace(/\\leq?/g, '<=').replace(/\\neq?/g, '!=');
  clean = clean.replace(/\\Delta/g, 'Delta').replace(/\\/g, '');
  const match = clean.match(/^([Δ\w^\s*-]+)\s*(<=|>=|!=|<|>|=)\s*(-?[\d.]+)/);
  if (!match) return null;
  const rawSubject = match[1].trim().toLowerCase();
  let subject = 'unknown';
  if (rawSubject.includes('δ') || rawSubject.includes('delta') || rawSubject.includes('b^2') || rawSubject.includes('b²')) {
    subject = 'discriminant';
  } else if (rawSubject.includes('m1') || rawSubject.includes('slope')) {
    subject = 'slope_product';
  } else if (rawSubject.includes('u') || rawSubject.includes('v') || rawSubject.includes('dot')) {
    subject = 'vector_dot';
  } else if (rawSubject.includes("f''") || rawSubject.includes('second')) {
    subject = 'second_derivative';
  }
  return {
    subject,
    operator: match[2],
    targetValue: parseFloat(match[3]),
  };
}

export function arePredicatesLogicallyEquivalent(predA, predB) {
  if (!predA || !predB) return false;
  if (predA.subject !== predB.subject) return false;
  if (predA.operator === predB.operator && Math.abs(predA.targetValue - predB.targetValue) < EPSILON) return true;
  if ((predA.operator === '=' || predA.operator === '==') && (predB.operator === '=' || predB.operator === '==')) {
    return Math.abs(predA.targetValue - predB.targetValue) < EPSILON;
  }
  return false;
}

export function verifySymbolicPredicateQuestion(optionsOrQuestion, targetPredicateStr) {
  let options;
  let targetPredicate = targetPredicateStr;

  if (Array.isArray(optionsOrQuestion)) {
    options = optionsOrQuestion;
  } else if (optionsOrQuestion && typeof optionsOrQuestion === 'object') {
    options = optionsOrQuestion.options;
    if (!targetPredicate) {
      targetPredicate =
        optionsOrQuestion.verificationPayload?.inputs?.targetCondition ||
        optionsOrQuestion.verificationPayload?.inputs?.targetPredicate;
    }
  }

  if (!Array.isArray(options) || options.length !== 4) {
    return {
      valid: false,
      isValid: false,
      error: 'Symbolic predicate verification requires exactly 4 options.',
      reason: 'Symbolic predicate verification requires exactly 4 options.',
    };
  }

  const targetAST = parsePredicate(targetPredicate);
  if (!targetAST) {
    return {
      valid: false,
      isValid: false,
      error: `Could not parse target predicate: "${targetPredicate}"`,
      reason: `Could not parse target predicate: "${targetPredicate}"`,
    };
  }

  const parsedOptions = options.map((opt) => ({
    id: opt.id,
    ast: parsePredicate(opt.text),
    rawText: opt.text,
  }));

  const unparsed = parsedOptions.find((p) => !p.ast);
  if (unparsed) {
    return {
      valid: false,
      isValid: false,
      error: `Unparseable symbolic option: "${unparsed.rawText}"`,
      reason: `Unparseable symbolic option: "${unparsed.rawText}"`,
    };
  }

  for (let i = 0; i < parsedOptions.length; i++) {
    for (let j = i + 1; j < parsedOptions.length; j++) {
      if (arePredicatesLogicallyEquivalent(parsedOptions[i].ast, parsedOptions[j].ast)) {
        return {
          valid: false,
          isValid: false,
          error: `Duplicate options detected: Option ${parsedOptions[i].id} and Option ${parsedOptions[j].id} have equivalent truth sets.`,
          reason: `Duplicate options detected: Option ${parsedOptions[i].id} and Option ${parsedOptions[j].id} have equivalent truth sets.`,
        };
      }
    }
  }

  const matchingOptions = parsedOptions.filter((opt) =>
    arePredicatesLogicallyEquivalent(opt.ast, targetAST)
  );

  if (matchingOptions.length === 0) {
    return {
      valid: false,
      isValid: false,
      error: `No option is logically equivalent to required target condition: "${targetPredicate}"`,
      reason: `No option is logically equivalent to required target condition: "${targetPredicate}"`,
    };
  }

  if (matchingOptions.length > 1) {
    return {
      valid: false,
      isValid: false,
      error: `Multiple options (${matchingOptions.map((o) => o.id).join(', ')}) are logically equivalent to target condition.`,
      reason: `Multiple options (${matchingOptions.map((o) => o.id).join(', ')}) are logically equivalent to target condition.`,
    };
  }

  return {
    valid: true,
    isValid: true,
    verifiedOptionId: matchingOptions[0].id,
    method: 'symbolic_predicate',
    template: 'symbolic_predicate',
  };
}

export function validateQuestion(question) {
  if (!question || typeof question !== 'object') {
    return { valid: false, isValid: false, error: 'Not an object', reason: 'Not an object' };
  }
  if (!question.statement || !Array.isArray(question.options) || question.options.length !== 4) {
    return {
      valid: false,
      isValid: false,
      error: 'Must have statement and 4 options',
      reason: 'Must have statement and 4 options',
    };
  }

  const REQUIRED_IDS = ['A', 'B', 'C', 'D'];
  const optionIds = question.options.map((o) => o?.id);
  const validIds = REQUIRED_IDS.every((id) => optionIds.includes(id)) && optionIds.length === 4;
  if (!validIds) {
    return {
      valid: false,
      isValid: false,
      error: 'Question options must have unique IDs exactly matching A, B, C, D.',
      reason: 'Question options must have unique IDs exactly matching A, B, C, D.',
    };
  }

  for (const opt of question.options) {
    if (!opt.text || typeof opt.text !== 'string' || !opt.text.trim()) {
      return {
        valid: false,
        isValid: false,
        error: `Option ${opt.id} contains empty text.`,
        reason: `Option ${opt.id} contains empty text.`,
      };
    }
  }

  const gm = question.guideMe;
  if (!gm || !gm.whatToThink || !gm.howToApproach || !gm.rememberThis || !gm.applyNextTime) {
    return {
      valid: false,
      isValid: false,
      error: 'Missing one or more of the 4 required Guide Me sections',
      reason: 'Missing one or more of the 4 required Guide Me sections',
    };
  }

  const judgmentalRegex = /(you made a (calculation )?mistake|you forgot|you didn't read|you did not read|careless)/i;
  const combinedGuideMeText = `${gm.whatToThink} ${gm.howToApproach} ${gm.rememberThis} ${gm.applyNextTime}`;
  if (judgmentalRegex.test(combinedGuideMeText)) {
    return {
      valid: false,
      isValid: false,
      error: 'Question rejected: Guide Me must maintain a constructive, forward-looking coaching tone without judgmental language.',
      reason: 'Question rejected: Guide Me must maintain a constructive, forward-looking coaching tone without judgmental language.',
    };
  }

  if (!question.hint || !question.solution || !Array.isArray(question.solution.stepByStep) || !question.solution.finalAnswer) {
    return {
      valid: false,
      isValid: false,
      error: 'Missing hint or step-by-step solution',
      reason: 'Missing hint or step-by-step solution',
    };
  }

  const payload = question.verificationPayload;
  if (!payload || !payload.template || !payload.inputs) {
    return {
      valid: false,
      isValid: false,
      error: 'Missing verificationPayload',
      reason: 'Missing verificationPayload',
    };
  }

  if (SOLVER_REGISTRY[payload.template]) {
    const solver = SOLVER_REGISTRY[payload.template];
    try {
      const res = solver.solve(payload.inputs);
      if (res === null || res === undefined) {
        return {
          valid: false,
          isValid: false,
          error: `Solver "${payload.template}" returned inconclusive result`,
          reason: `Solver "${payload.template}" returned inconclusive result`,
        };
      }
      const matches = question.options.filter((opt) => solver.matchesOption(opt.text, res));
      if (matches.length !== 1) {
        return {
          valid: false,
          isValid: false,
          error: `Matched ${matches.length} options`,
          reason: `Matched ${matches.length} options`,
        };
      }
      return {
        valid: true,
        isValid: true,
        verifiedOptionId: matches[0].id,
        method: 'deterministic_solver',
        template: payload.template,
        computedResult: res,
      };
    } catch (e) {
      return {
        valid: false,
        isValid: false,
        error: e.message,
        reason: e.message,
      };
    }
  }

  if (payload.template === 'symbolic_predicate') {
    return verifySymbolicPredicateQuestion(question);
  }

  return {
    valid: false,
    isValid: false,
    error: `Unsupported template ${payload.template}`,
    reason: `Unsupported template ${payload.template}`,
  };
}
