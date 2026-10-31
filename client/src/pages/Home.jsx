/**
 * Home.jsx — Landing page for LearnWell.
 *
 * Sections (in order):
 *  1. Hero — left: heading + CTA, right: educational mathematics illustration
 *  2. Explore Subjects — 4 subject cards (Mathematics highlighted)
 *  3. How It Works — 4 steps
 *  4. Features — 4 feature cards
 *  5. Get Started — final CTA
 *  6. Footer (rendered by Layout)
 *
 * Preserves the API health-check indicator from M1.
 */

import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calculator, Code, Brain, BookA, Lock,
  Plus, Lightbulb, Target, TrendingUp,
  FileQuestion, BotMessageSquare, ListChecks, BarChart3,
} from 'lucide-react';
import './Home.css';

/* ---- Static data ---- */
const SUBJECTS = [
  { id: 'mathematics', label: 'Mathematics', desc: 'Formulas, Practice, Concepts', icon: Calculator, active: true },
  { id: 'cs', label: 'Computer Science', desc: 'Coming Soon', icon: Code, active: false },
  { id: 'reasoning', label: 'Reasoning', desc: 'Coming Soon', icon: Brain, active: false },
  { id: 'english', label: 'English', desc: 'Coming Soon', icon: BookA, active: false },
];

const STEPS = [
  { num: '01', icon: Plus, title: 'Add formulas or concepts.', desc: 'Input the formulas and topics you want to master.' },
  { num: '02', icon: Lightbulb, title: 'Understand the concept.', desc: 'Get clear AI explanations that break down core principles.' },
  { num: '03', icon: Target, title: 'Practice targeted questions.', desc: 'Solve tailored problems calibrated to your skill level.' },
  { num: '04', icon: TrendingUp, title: 'Analyze mistakes and improve.', desc: 'Review step-by-step solutions to build real confidence.' },
];

const FEATURES = [
  { icon: FileQuestion, title: 'Formula to Questions', desc: 'Automatically generate practice questions from any formula.' },
  { icon: BotMessageSquare, title: 'AI Concept Explanation', desc: 'Understand every concept with clear, step-by-step explanations.' },
  { icon: ListChecks, title: 'Step-by-step Solutions', desc: 'See detailed breakdowns for every problem you solve.' },
  { icon: BarChart3, title: 'Progress Tracking', desc: 'Monitor your improvement and identify weak areas.' },
];

