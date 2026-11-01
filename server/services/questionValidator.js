/**
 * services/questionValidator.js — Deterministic Mathematical Validator & Solver Registry.
 *
 * Implements Section 7 of LearnWell Architecture Version 3.4:
 * - Safe tokenized AST expression evaluator (zero eval).
 * - Full numerical solver registry:
 *   1. quadratic_roots
 *   2. quadratic_discriminant_parameter
 *   3. ap_nth_term_and_sum
 *   4. gp_nth_term_and_sum (with r=1 and |r|<1 boundary handling)
 *   5. vector_dot_and_cross_product
 *   6. line_distance_and_angle
 * - Formal symbolic predicate grammar parser & truth-set equivalence engine.
 * - Polynomial calculus verification engine with differentiability & curvature tests.
 * - Independent verification: Gemini's correctAnswer is NEVER trusted without proof.
 */

const EPSILON = 1e-6;

/**
 * Safely evaluates a basic mathematical expression string into a number.
 * Supports numbers, decimals, fractions (a/b, \frac{a}{b}), square roots (\sqrt{x}, sqrt(x)),
 * basic binary operators (+, -, *, /), and parentheses.
 * STRICT: Zero use of eval() or Function constructor.
 */
function safeEvaluateMathExpression(exprStr) {
  if (typeof exprStr === 'number') return exprStr;
  if (!exprStr || typeof exprStr !== 'string') return null;

  let clean = exprStr.trim();

  // Strip variable assignments like "x = 4", "k = 12", "d = 5", "S_{10} = 155", "T_4 = 24"
  clean = clean.replace(/^[a-zA-Z_][\w_{}]*\s*=\s*/, '');

  // Strip LaTeX wrapping: $...$, \(...\), \left, \right
  clean = clean.replace(/^\$+|\$+$/g, '').replace(/\\\(|\\\)/g, '');
  clean = clean.replace(/\\left|\\right/g, '');

  // Handle LaTeX fractions: \frac{a}{b} -> ((a)/(b))
  clean = clean.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))');

  // Handle square roots: \sqrt{x} or sqrt(x)
  clean = clean.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');

  // Normalize operators
  clean = clean.replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/−/g, '-');

  // Tokenize safely
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

/**
 * Tokenizer for safe math parsing.
 */
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

    // Skip commas
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

/**
 * Recursive descent parser for basic math (Numbers, +, -, *, /, unary -, sqrt).
 */
class MathParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos] || null;
  }

  consume(expectedType, expectedValue) {
    const token = this.peek();
    if (!token || token.type !== expectedType) {
      throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
    }
    if (expectedValue !== undefined && token.value !== expectedValue) {
      throw new Error(`Expected ${expectedValue}, got ${token.value}`);
    }
    this.pos++;
    return token;
  }

  parseExpression() {
    const val = this.parseAddSub();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected trailing tokens at position ${this.pos}`);
    }
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
    if (!token) throw new Error('Unexpected end of input');

    if (token.type === 'NUMBER') {
      this.consume('NUMBER');
      return token.value;
    }

    if (token.type === 'SQRT') {
      this.consume('SQRT');
      let val;
      if (this.peek() && this.peek().type === 'OP' && this.peek().value === '(') {
        this.consume('OP', '(');
        val = this.parseAddSub();
        this.consume('OP', ')');
      } else {
        val = this.parsePrimary();
      }
      if (val < 0) throw new Error('Square root of negative number');
      return Math.sqrt(val);
    }

    if (token.type === 'OP' && token.value === '(') {
      this.consume('OP', '(');
      const val = this.parseAddSub();
      this.consume('OP', ')');
      return val;
    }

    throw new Error(`Unexpected token in primary: ${JSON.stringify(token)}`);
  }
}

/**
 * Extracts all numbers from an option string.
 * Helpful for options containing multiple roots e.g. "x = 2, 3" or "k = 12".
 */
function extractNumbersFromOption(text) {
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

/* ==========================================================================
   DETERMINISTIC NUMERICAL SOLVER REGISTRY
   ========================================================================== */

const SOLVER_REGISTRY = {
  /**
   * 1. quadratic_roots
   * Solves ax² + bx + c = 0
   */
  quadratic_roots: {
    solve(inputs) {
      const { a, b, c } = inputs;
      if (typeof a !== 'number' || typeof b !== 'number' || typeof c !== 'number') {
        throw new Error('quadratic_roots requires numerical inputs { a, b, c }');
      }
      if (Math.abs(a) < EPSILON) {
        throw new Error('quadratic_roots requires a ≠ 0');
      }

      const delta = b * b - 4 * a * c;
      if (delta < -EPSILON) {
        return { type: 'complex_roots', delta };
      }

      const sqrtDelta = Math.sqrt(Math.max(0, delta));
      const r1 = (-b + sqrtDelta) / (2 * a);
      const r2 = (-b - sqrtDelta) / (2 * a);

      const roots = [Math.min(r1, r2), Math.max(r1, r2)];
      return { type: 'roots', delta, roots };
    },

    matchesOption(optionText, expected) {
      if (expected.type === 'complex_roots') {
        const lower = optionText.toLowerCase();
        return (
          lower.includes('no real roots') ||
          lower.includes('not real') ||
          lower.includes('complex') ||
          lower.includes('imaginary')
        );
      }

      const numbers = extractNumbersFromOption(optionText);
      if (numbers.length === 0 || !expected.roots) return false;

      if (expected.roots.length === 2 && Math.abs(expected.roots[0] - expected.roots[1]) < EPSILON) {
        // Equal roots: option can have 1 number matching the root
        if (numbers.length === 1 && Math.abs(numbers[0] - expected.roots[0]) < EPSILON) return true;
      }

      if (numbers.length === 2) {
        const sorted = [...numbers].sort((x, y) => x - y);
        return (
          Math.abs(sorted[0] - expected.roots[0]) < EPSILON &&
          Math.abs(sorted[1] - expected.roots[1]) < EPSILON
        );
      }

      return false;
    },
  },

  /**
   * 2. quadratic_discriminant_parameter
   * Solves for parameter k in a quadratic equation given root condition (e.g. equal real roots => Δ = 0)
   */
  quadratic_discriminant_parameter: {
    solve(inputs) {
      const { a, b_param, c, targetCondition = 'equal_real_roots', constraint = 'none' } = inputs;
      if (typeof a !== 'number' || typeof c !== 'number') {
        throw new Error('quadratic_discriminant_parameter requires { a, c }');
      }

      // Δ = k² - 4ac = 0 => k = ±√(4ac)
      const fourAC = 4 * a * c;
      if (fourAC < 0 && targetCondition === 'equal_real_roots') {
        throw new Error('4ac < 0 implies no real parameter k for equal real roots');
      }

      const rootMag = Math.sqrt(Math.max(0, fourAC));
      let solutions = [-rootMag, rootMag];

      if (constraint === 'positive') {
        solutions = solutions.filter((k) => k > EPSILON);
      } else if (constraint === 'negative') {
        solutions = solutions.filter((k) => k < -EPSILON);
      }

      return { type: 'parameter', values: solutions };
    },

    matchesOption(optionText, expected) {
      const numbers = extractNumbersFromOption(optionText);
      if (numbers.length === 0) return false;

      // If constrained to single value (e.g. positive k = 12)
      if (expected.values.length === 1) {
        return Math.abs(numbers[0] - expected.values[0]) < EPSILON;
      }

      // If multiple acceptable parameter values (e.g. ±12)
      return expected.values.some((val) => Math.abs(numbers[0] - val) < EPSILON);
    },
  },

  /**
   * 3. ap_nth_term_and_sum
   */
  ap_nth_term_and_sum: {
    solve(inputs) {
      const { a1, d, n, query = 'nth_term' } = inputs;
      if (typeof a1 !== 'number' || typeof d !== 'number' || typeof n !== 'number') {
        throw new Error('ap_nth_term_and_sum requires numbers { a1, d, n }');
      }
      if (!Number.isInteger(n) || n <= 0) {
        throw new Error('AP term count n must be a positive integer');
      }

      if (query === 'nth_term') {
        return a1 + (n - 1) * d;
      }
      if (query === 'sum') {
        return (n / 2) * (2 * a1 + (n - 1) * d);
      }
      throw new Error(`Unsupported AP query: ${query}`);
    },

    matchesOption(optionText, expectedValue) {
      const val = safeEvaluateMathExpression(optionText);
      if (val === null) return false;
      return Math.abs(val - expectedValue) < EPSILON;
    },
  },

  /**
   * 4. gp_nth_term_and_sum (with r=1 and |r|<1 boundary handling per Version 3.4)
   */
  gp_nth_term_and_sum: {
    solve(inputs) {
      const { a1, r, n, query = 'nth_term' } = inputs;
      if (typeof a1 !== 'number' || typeof r !== 'number') {
        throw new Error('gp_nth_term_and_sum requires numbers { a1, r }');
      }

      if (query === 'nth_term') {
        if (typeof n !== 'number' || !Number.isInteger(n) || n <= 0) {
          throw new Error('GP term index n must be a positive integer');
        }
        return a1 * Math.pow(r, n - 1);
      }

      if (query === 'sum') {
        if (typeof n !== 'number' || !Number.isInteger(n) || n <= 0) {
          throw new Error('GP term count n must be a positive integer');
        }
        // Explicit branch for r = 1 vs r ≠ 1 per Version 3.4
        if (Math.abs(r - 1) < EPSILON) {
          return n * a1;
        }
        return a1 * ((1 - Math.pow(r, n)) / (1 - r));
      }

      if (query === 'infinite_sum') {
        // Enforce convergence precondition |r| < 1 per Version 3.4
        if (Math.abs(r) >= 1) {
          throw new Error(`Infinite GP sum diverges for |r| >= 1 (r = ${r})`);
        }
        return a1 / (1 - r);
      }

      throw new Error(`Unsupported GP query: ${query}`);
    },

    matchesOption(optionText, expectedValue) {
      const val = safeEvaluateMathExpression(optionText);
      if (val === null) return false;
      return Math.abs(val - expectedValue) < EPSILON;
    },
  },

  /**
   * 5. vector_dot_and_cross_product
   * Supports dot product, angle cosine, and cross product magnitude in 2D and 3D
   */
  vector_dot_and_cross_product: {
    solve(inputs) {
      const { u, v, query = 'dot_product' } = inputs;
      if (!Array.isArray(u) || !Array.isArray(v)) {
        throw new Error('Vectors u and v must be numerical arrays');
      }
      if (u.length !== v.length || (u.length !== 2 && u.length !== 3)) {
        throw new Error('Vectors u and v must both be 2D or 3D numerical arrays');
      }
      for (let i = 0; i < u.length; i++) {
        if (typeof u[i] !== 'number' || typeof v[i] !== 'number') {
          throw new Error('Vector components must be numbers');
        }
      }

      // Dot product: works in 2D and 3D
      const dot = u.reduce((sum, u_i, i) => sum + u_i * v[i], 0);

      if (query === 'dot_product') {
        return dot;
      }

      const magU = Math.sqrt(u.reduce((sum, u_i) => sum + u_i ** 2, 0));
      const magV = Math.sqrt(v.reduce((sum, v_i) => sum + v_i ** 2, 0));

      if (query === 'angle_cosine') {
        if (magU < EPSILON || magV < EPSILON) {
          throw new Error('Vectors must be non-zero to evaluate angle');
        }
        return dot / (magU * magV);
      }

      if (query === 'cross_product_magnitude') {
        if (u.length === 2) {
          return Math.abs(u[0] * v[1] - u[1] * v[0]);
        }
        const cx = u[1] * v[2] - u[2] * v[1];
        const cy = u[2] * v[0] - u[0] * v[2];
        const cz = u[0] * v[1] - u[1] * v[0];
        return Math.sqrt(cx ** 2 + cy ** 2 + cz ** 2);
      }

      throw new Error(`Unsupported vector query: ${query}`);
    },

    matchesOption(optionText, expectedValue) {
      const val = safeEvaluateMathExpression(optionText);
      if (val === null) return false;
      return Math.abs(val - expectedValue) < EPSILON;
    },
  },

  /**
   * 6. line_distance_and_angle
   * Validates both point-to-line distance AND angle between two lines
   */
  line_distance_and_angle: {
    solve(inputs) {
      const { line1, line2, point, query = 'distance' } = inputs;
      if (!line1) {
        throw new Error('line_distance_and_angle requires line1');
      }

      // Point-to-line distance branch
      if (point || query === 'distance') {
        if (!point) {
          throw new Error('Point-to-line distance requires point { x, y }');
        }
        const { a, b, c } = line1;
        const { x, y } = point;
        const norm = Math.sqrt(a * a + b * b);
        if (norm < EPSILON) {
          throw new Error('Line coefficients a and b cannot both be zero');
        }
        return Math.abs(a * x + b * y + c) / norm;
      }

      // Angle between two lines branch
      if (line2 || query === 'angle_degrees' || query === 'angle_cosine' || query === 'angle_radians') {
        if (!line2) {
          throw new Error('Angle calculation requires line2');
        }
        const norm1 = Math.sqrt(line1.a * line1.a + line1.b * line1.b);
        const norm2 = Math.sqrt(line2.a * line2.a + line2.b * line2.b);
        if (norm1 < EPSILON || norm2 < EPSILON) {
          throw new Error('Line coefficients a and b cannot both be zero');
        }

        // cos(theta) = |a1*a2 + b1*b2| / (sqrt(a1^2 + b1^2) * sqrt(a2^2 + b2^2))
        const dot = Math.abs(line1.a * line2.a + line1.b * line2.b);
        let cosTheta = Math.min(1, Math.max(0, dot / (norm1 * norm2)));
        if (Math.abs(cosTheta - 1) < EPSILON) {
          cosTheta = 1;
        } else if (cosTheta < EPSILON) {
          cosTheta = 0;
        }

        if (query === 'angle_cosine') {
          return cosTheta;
        }

        const thetaRad = Math.acos(cosTheta);
        if (query === 'angle_radians') {
          return thetaRad;
        }

        // Default: angle in degrees
        return (thetaRad * 180) / Math.PI;
      }

      throw new Error(`Unsupported line_distance_and_angle configuration or query: ${query}`);
    },

    matchesOption(optionText, expectedValue) {
      const val = safeEvaluateMathExpression(optionText);
      if (val === null) return false;
      return Math.abs(val - expectedValue) < EPSILON;
    },
  },

  /**
   * 7. calculus_extrema_second_derivative
   * Independent polynomial derivative & curvature test
   */
  calculus_extrema_second_derivative: {
    solve(inputs) {
      const { functionType, coefficients, criticalPoint, targetExtreme } = inputs;
      if (functionType !== 'polynomial' || !Array.isArray(coefficients)) {
        throw new Error('calculus solver currently supports polynomials');
      }

      // coefficients: [c0, c1, c2, ...] where f(x) = sum(c_k * x^k)
      // First derivative: f'(x) = sum(k * c_k * x^(k-1))
      const d1 = coefficients.slice(1).map((c, k) => (k + 1) * c);
      // Second derivative: f''(x) = sum(k * (k-1) * c_k * x^(k-2))
      const d2 = d1.slice(1).map((c, k) => (k + 1) * c);

      // Evaluate f'(x0) at critical point
      const x0 = criticalPoint;
      const fPrimeX0 = d1.reduce((sum, c, k) => sum + c * Math.pow(x0, k), 0);
      if (Math.abs(fPrimeX0) >= 1e-4) {
        throw new Error(`x0 = ${x0} is not a stationary critical point (f'(${x0}) = ${fPrimeX0} ≠ 0)`);
      }

      // Evaluate f''(x0) at critical point
      const fDoublePrimeX0 = d2.reduce((sum, c, k) => sum + c * Math.pow(x0, k), 0);

      // Inconclusive test protocol per Version 3.4:
      // If |f''(x0)| <= EPSILON, test is inconclusive -> return null (strictly rejected)
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
        if (lower.includes('minimum') || lower.includes('local min') || lower.includes('> 0')) {
          return true;
        }
      } else if (expected.provenExtreme === 'local_maximum') {
        if (lower.includes('maximum') || lower.includes('local max') || lower.includes('< 0')) {
          return true;
        }
      }
      return false;
    },
  },
};

