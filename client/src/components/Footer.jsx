/**
 * Footer.jsx — Minimal site footer.
 *
 * Shows branding and quick links.
 * Kept intentionally lightweight.
 */

import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Footer.css';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container">
        <div className="footer__brand">
          <BookOpen size={16} strokeWidth={2.2} />
          <span>LearnWell</span>
        </div>

        <nav className="footer__links">
          <Link to="/" className="footer__link">Home</Link>
          <Link to="/practice" className="footer__link">Practice</Link>
          <Link to="/formula-lab" className="footer__link">Formula Lab</Link>
          <Link to="/history" className="footer__link">History</Link>
          <Link to="/notes" className="footer__link">Notes</Link>
        </nav>

        <p className="footer__copy">
          &copy; {CURRENT_YEAR} LearnWell. Built for learners.
        </p>
      </div>
    </footer>
  );
}