export default function Home() {
  return (
    <div className="home">
      {/* ====== 1. HERO ====== */}
      <section className="hero">
        <div className="hero__inner container">
          {/* Left Side */}
          <div className="hero__content">
            <h1 className="hero__title">
              Master Concepts.<br />
              <span className="hero__title-accent">Solve Confidently.</span>
            </h1>

            <div className="hero__actions">
              <a href="#subjects" className="hero__cta">
                Start Learning
                <ArrowRight size={16} />
              </a>

              <a href="#how-it-works" className="hero__secondary-btn">
                How It Works?
              </a>
            </div>
          </div>

          {/* Right Side — Educational Mathematics Illustration */}
          <div className="hero__visual">
            <div className="hero__illustration" aria-hidden="true">
              <div className="hero__illus-header">
                <div className="hero__illus-tag">
                  <Calculator size={13} strokeWidth={2} />
                  <span>Concept Studio</span>
                </div>
                <span className="hero__illus-chip">f(x) = x² - 2x - 3</span>
              </div>

              <div className="hero__illus-canvas">
                <svg
                  viewBox="0 0 340 200"
                  className="hero__illus-svg"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Grid Lines */}
                  <g className="hero__svg-grid" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.25">
                    <line x1="30" y1="30" x2="310" y2="30" />
                    <line x1="30" y1="70" x2="310" y2="70" />
                    <line x1="30" y1="110" x2="310" y2="110" />
                    <line x1="30" y1="150" x2="310" y2="150" />
                    <line x1="70" y1="20" x2="70" y2="180" />
                    <line x1="120" y1="20" x2="120" y2="180" />
                    <line x1="170" y1="20" x2="170" y2="180" />
                    <line x1="220" y1="20" x2="220" y2="180" />
                    <line x1="270" y1="20" x2="270" y2="180" />
                  </g>

                  {/* Coordinate Axes */}
                  <g className="hero__svg-axis" stroke="currentColor" strokeWidth="1" opacity="0.45">
                    {/* X axis */}
                    <line x1="20" y1="110" x2="320" y2="110" />
                    <polygon points="320,110 314,107 314,113" fill="currentColor" />
                    {/* Y axis */}
                    <line x1="120" y1="185" x2="120" y2="15" />
                    <polygon points="120,15 117,21 123,21" fill="currentColor" />
                  </g>

                  {/* Axis Labels */}
                  <text x="322" y="106" className="hero__svg-text" fill="currentColor" opacity="0.6">x</text>
                  <text x="126" y="22" className="hero__svg-text" fill="currentColor" opacity="0.6">y</text>

                  {/* Right Triangle Geometric Element (Pythagorean) */}
                  <g className="hero__svg-triangle" opacity="0.75">
                    <polygon points="200,110 270,110 270,50" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 2" />
                    <rect x="260" y="100" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
                    <text x="235" y="124" className="hero__svg-label" fill="currentColor">a</text>
                    <text x="278" y="82" className="hero__svg-label" fill="currentColor">b</text>
                    <text x="230" y="75" className="hero__svg-label" fill="var(--accent-primary)" fontWeight="600">c</text>
                  </g>

                  {/* Parabola Curve f(x) */}
                  <path
                    d="M 40 40 Q 140 215 240 40"
                    className="hero__svg-curve"
                    stroke="var(--accent-primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Root 1 (-1, 0) */}
                  <circle cx="70" cy="110" r="4" fill="var(--bg-elevated)" stroke="var(--accent-primary)" strokeWidth="2" />
                  {/* Root 2 (3, 0) */}
                  <circle cx="210" cy="110" r="4" fill="var(--bg-elevated)" stroke="var(--accent-primary)" strokeWidth="2" />

                  {/* Vertex (1, -4) */}
                  <circle cx="140" cy="155" r="4.5" fill="var(--accent-primary)" stroke="var(--bg-elevated)" strokeWidth="1.5" />
                  <text x="148" y="166" className="hero__svg-point-label" fill="currentColor">V (1, -4)</text>

                  {/* Tangent line at vertex */}
                  <line x1="105" y1="155" x2="175" y2="155" stroke="var(--accent-primary)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                </svg>
              </div>

              {/* Bottom concept chips */}
              <div className="hero__illus-footer">
                <span className="hero__illus-pill">a² + b² = c²</span>
                <span className="hero__illus-pill hero__illus-pill--accent">Δ = b² - 4ac</span>
                <span className="hero__illus-pill">x = -b / 2a</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== 2. EXPLORE SUBJECTS ====== */}
      <section className="section subjects-section" id="subjects">
        <div className="container">
          <h2 className="section__heading">Explore Subjects</h2>
          <p className="section__subheading">Select a subject to begin focused practice</p>

          <div className="subjects__grid">
            {SUBJECTS.map(({ id, label, desc, icon: Icon, active }) => {
              const cardInner = (
                <>
                  <div className="subject-card__icon">
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <h3 className="subject-card__title">{label}</h3>
                  <p className="subject-card__desc">{desc}</p>
                  {!active && (
                    <span className="subject-card__badge">
                      <Lock size={10} /> Coming Soon
                    </span>
                  )}
                  {active && (
                    <span className="subject-card__badge subject-card__badge--active">
                      Available Now
                    </span>
                  )}
                </>
              );

              return active ? (
                <Link
                  key={id}
                  to="/subjects/mathematics"
                  className="subject-card subject-card--active"
                  title="Explore Mathematics Chapters"
                >
                  {cardInner}
                </Link>
              ) : (
                <div
                  key={id}
                  className="subject-card subject-card--locked"
                  aria-disabled="true"
                >
                  {cardInner}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====== 3. HOW IT WORKS ====== */}
      <section className="section hiw-section" id="how-it-works">
        <div className="container">
          <h2 className="section__heading">How It Works</h2>
          <p className="section__subheading">A structured approach to mathematical mastery</p>

          <div className="hiw__grid">
            {STEPS.map(({ num, icon: Icon, title, desc }) => (
              <div key={num} className="hiw-card">
                <span className="hiw-card__num">{num}</span>
                <div className="hiw-card__icon">
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <h3 className="hiw-card__title">{title}</h3>
                <p className="hiw-card__desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== 4. FEATURES ====== */}
      <section className="section features-section">
        <div className="container">
          <h2 className="section__heading">Features</h2>
          <p className="section__subheading">Essential tools for deep understanding</p>

          <div className="features__grid">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="feature-card">
                <div className="feature-card__icon">
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <h3 className="feature-card__title">{title}</h3>
                <p className="feature-card__desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== 5. GET STARTED ====== */}
      <section className="section cta-section">
        <div className="container">
          <div className="cta-block">
            <h2 className="cta-block__title">Ready to Master Mathematics?</h2>
            <p className="cta-block__desc">
              Start practicing with curated problems and AI-guided concept explanations.
            </p>
            <button type="button" className="cta-block__btn">
              Get Started
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
