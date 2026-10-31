/**
 * ScrollToTop.jsx — Global scroll management component.
 *
 * Ensures:
 * 1. Navigating to different routes scrolls immediately to top (0, 0).
 * 2. Hash navigation (e.g. #subjects, #how-it-works) scrolls smoothly to the target element.
 * 3. Browser Back/Forward (POP navigation) preserves native scroll restoration.
 */

import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // If a hash is present, scroll smoothly to the target anchor element
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Fallback if the element renders on the next frame
        const timer = setTimeout(() => {
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 0);
        return () => clearTimeout(timer);
      }
      return;
    }

    // On browser Back/Forward (POP), preserve browser's native scroll position restoration
    if (navType === 'POP') {
      return;
    }

    // For route navigation (PUSH/REPLACE) without a hash,
    // scroll immediately to top so the new page starts at the very top.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, hash, navType]);

  return null;
}
