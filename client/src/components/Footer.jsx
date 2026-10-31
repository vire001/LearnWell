/**
 * Footer.jsx — Minimal site footer.
 *
 * Shows branding and quick links.
 * Kept intentionally lightweight.
 */

import { BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import './Footer.css';

const CURRENT_YEAR = new Date().getFullYear();

const FOOTER_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Practice', to: '/practice' },
  { label: 'Formula Lab', to: '/formula-lab' },
  { label: 'History', to: '/history' },
  { label: 'Notes', to: '/notes' },
];

export default function Footer() {
  const location = useLocation();

  const handleLinkClick = (to) => {
    // If the user clicks a link targeting the current route, scroll smoothly to top
    if (location.pathname === to) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer">
      <div className="footer__inner container">
        <div className="footer__brand">
          <BookOpen size={16} strokeWidth={2.2} />
          <span>LearnWell</span>
        </div>

        <nav className="footer__links">
          {FOOTER_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="footer__link"
              onClick={() => handleLinkClick(to)}
            >
              {label}
            </Link>
          ))}
        </nav>

        <p className="footer__copy">
          &copy; {CURRENT_YEAR} LearnWell. Built for learners.
        </p>
      </div>
    </footer>
  );
}
