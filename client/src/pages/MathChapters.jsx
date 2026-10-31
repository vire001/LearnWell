/**
 * MathChapters.jsx — Mathematics Chapter Selection Page.
 *
 * Route: /subjects/mathematics
 * Displays competitive exam mathematics chapters in responsive cards.
 */

import { Link } from 'react-router-dom';
import { Calculator, ArrowRight, Layers } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { getAllChapters } from '../data/mathCurriculum';
import './MathChapters.css';

export default function MathChapters() {
  const chapters = getAllChapters();

  return (
    <div className="math-page">
      <div className="container">
        {/* Breadcrumb navigation */}
        <Breadcrumb
          backTo="/"
          backLabel="Back to Home"
          items={[
            { label: 'Home', to: '/' },
            { label: 'Mathematics' },
          ]}
        />

        {/* Header section */}
        <header className="math-page__header">
          <div className="math-page__header-badge">
            <Calculator size={14} />
            <span>Curriculum</span>
          </div>
          <h1 className="math-page__title">Mathematics Chapters</h1>
          <p className="math-page__subtitle">
            Choose a chapter to master its core concepts, standard formulas, and targeted practice.
          </p>
        </header>

        {/* Chapters Grid */}
        <div className="chapters-grid">
          {chapters.map((chapter) => (
            <Link
              key={chapter.id}
              to={`/subjects/mathematics/${chapter.id}`}
              className="chapter-card"
            >
              <div className="chapter-card__top">
                <span className="chapter-card__badge">{chapter.badge}</span>
                <span className="chapter-card__count">
                  <Layers size={13} />
                  <span>{chapter.topicCount} Topics</span>
                </span>
              </div>

              <h2 className="chapter-card__title">{chapter.title}</h2>
              <p className="chapter-card__desc">{chapter.desc}</p>

              <div className="chapter-card__footer">
                <span className="chapter-card__action">
                  <span>Explore Topics</span>
                  <ArrowRight size={14} className="chapter-card__arrow" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
