/**
 * useTheme.js — Hook for consuming ThemeContext.
 *
 * Separated to satisfy Fast Refresh rules (components-only export in JSX).
 */

import { useContext } from 'react';
import { ThemeContext } from './ThemeContextInstance';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
