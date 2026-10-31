/**
 * NotFound.jsx — Clean 404 Not Found Page.
 *
 * Catches all unmatched routes with an intuitive recovery pathway.
 */

import { Link } from 'react-router-dom';
import { Home as HomeIcon, Calculator } from 'lucide-react';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="container">
        <div className="not-found-box">
          <span className="not-found-box__code">404</span>
          <h1 className="not-found-box__title">Page Not Found</h1>
          <p className="not-found-box__desc">
            The page you are looking for does not exist or may have been moved.
            Let&rsquo;s get you back on track with your learning.
          </p>

          <div className="not-found-box__actions">
            <Link to="/" className="not-found-box__primary-btn">
              <HomeIcon size={16} />
              <span>Back to Home</span>
            </Link>

            <Link to="/subjects/mathematics" className="not-found-box__secondary-btn">
              <Calculator size={16} />
              <span>Mathematics Chapters</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
