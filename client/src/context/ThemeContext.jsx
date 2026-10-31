/**
 * ThemeContext.jsx — Manages dark/light theme state provider.
 *
 * Reads initial preference from localStorage (key: "learnwell-theme").
 * Falls back to "dark" when no preference is stored.
 * Sets `data-theme` attribute on <html> so CSS variables cascade.
 */

import { useState, useEffect, useCallback } from 'react';
import { ThemeContext } from './ThemeContextInstance';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('learnwell-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  /* Apply data-theme to <html> whenever theme changes */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('learnwell-theme', theme);
    } catch {
      /* storage unavailable – graceful degradation */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
