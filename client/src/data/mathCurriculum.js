/**
 * mathCurriculum.js — Structured Mathematics syllabus data.
 *
 * Provides competitive-exam grade chapters, topics, and standard formulas.
 * Decoupled from presentation components for maintainability and testability.
 */

export const MATH_CHAPTERS = [
  {
    id: 'algebra',
    title: 'Algebra',
    desc: 'Quadratic equations, sequences, progressions, and complex numbers.',
    badge: 'Core Foundation',
    topics: [
      {
        id: 'quadratic-equations',
        title: 'Quadratic Equations',
        desc: 'Roots, discriminant analysis, nature of roots, and vertex form.',
        suggestedFormulas: [
          'ax² + bx + c = 0',
          'x = (-b ± √(b² - 4ac)) / (2a)',
          'Δ = b² - 4ac',
          'Sum of roots: α + β = -b/a',
          'Product of roots: α · β = c/a',
          'Vertex coordinates: (-b / 2a, -Δ / 4a)',
        ],
      },
      {
        id: 'sequences-and-series',
        title: 'Sequences & Series',
        desc: 'Arithmetic, Geometric, and Harmonic progressions with summation formulas.',
        suggestedFormulas: [
          'AP nth term: a_n = a + (n - 1)d',
          'AP Sum: S_n = (n / 2) · [2a + (n - 1)d]',
          'GP nth term: a_n = a · r^(n - 1)',
          'GP Sum: S_n = a · (1 - r^n) / (1 - r)',
          'Infinite GP Sum: S_∞ = a / (1 - r), |r| < 1',
        ],
      },
      {
        id: 'complex-numbers',
        title: 'Complex Numbers',
        desc: 'Argand plane, polar form, Euler formula, and De Moivre theorem.',
        suggestedFormulas: [
          'z = a + ib = r(cos θ + i sin θ)',
          'Euler Form: z = r · e^(iθ)',
          'Modulus: |z| = √(a² + b²)',
          'De Moivre: (cos θ + i sin θ)^n = cos(nθ) + i sin(nθ)',
          'Cube roots of unity: 1 + ω + ω² = 0',
        ],
      },
      {
        id: 'binomial-theorem',
        title: 'Binomial Theorem',
        desc: 'General term, binomial coefficients, and expansions for any index.',
        suggestedFormulas: [
          '(x + y)^n = Σ [nCr · x^(n - r) · y^r]',
          'General term: T_(r+1) = nCr · x^(n-r) · y^r',
          'nCr = n! / (r! · (n - r)!)',
          'Sum of coefficients: 2^n',
        ],
      },
    ],
  },
  {
    id: 'calculus',
    title: 'Calculus',
    desc: 'Limits, continuity, differentiation, integration, and applications.',
    badge: 'High Weightage',
    topics: [
      {
        id: 'limits-and-continuity',
        title: 'Limits & Continuity',
        desc: 'Standard limits, L\'Hôpital rule, indeterminate forms, and continuity tests.',
        suggestedFormulas: [
          'lim(x→0) [sin(x) / x] = 1',
          'lim(x→0) [(e^x - 1) / x] = 1',
          'lim(x→0) [ln(1 + x) / x] = 1',
          'L\'Hôpital: lim [f(x) / g(x)] = lim [f\'(x) / g\'(x)]',
          'lim(x→a) [(x^n - a^n) / (x - a)] = n · a^(n - 1)',
        ],
      },
      {
        id: 'derivatives',
        title: 'Derivatives & Differentiation',
        desc: 'Chain rule, product rule, quotient rule, and implicit differentiation.',
        suggestedFormulas: [
          'd/dx [f(x) · g(x)] = f\'(x)g(x) + f(x)g\'(x)',
          'd/dx [f(x) / g(x)] = [f\'(x)g(x) - f(x)g\'(x)] / [g(x)]²',
          'Chain rule: d/dx [f(g(x))] = f\'(g(x)) · g\'(x)',
          'd/dx [x^n] = n · x^(n - 1)',
          'd/dx [e^(ax)] = a · e^(ax)',
        ],
      },
      {
        id: 'applications-of-derivatives',
        title: 'Applications of Derivatives',
        desc: 'Maxima, minima, rate of change, monotonicity, tangents, and normals.',
        suggestedFormulas: [
          'Critical point condition: f\'(x) = 0',
          'Second derivative test: f\'\'(x) > 0 (Min), f\'\'(x) < 0 (Max)',
          'Slope of tangent: m = f\'(x_0)',
          'Slope of normal: m_normal = -1 / f\'(x_0)',
          'Rolle\'s Theorem: f\'(c) = 0 for some c ∈ (a, b)',
        ],
      },
      {
        id: 'indefinite-integrals',
        title: 'Indefinite Integration',
        desc: 'Integration by parts, substitution, partial fractions, and standard forms.',
        suggestedFormulas: [
          '∫ x^n dx = (x^(n+1)) / (n+1) + C, n ≠ -1',
          '∫ (1/x) dx = ln|x| + C',
          'Integration by parts: ∫ u v\' dx = uv - ∫ u\' v dx',
          '∫ e^x [f(x) + f\'(x)] dx = e^x · f(x) + C',
          '∫ 1/(x² + a²) dx = (1/a) · arctan(x/a) + C',
        ],
      },
      {
        id: 'definite-integrals',
        title: 'Definite Integration',
        desc: 'Properties of definite integrals, area under curves, and Leibniz rule.',
        suggestedFormulas: [
          '∫[a to b] f(x) dx = F(b) - F(a)',
          '∫[a to b] f(x) dx = ∫[a to b] f(a + b - x) dx',
          'Area under curve: A = ∫[a to b] |y| dx',
          'Leibniz: d/dx ∫[u(x) to v(x)] f(t) dt = f(v)v\' - f(u)u\'',
        ],
      },
    ],
  },
  {
    id: 'trigonometry',
    title: 'Trigonometry',
    desc: 'Identities, compound angles, equations, and inverse functions.',
    badge: 'Essential',
    topics: [
      {
        id: 'trigonometric-identities',
        title: 'Trigonometric Identities',
        desc: 'Pythagorean, compound angle, multiple angle, and product-to-sum identities.',
        suggestedFormulas: [
          'sin²θ + cos²θ = 1',
          'sin(A ± B) = sin A cos B ± cos A sin B',
          'cos(A ± B) = cos A cos B ∓ sin A sin B',
          'sin(2θ) = 2 sin θ cos θ',
          'cos(2θ) = cos²θ - sin²θ = 2cos²θ - 1 = 1 - 2sin²θ',
          'tan(A + B) = (tan A + tan B) / (1 - tan A tan B)',
        ],
      },
      {
        id: 'trigonometric-equations',
        title: 'Trigonometric Equations',
        desc: 'General solutions, principal values, and conditional identities.',
        suggestedFormulas: [
          'sin θ = sin α  ⇒  θ = nπ + (-1)^n · α',
          'cos θ = cos α  ⇒  θ = 2nπ ± α',
          'tan θ = tan α  ⇒  θ = nπ + α',
          'a cos θ + b sin θ = r cos(θ - φ), r = √(a² + b²)',
        ],
      },
      {
        id: 'inverse-trigonometry',
        title: 'Inverse Trigonometric Functions',
        desc: 'Domain, range, principal branches, and conversion identities.',
        suggestedFormulas: [
          'sin⁻¹(x) + cos⁻¹(x) = π/2, x ∈ [-1, 1]',
          'tan⁻¹(x) + cot⁻¹(x) = π/2, x ∈ R',
          'tan⁻¹(x) + tan⁻¹(y) = tan⁻¹((x + y) / (1 - xy)), xy < 1',
          '2 tan⁻¹(x) = sin⁻¹(2x / (1 + x²))',
        ],
      },
    ],
  },
  {
    id: 'coordinate-geometry',
    title: 'Coordinate Geometry',
    desc: 'Straight lines, circles, parabola, ellipse, and hyperbola.',
    badge: 'Analytical',
    topics: [
      {
        id: 'straight-lines',
        title: 'Straight Lines',
        desc: 'Slope-intercept, point-slope, distance formula, and angle between lines.',
        suggestedFormulas: [
          'Slope: m = (y₂ - y₁) / (x₂ - x₁)',
          'Line equation: y - y₁ = m(x - x₁)',
          'Perpendicular distance: d = |ax₁ + by₁ + c| / √(a² + b²)',
          'Distance between parallel lines: d = |c₁ - c₂| / √(a² + b²)',
          'tan θ = |(m₁ - m₂) / (1 + m₁m₂)|',
        ],
      },
      {
        id: 'circles',
        title: 'Circles',
        desc: 'Standard equations, tangents, normals, chord of contact, and power of a point.',
        suggestedFormulas: [
          '(x - h)² + (y - k)² = r²',
          'General equation: x² + y² + 2gx + 2fy + c = 0',
          'Center: (-g, -f), Radius: √(g² + f² - c)',
          'Tangent at (x₁, y₁): xx₁ + yy₁ + g(x + x₁) + f(y + y₁) + c = 0',
          'Condition of tangency for y = mx + c: c² = a²(1 + m²)',
        ],
      },
      {
        id: 'parabola',
        title: 'Parabola',
        desc: 'Standard forms, focal distance, tangent, normal, and parametric equations.',
        suggestedFormulas: [
          'Standard form: y² = 4ax (Focus: (a, 0), Directrix: x = -a)',
          'Latus Rectum length: 4a',
          'Parametric coordinates: (at², 2at)',
          'Tangent equation: y = mx + a/m',
          'Focal distance of (x, y): |x + a|',
        ],
      },
      {
        id: 'ellipse-and-hyperbola',
        title: 'Ellipse & Hyperbola',
        desc: 'Eccentricity, foci, directrices, asymptotes, and parametric representations.',
        suggestedFormulas: [
          'Ellipse: x²/a² + y²/b² = 1 (b² = a²(1 - e²), e < 1)',
          'Hyperbola: x²/a² - y²/b² = 1 (b² = a²(e² - 1), e > 1)',
          'Foci coordinates: (±ae, 0)',
          'Directrices equations: x = ±a/e',
          'Hyperbola Asymptotes: y = ±(b/a)x',
        ],
      },
    ],
  },
  {
    id: 'vectors-and-3d',
    title: 'Vectors & 3D Geometry',
    desc: 'Dot product, cross product, lines and planes in three-dimensional space.',
    badge: 'Spatial',
    topics: [
      {
        id: 'vector-algebra',
        title: 'Vector Algebra',
        desc: 'Dot product, cross product, projection, and scalar triple product.',
        suggestedFormulas: [
          'Dot Product: a · b = |a||b| cos θ',
          'Cross Product: a × b = |a||b| sin θ n̂',
          'Projection of a on b: (a · b) / |b|',
          'Scalar Triple Product: [a b c] = a · (b × c)',
          'Area of parallelogram: |a × b|',
        ],
      },
      {
        id: 'lines-and-planes-3d',
        title: 'Lines & Planes in 3D',
        desc: 'Vector and Cartesian equations of lines, planes, and distances.',
        suggestedFormulas: [
          'Vector line: r = a + λb',
          'Cartesian line: (x - x₁)/a = (y - y₁)/b = (z - z₁)/c',
          'Plane equation: ax + by + cz + d = 0',
          'Distance of point from plane: |ax₁ + by₁ + cz₁ + d| / √(a² + b² + c²)',
          'Shortest distance between skew lines: |(a₂ - a₁) · (b₁ × b₂)| / |b₁ × b₂|',
        ],
      },
    ],
  },
  {
    id: 'probability-and-statistics',
    title: 'Probability & Statistics',
    desc: 'Permutations, combinations, conditional probability, Bayes\' theorem, and distributions.',
    badge: 'Analytical',
    topics: [
      {
        id: 'probability-and-bayes',
        title: 'Probability & Bayes\' Theorem',
        desc: 'Independent events, conditional probability, total probability, and Bayes\' rule.',
        suggestedFormulas: [
          'Conditional probability: P(A|B) = P(A ∩ B) / P(B)',
          'Multiplication rule: P(A ∩ B) = P(A) · P(B|A)',
          'Bayes\' Theorem: P(A_i|B) = [P(A_i)P(B|A_i)] / Σ [P(A_j)P(B|A_j)]',
          'Independent events: P(A ∩ B) = P(A) · P(B)',
        ],
      },
      {
        id: 'statistics-and-distribution',
        title: 'Statistics & Distributions',
        desc: 'Mean, variance, standard deviation, and binomial distribution.',
        suggestedFormulas: [
          'Mean: x̄ = Σ(x_i) / n',
          'Variance: σ² = Σ(x_i - x̄)² / n = (Σx_i² / n) - (x̄)²',
          'Standard Deviation: σ = √(Variance)',
          'Binomial distribution: P(X = r) = nCr · p^r · q^(n - r)',
          'Binomial Mean: μ = np, Variance: σ² = npq',
        ],
      },
    ],
  },
];

/**
 * Helper to get all chapters with their topic count calculated.
 */
export function getAllChapters() {
  return MATH_CHAPTERS.map((ch) => ({
    ...ch,
    topicCount: ch.topics.length,
  }));
}

/**
 * Helper to find a specific chapter by its ID.
 */
export function getChapterById(chapterId) {
  const chapter = MATH_CHAPTERS.find((c) => c.id === chapterId);
  if (!chapter) return null;
  return {
    ...chapter,
    topicCount: chapter.topics.length,
  };
}

/**
 * Helper to find a specific topic within a chapter.
 */
export function getTopicById(chapterId, topicId) {
  const chapter = getChapterById(chapterId);
  if (!chapter) return null;
  const topic = chapter.topics.find((t) => t.id === topicId);
  if (!topic) return null;
  return {
    ...topic,
    chapterTitle: chapter.title,
    chapterId: chapter.id,
  };
}
