/**
 * data/mathCurriculum.js — Server-side curriculum data and lookup helpers.
 *
 * Mirrors the client curriculum to validate incoming requests and provide
 * pedagogical context for the AI prompt.
 */

const MATH_CHAPTERS = [
  {
    id: 'algebra',
    title: 'Algebra',
    desc: 'Quadratic equations, sequences, progressions, and complex numbers.',
    topics: [
      { id: 'quadratic-equations', title: 'Quadratic Equations', desc: 'Roots, discriminant analysis, nature of roots, and vertex form.' },
      { id: 'sequences-and-series', title: 'Sequences & Series', desc: 'Arithmetic, Geometric, and Harmonic progressions with summation formulas.' },
      { id: 'complex-numbers', title: 'Complex Numbers', desc: 'Argand plane, polar form, Euler formula, and De Moivre theorem.' },
      { id: 'binomial-theorem', title: 'Binomial Theorem', desc: 'General term, binomial coefficients, and expansions for any index.' },
    ],
  },
  {
    id: 'calculus',
    title: 'Calculus',
    desc: 'Limits, continuity, differentiation, integration, and applications.',
    topics: [
      { id: 'limits-and-continuity', title: 'Limits & Continuity', desc: 'Standard limits, L\'Hôpital rule, indeterminate forms, and continuity tests.' },
      { id: 'derivatives', title: 'Derivatives & Differentiation', desc: 'Chain rule, product rule, quotient rule, and implicit differentiation.' },
      { id: 'applications-of-derivatives', title: 'Applications of Derivatives', desc: 'Maxima, minima, rate of change, monotonicity, tangents, and normals.' },
      { id: 'indefinite-integrals', title: 'Indefinite Integration', desc: 'Integration by parts, substitution, partial fractions, and standard forms.' },
      { id: 'definite-integrals', title: 'Definite Integration', desc: 'Properties of definite integrals, area under curves, and Leibniz rule.' },
    ],
  },
  {
    id: 'trigonometry',
    title: 'Trigonometry',
    desc: 'Identities, compound angles, equations, and inverse functions.',
    topics: [
      { id: 'trigonometric-identities', title: 'Trigonometric Identities', desc: 'Pythagorean, compound angle, multiple angle, and product-to-sum identities.' },
      { id: 'trigonometric-equations', title: 'Trigonometric Equations', desc: 'General solutions, principal values, and conditional identities.' },
      { id: 'inverse-trigonometry', title: 'Inverse Trigonometric Functions', desc: 'Domain, range, principal branches, and conversion identities.' },
    ],
  },
  {
    id: 'coordinate-geometry',
    title: 'Coordinate Geometry',
    desc: 'Straight lines, circles, parabola, ellipse, and hyperbola.',
    topics: [
      { id: 'straight-lines', title: 'Straight Lines', desc: 'Slope-intercept, point-slope, distance formula, and angle between lines.' },
      { id: 'circles', title: 'Circles', desc: 'Standard equations, tangents, normals, chord of contact, and power of a point.' },
      { id: 'parabola', title: 'Parabola', desc: 'Standard forms, focal distance, tangent, normal, and parametric equations.' },
      { id: 'ellipse-and-hyperbola', title: 'Ellipse & Hyperbola', desc: 'Eccentricity, foci, directrices, asymptotes, and parametric representations.' },
    ],
  },
  {
    id: 'vectors-and-3d',
    title: 'Vectors & 3D Geometry',
    desc: 'Dot product, cross product, lines and planes in three-dimensional space.',
    topics: [
      { id: 'vector-algebra', title: 'Vector Algebra', desc: 'Dot product, cross product, projection, and scalar triple product.' },
      { id: 'lines-and-planes-3d', title: 'Lines & Planes in 3D', desc: 'Vector and Cartesian equations of lines, planes, and distances.' },
    ],
  },
  {
    id: 'probability-and-statistics',
    title: 'Probability & Statistics',
    desc: 'Permutations, combinations, conditional probability, Bayes\' theorem, and distributions.',
    topics: [
      { id: 'probability-and-bayes', title: 'Probability & Bayes\' Theorem', desc: 'Independent events, conditional probability, total probability, and Bayes\' rule.' },
      { id: 'statistics-and-distribution', title: 'Statistics & Distributions', desc: 'Mean, variance, standard deviation, and binomial distribution.' },
    ],
  },
];

function getChapterById(chapterId) {
  return MATH_CHAPTERS.find((c) => c.id === chapterId) || null;
}

function getTopicById(chapterId, topicId) {
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

module.exports = {
  MATH_CHAPTERS,
  getChapterById,
  getTopicById,
};
