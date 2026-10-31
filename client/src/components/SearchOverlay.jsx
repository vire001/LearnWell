/**
 * SearchOverlay.jsx — Clean search overlay.
 *
 * Opens as a centred modal overlay with a search input.
 * Closes on Escape key or clicking the backdrop.
 * Placeholder for future search functionality.
 */

import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import './SearchOverlay.css';

export default function SearchOverlay({ isOpen, onClose }) {
  const inputRef = useRef(null);

  /* Focus input when overlay opens, handle Escape to close */
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => inputRef.current?.focus(), 50);

    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);

    /* Prevent body scrolling while overlay is open */
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div
        className="search-overlay__panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="search-overlay__input-row">
          <Search size={18} className="search-overlay__icon" />
          <input
            ref={inputRef}
            type="text"
            className="search-overlay__input"
            placeholder="Search topics, formulas, concepts…"
            aria-label="Search"
          />
          <button
            className="search-overlay__close"
            onClick={onClose}
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>
        <p className="search-overlay__hint">
          Search functionality coming soon.
        </p>
      </div>
    </div>
  );
}
