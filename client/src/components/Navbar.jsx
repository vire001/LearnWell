/**
 * Navbar.jsx — Responsive top navigation bar.
 *
 * LEFT:   Brand logo
 * CENTER: Home, Subjects (dropdown), Practice, Formula Lab, History, Notes
 * RIGHT:  Search icon, Theme toggle, Get Started button
 *
 * Mobile: Collapses centre links into hamburger menu.
 * Subjects dropdown shows a compact 2×2 grid with subject cards.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sun, Moon, Menu, X, BookOpen, Search,
  ChevronDown, Calculator, Code, Brain, BookA,
} from 'lucide-react';
import { useTheme } from '../context/useTheme';
import SearchOverlay from './SearchOverlay';
import './Navbar.css';

const SUBJECTS = [
  { id: 'mathematics', label: 'Mathematics', icon: Calculator, active: true },
  { id: 'cs', label: 'Computer Science', icon: Code, active: false },
  { id: 'reasoning', label: 'Reasoning', icon: Brain, active: false },
  { id: 'english', label: 'English', icon: BookA, active: false },
];

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const subjectsRef = useRef(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setSubjectsOpen(false);
  }, []);

  const handleNavClick = useCallback((to) => {
    closeMenu();
    if (location.pathname === to) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [closeMenu, location.pathname]);

  /* Close subjects dropdown on outside click */
  useEffect(() => {
    function handleClick(e) {
      if (subjectsRef.current && !subjectsRef.current.contains(e.target)) {
        setSubjectsOpen(false);
      }
    }
    if (subjectsOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [subjectsOpen]);

  /* Close menus on history navigation */
  useEffect(() => {
    function handlePopState() {
      setMenuOpen(false);
      setSubjectsOpen(false);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const currentPath = location.pathname;

  return (
    <>
      <header className="navbar">
        <div className="navbar__inner container">
          {/* Brand */}
          <Link to="/" className="navbar__brand" onClick={() => handleNavClick('/')}>
            <BookOpen size={20} strokeWidth={2.2} className="navbar__brand-icon" />
            <span>LearnWell</span>
          </Link>

          {/* Centre nav links: Home, Subjects (dropdown), Practice, Formula Lab, History, Notes */}
          <nav className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
            {/* 1. Home */}
            <Link
              to="/"
              className={`navbar__link ${currentPath === '/' ? 'navbar__link--active' : ''}`}
              onClick={() => handleNavClick('/')}
            >
              Home
            </Link>

            {/* 2. Subjects dropdown */}
            <div className="navbar__dropdown" ref={subjectsRef}>
              <button
                type="button"
                className={`navbar__link navbar__link--dropdown ${subjectsOpen ? 'navbar__link--active' : ''}`}
                onClick={() => setSubjectsOpen((p) => !p)}
                aria-expanded={subjectsOpen}
                aria-haspopup="true"
              >
                Subjects
                <ChevronDown
                  size={14}
                  className={`navbar__chevron ${subjectsOpen ? 'navbar__chevron--open' : ''}`}
                />
              </button>

              {subjectsOpen && (
                <div className="navbar__dropdown-panel" role="menu">
                  <div className="navbar__subjects-grid">
                    {SUBJECTS.map(({ id, label, icon: Icon, active }) => {
                      const itemInner = (
                        <>
                          <div className="navbar__subject-row">
                            <Icon size={14} strokeWidth={2} className="navbar__subject-icon" />
                            <span className="navbar__subject-name">{label}</span>
                          </div>
                          <span className={`navbar__subject-status ${active ? 'navbar__subject-status--active' : ''}`}>
                            {active ? 'Active' : 'Coming Soon'}
                          </span>
                        </>
                      );

                      return active ? (
                        <Link
                          key={id}
                          to="/subjects/mathematics"
                          className="navbar__subject-card navbar__subject-card--active"
                          onClick={() => {
                            setSubjectsOpen(false);
                            handleNavClick('/subjects/mathematics');
                          }}
                        >
                          {itemInner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          key={id}
                          className="navbar__subject-card navbar__subject-card--locked"
                          disabled
                        >
                          {itemInner}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Practice */}
            <Link
              to="/practice"
              className={`navbar__link ${currentPath === '/practice' ? 'navbar__link--active' : ''}`}
              onClick={() => handleNavClick('/practice')}
            >
              Practice
            </Link>

            {/* 4. Formula Lab */}
            <Link
              to="/formula-lab"
              className={`navbar__link ${currentPath === '/formula-lab' ? 'navbar__link--active' : ''}`}
              onClick={() => handleNavClick('/formula-lab')}
            >
              Formula Lab
            </Link>

            {/* 5. History */}
            <Link
              to="/history"
              className={`navbar__link ${currentPath === '/history' ? 'navbar__link--active' : ''}`}
              onClick={() => handleNavClick('/history')}
            >
              History
            </Link>

            {/* 6. Notes */}
            <Link
              to="/notes"
              className={`navbar__link ${currentPath === '/notes' ? 'navbar__link--active' : ''}`}
              onClick={() => handleNavClick('/notes')}
            >
              Notes
            </Link>
          </nav>

          {/* Right actions: Search, Theme Toggle, Get Started */}
          <div className="navbar__actions">
            <button
              type="button"
              className="navbar__icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
            >
              <Search size={17} strokeWidth={2} />
            </button>

            <button
              type="button"
              className="navbar__icon-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
            </button>

            <Link to="/" className="navbar__get-started" onClick={() => handleNavClick('/')}>
              Get Started
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="navbar__hamburger"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Search overlay */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
