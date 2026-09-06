import type { ReactNode } from 'react';

export const highlightClass = 'rounded-sm bg-accent px-1 text-accent-foreground';

export interface HighlightRange {
  start: number;
  end: number;
  hidden?: boolean;
  onReveal?: () => void;
}

interface HighlightedSentenceProps {
  sentence: string;
  highlights: HighlightRange[];
  className?: string;
}

/** Inline text with one or more marked ranges, each its own rounded highlight chip. Wrap in a block element. */
export function HighlightedSentence({ sentence, highlights, className }: HighlightedSentenceProps) {
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((h, i) => {
    if (h.start > cursor) parts.push(<span key={`text-${i}`}>{sentence.slice(cursor, h.start)}</span>);
    const marked = sentence.slice(h.start, h.end);

    if (h.hidden) {
      parts.push(
        <button
          key={`blank-${i}`}
          type="button"
          onClick={h.onReveal}
          aria-label="Reveal word"
          className="mx-0.5 inline-block min-w-16 rounded-sm border-b-2 border-dashed border-accent-foreground/50 align-baseline text-transparent select-none"
        >
          {'·'.repeat(Math.max(marked.length, 4))}
        </button>,
      );
    } else {
      parts.push(
        <mark key={`mark-${i}`} className={highlightClass}>
          {marked}
        </mark>,
      );
    }

    cursor = Math.max(cursor, h.end);
  });

  if (cursor < sentence.length) parts.push(<span key="text-last">{sentence.slice(cursor)}</span>);

  return <span className={className}>{parts}</span>;
}