/* ==========================================================================
   SYMBOLIC PREDICATE GRAMMAR & TRUTH-SET EQUIVALENCE ENGINE
   ========================================================================== */

/**
 * Parses a symbolic predicate string into an AST representation:
 * Example: "Δ > 0", "b^2 - 4ac = 0", "Δ >= 0", "m1 * m2 = -1"
 */
function parsePredicate(str) {
  if (!str || typeof str !== 'string') return null;

  let clean = str.trim().replace(/\$/g, '');
  // Normalize LaTeX inequality and symbol tokens
  clean = clean.replace(/\\geq?/g, '>=').replace(/\\leq?/g, '<=').replace(/\\neq?/g, '!=');
  clean = clean.replace(/\\Delta/g, 'Delta').replace(/\\/g, '');

  const match = clean.match(/^([Δ\w^\s*-]+)\s*(<=|>=|!=|<|>|=)\s*(-?[\d.]+)/);
  if (!match) return null;

  const rawSubject = match[1].trim().toLowerCase();
  const operator = match[2];
  const targetValue = parseFloat(match[3]);

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
    operator,
    targetValue,
    inclusive: operator === '<=' || operator === '>=',
  };
}

/**
 * Checks logical equivalence between two predicates over the real numbers domain.
 * Per Version 3.4: Overlap does not imply equivalence.
 * Exactly identical truth sets over the domain are required.
 */
