/**
 * MathTopics.jsx — Topic Selection Page for a chosen chapter.
 *
 * Route: /subjects/mathematics/:chapterId
 * Displays all topics inside the selected chapter.
 */

import { useParams, Link } from 'react-router-dom';
import { ArrowRight, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import Breadcrumb from '../components/Breadcrumb';
import { getChapterById } from '../data/mathCurriculum';
import './MathTopics.css';

export default function MathTopics() {
  const { chapterId } = useParams();
  const chapter = getChapterById(chapterId);

  // Handle invalid chapter ID gracefully
  if (!chapter) {
    return (
      <div className="math-page">
        <div className="container">
          <Breadcrumb
            backTo="/subjects/mathematics"
            backLabel="Back to Chapters"
            items={[
              { label: 'Home', to: '/' },
              { label: 'Mathematics', to: '/subjects/mathematics' },
              { label: 'Not Found' },
            ]}
          />
          <div className="not-found-card">
            <AlertCircle size={36} className="not-found-card__icon" />
            <h1 className="not-found-card__title">Chapter Not Found</h1>
            <p className="not-found-card__desc">
              We couldn't find a mathematics chapter with the identifier &ldquo;{chapterId}&rdquo;.
            </p>
            <Link to="/subjects/mathematics" className="not-found-card__btn">
              Browse All Chapters
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="math-page">
      <div className="container">
        {/* Breadcrumb navigation */}
        <Breadcrumb
          backTo="/subjects/mathematics"
          backLabel="All Chapters"
          items={[
            { label: 'Home', to: '/' },
            { label: 'Mathematics', to: '/subjects/mathematics' },
            { label: chapter.title },
          ]}
        />

        {/* Header section */}
        <header className="math-page__header">
          <div className="math-page__header-badge">
            <BookOpen size={14} />
            <span>Chapter Topics</span>
          </div>
          <h1 className="math-page__title">{chapter.title}</h1>
          <p className="math-page__subtitle">{chapter.desc}</p>
        </header>

        {/* Topics List / Grid */}
        <div className="topics-list">
          {chapter.topics.map((topic, index) => (
            <Link
              key={topic.id}
              to={`/subjects/mathematics/${chapter.id}/${topic.id}`}
              className="topic-card"
            >
              <div className="topic-card__index">
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>

              <div className="topic-card__content">
                <div className="topic-card__header">
                  <h2 className="topic-card__title">{topic.title}</h2>
                  <span className="topic-card__pill">
                    <Sparkles size={11} />
                    <span>{topic.suggestedFormulas.length} Formulas</span>
                  </span>
                </div>
                <p className="topic-card__desc">{topic.desc}</p>
              </div>

              <div className="topic-card__action">
                <span className="topic-card__action-text">Add Formula</span>
                <ArrowRight size={16} className="topic-card__arrow" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
