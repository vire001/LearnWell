/**
 * MathText.jsx — KaTeX Mixed Text and Mathematical Expression Renderer.
 *
 * Implements Section 9.1 & Sub-Phase 4.2 of LearnWell M3 Phase 4 Architecture:
 * - Parses sentences containing embedded LaTeX ($...$, $$...$$, \(...\), \[...\]).
 * - Renders inline mathematical expressions seamlessly within natural language sentences.
 * - Supports block/display equations with clean horizontal scrolling if wide.
 * - Handles raw LaTeX without delimiters when appropriate.
 * - Gracefully handles malformed or invalid LaTeX without throwing uncaught exceptions.
 * - Fully accessible and responsive across dark and light themes.
 */

import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './MathText.css';

/**
 * Pattern matching math delimiters in order of specificity:
 * 1. $$ ... $$ (display mode)
 * 2. \[ ... \] (display mode)
 * 3. $ ... $   (inline mode, non-greedy, allows escaped \$)
 * 4. \( ... \) (inline mode)
 */
const MATH_TOKEN_PATTERN =
  '(\\$\\$[\\s\\S]*?\\$\\$|\\\\\\[[\\s\\S]*?\\\\\\]|\\$(?:\\\\\\$|[^$])+?\\$|\\\\\\([\\s\\S]*?\\\\\\))';

/**
 * Safely renders a LaTeX string to HTML via KaTeX.
 * Returns null if rendering fails, avoiding any crash.
 */
function safeRenderKatex(latex, displayMode = false) {
  if (!latex || typeof latex !== 'string') return null;
  try {
    return katex.renderToString(latex.trim(), {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
    });
  } catch (err) {
    console.warn('KaTeX rendering error caught safely:', err);
    return null;
  }
}

export default function MathText({ text, children, block = false, className = '' }) {
  const content = text ?? (typeof children === 'string' ? children : '');

  const parsedTokens = useMemo(() => {
    if (!content || typeof content !== 'string') {
      return [];
    }

    const tokenRegex = new RegExp(MATH_TOKEN_PATTERN, 'g');
    const matches = content.match(tokenRegex);

    if (!matches) {
      // If no delimiters found, check if it looks like raw LaTeX (e.g. starts with \ or contains LaTeX command)
      const hasLatexCommand = /\\[a-zA-Z]+/.test(content);
      if (hasLatexCommand) {
        const rendered = safeRenderKatex(content, block);
        if (rendered) {
          return [{ type: 'math', raw: content, html: rendered, block }];
        }
      }
      // Pure plain text
      return [{ type: 'text', content }];
    }

    // Split content by delimiters into alternating text and math tokens
    const tokens = [];
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      const rawMatch = match[0];

      // Add preceding plain text chunk
      if (matchIndex > lastIndex) {
        tokens.push({
          type: 'text',
          content: content.slice(lastIndex, matchIndex),
        });
      }

      // Determine delimiter type and extract inner LaTeX expression
      let isBlock = block;
      let mathExpression = rawMatch;

      if (rawMatch.startsWith('$$') && rawMatch.endsWith('$$')) {
        mathExpression = rawMatch.slice(2, -2);
        isBlock = true;
      } else if (rawMatch.startsWith('\\[') && rawMatch.endsWith('\\]')) {
        mathExpression = rawMatch.slice(2, -2);
        isBlock = true;
      } else if (rawMatch.startsWith('$') && rawMatch.endsWith('$')) {
        mathExpression = rawMatch.slice(1, -1);
      } else if (rawMatch.startsWith('\\(') && rawMatch.endsWith('\\)')) {
        mathExpression = rawMatch.slice(2, -2);
      }

      const html = safeRenderKatex(mathExpression, isBlock);

      tokens.push({
        type: 'math',
        raw: rawMatch,
        latex: mathExpression,
        html,
        block: isBlock,
      });

      lastIndex = matchIndex + rawMatch.length;
    }

    // Add trailing plain text chunk
    if (lastIndex < content.length) {
      tokens.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }

    return tokens;
  }, [content, block]);

  if (!content) {
    return null;
  }

  const wrapperClass = `math-text ${block ? 'math-text--block' : 'math-text--inline'} ${className}`.trim();

  // If top-level block is requested, render container as a div
  const Container = block ? 'div' : 'span';

  return (
    <Container className={wrapperClass}>
      {parsedTokens.map((token, idx) => {
        if (token.type === 'text') {
          return <React.Fragment key={idx}>{token.content}</React.Fragment>;
        }

        if (token.type === 'math') {
          if (token.html) {
            return (
              <span
                key={idx}
                className={`math-token ${token.block ? 'math-token--block' : 'math-token--inline'}`}
                dangerouslySetInnerHTML={{ __html: token.html }}
              />
            );
          }

          // Fallback if KaTeX failed completely to render
          return (
            <code key={idx} className="math-token math-token--fallback" title="Unrendered math expression">
              {token.raw}
            </code>
          );
        }

        return null;
      })}
    </Container>
  );
}