function arePredicatesLogicallyEquivalent(predA, predB) {
  if (!predA || !predB) return false;
  if (predA.subject !== predB.subject) return false;

  // Same operator and target value
  if (predA.operator === predB.operator && Math.abs(predA.targetValue - predB.targetValue) < EPSILON) {
    return true;
  }

  // "=" vs "=="
  if ((predA.operator === '=' || predA.operator === '==') && (predB.operator === '=' || predB.operator === '==')) {
    return Math.abs(predA.targetValue - predB.targetValue) < EPSILON;
  }

  return false;
}

/**
 * Verifies a symbolic predicate question.
 * Supports being called with (question) or (options, targetPredicateStr).
 * Ensures:
 * 1. Exactly one option is logically equivalent to the target condition.
 * 2. Every distractor is logically non-equivalent.
 * 3. Distractors are mutually distinct (no duplicates).
 */
function verifySymbolicPredicateQuestion(optionsOrQuestion, targetPredicateStr) {
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

  // Check if any option failed to parse
  const unparsed = parsedOptions.find((p) => !p.ast);
  if (unparsed) {
    return {
      valid: false,
      isValid: false,
      error: `Unparseable symbolic option: "${unparsed.rawText}"`,
      reason: `Unparseable symbolic option: "${unparsed.rawText}"`,
    };
  }

  // Check for duplicate options (identical truth sets)
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

  // Find options equivalent to target condition
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

/* ==========================================================================
   PRIMARY QUESTION VALIDATOR
   ========================================================================== */

/**
 * Validates a single question generated by Gemini.
 * Never trusts Gemini's correctAnswer key; verifies ground truth independently.
 */
function validateQuestion(question) {
  if (!question || typeof question !== 'object') {
    return { valid: false, isValid: false, error: 'Question must be a non-null object.', reason: 'Question must be a non-null object.' };
  }

  // 1. Structure validation
  if (!question.statement || typeof question.statement !== 'string' || !question.statement.trim()) {
    return { valid: false, isValid: false, error: 'Question missing valid statement.', reason: 'Question missing valid statement.' };
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    return {
      valid: false,
      isValid: false,
      error: `Question must have exactly 4 options (found ${question.options?.length || 0}).`,
      reason: `Question must have exactly 4 options (found ${question.options?.length || 0}).`,
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

  // Verify non-empty option text
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

  // Verify 4-part Guide Me
  const gm = question.guideMe;
  if (!gm || !gm.whatToThink || !gm.howToApproach || !gm.rememberThis || !gm.applyNextTime) {
    return {
      valid: false,
      isValid: false,
      error: 'Question missing one or more of the 4 required Guide Me sections.',
      reason: 'Question missing one or more of the 4 required Guide Me sections.',
    };
  }

  // Non-judgmental coaching tone check per Version 3.4
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

  // Verify Hint and Solution
  if (!question.hint || !question.solution || !Array.isArray(question.solution.stepByStep) || !question.solution.finalAnswer) {
    return {
      valid: false,
      isValid: false,
      error: 'Question missing hint or structured step-by-step solution.',
      reason: 'Question missing hint or structured step-by-step solution.',
    };
  }

  // 2. Deterministic Verification Payload Processing
  const payload = question.verificationPayload;
  if (!payload || !payload.template || !payload.inputs) {
    return {
      valid: false,
      isValid: false,
      error: 'Question missing verificationPayload (template and inputs).',
      reason: 'Question missing verificationPayload (template and inputs).',
    };
  }

  // A. Numerical solver branch
  if (SOLVER_REGISTRY[payload.template]) {
    const solver = SOLVER_REGISTRY[payload.template];
    let computedResult;
    try {
      computedResult = solver.solve(payload.inputs);
    } catch (solveErr) {
      return {
        valid: false,
        isValid: false,
        error: `Deterministic solver "${payload.template}" execution failed: ${solveErr.message}`,
        reason: `Deterministic solver "${payload.template}" execution failed: ${solveErr.message}`,
      };
    }

    if (computedResult === null || computedResult === undefined) {
      return {
        valid: false,
        isValid: false,
        error: `Deterministic solver "${payload.template}" could not conclusively verify the question (e.g. inconclusive boundary).`,
        reason: `Deterministic solver "${payload.template}" could not conclusively verify the question (e.g. inconclusive boundary).`,
      };
    }

    // Match computed result against all 4 options
    const matchedOptions = question.options.filter((opt) => solver.matchesOption(opt.text, computedResult));

    if (matchedOptions.length === 0) {
      return {
        valid: false,
        isValid: false,
        error: `Zero options match independently computed solution (${JSON.stringify(computedResult)}).`,
        reason: `Zero options match independently computed solution (${JSON.stringify(computedResult)}).`,
      };
    }

    if (matchedOptions.length > 1) {
      return {
        valid: false,
        isValid: false,
        error: `Collision detected: Multiple options (${matchedOptions.map((o) => o.id).join(', ')}) match computed solution.`,
        reason: `Collision detected: Multiple options (${matchedOptions.map((o) => o.id).join(', ')}) match computed solution.`,
      };
    }

    const verifiedOptionId = matchedOptions[0].id;

    return {
      valid: true,
      isValid: true,
      verifiedOptionId,
      method: 'deterministic_solver',
      template: payload.template,
      computedResult,
    };
  }

  // B. Symbolic Predicate branch
  if (payload.template === 'symbolic_predicate') {
    const targetPredicate = payload.inputs?.targetPredicate || payload.inputs?.targetCondition;
    if (!targetPredicate) {
      return {
        valid: false,
        isValid: false,
        error: 'symbolic_predicate payload missing targetPredicate input.',
        reason: 'symbolic_predicate payload missing targetPredicate input.',
      };
    }

    const symbolicResult = verifySymbolicPredicateQuestion(question.options, targetPredicate);
    return symbolicResult;
  }

  // C. Unsupported template -> STRICT REJECTION
  return {
    valid: false,
    isValid: false,
    error: `Unsupported question template "${payload.template}". Unverifiable questions are strictly rejected.`,
    reason: `Unsupported question template "${payload.template}". Unverifiable questions are strictly rejected.`,
  };
}

module.exports = {
  safeEvaluateMathExpression,
  SOLVER_REGISTRY,
  parsePredicate,
  arePredicatesLogicallyEquivalent,
  verifySymbolicPredicateQuestion,
  validateQuestion,
};
