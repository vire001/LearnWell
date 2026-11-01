/**
 * MathView.jsx — Lightweight KaTeX math renderer component.
 *
 * Renders LaTeX/math expressions cleanly, falling back to styled plain text
 * if the expression is non-LaTeX or contains unparseable formatting.
 */

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function MathView({ math, block = false, className = '' }) {
  const renderedHtml = useMemo(() => {
    if (!math || typeof math !== 'string') return null;
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
      });
    } catch {
      return null;
    }
  }, [math, block]);

  if (!math) return null;

  if (renderedHtml) {
    return (
      <span
        className={`math-view ${block ? 'math-view--block' : 'math-view--inline'} ${className}`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    );
  }

  return (
    <code className={`math-view math-view--fallback ${className}`}>
      {math}
    </code>
  );
}
