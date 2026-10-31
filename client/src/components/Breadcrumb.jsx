/**
 * Breadcrumb.jsx — Reusable breadcrumb and back navigation bar.
 *
 * Provides structured navigation hierarchy for deep milestone flows.
 */

import { Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import './Breadcrumb.css';

export default function Breadcrumb({ items = [], backTo = null, backLabel = 'Back' }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {backTo && (
        <Link to={backTo} className="breadcrumb__back-btn" aria-label={`Back to ${backLabel}`}>
          <ArrowLeft size={15} />
          <span>{backLabel}</span>
        </Link>
      )}

      <ol className="breadcrumb__list">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={item.label} className="breadcrumb__item">
              {idx > 0 && <ChevronRight size={13} className="breadcrumb__separator" aria-hidden="true" />}
              {isLast || !item.to ? (
                <span className="breadcrumb__current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="breadcrumb__link">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
