import React, { useMemo } from 'react';
import katex from 'katex';

interface MathViewProps {
  content: string;
  className?: string;
  as?: 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3';
  displayMode?: boolean;
}

export const MathView: React.FC<MathViewProps> = ({
  content,
  className = '',
  as: Component = 'span',
  displayMode = false,
}) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // If whole string is display math without delimiters or displayMode requested
    if (displayMode && !content.includes('$')) {
      try {
        return katex.renderToString(content, {
          displayMode: true,
          throwOnError: false,
        });
      } catch {
        return content;
      }
    }

    // Process mixed markdown/text with $ ... $ or $$ ... $$
    const parts: string[] = [];
    let lastIndex = 0;
    // Regex for $$...$$ or $...$
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      // Add plain text before match
      if (match.index > lastIndex) {
        parts.push(escapeHtml(content.substring(lastIndex, match.index)));
      }

      const raw = match[0];
      const isDisplay = raw.startsWith('$$');
      const mathContent = isDisplay ? raw.slice(2, -2) : raw.slice(1, -1);

      try {
        const mathHtml = katex.renderToString(mathContent, {
          displayMode: isDisplay,
          throwOnError: false,
        });
        parts.push(mathHtml);
      } catch {
        parts.push(escapeHtml(raw));
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(escapeHtml(content.substring(lastIndex)));
    }

    return parts.join('');
  }, [content, displayMode]);

  return (
    <Component
      className={className}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
