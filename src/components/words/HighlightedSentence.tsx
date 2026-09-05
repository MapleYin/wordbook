export const highlightClass = 'text-ink-700 font-semibold underline decoration-2 decoration-ink-500 underline-offset-4';

interface HighlightedSentenceProps {
  sentence: string;
  start: number;
  end: number;
  hidden?: boolean;
  onReveal?: () => void;
}

export function HighlightedSentence({ sentence, start, end, hidden, onReveal }: HighlightedSentenceProps) {
  const before = sentence.slice(0, start);
  const marked = sentence.slice(start, end);
  const after = sentence.slice(end);

  return (
    <p className="font-serif text-lg leading-relaxed text-ink">
      {before}
      {hidden ? (
        <button
          type="button"
          onClick={onReveal}
          className="mx-0.5 rounded border border-dashed border-ink-500/50 px-2 text-transparent"
          aria-label="Reveal word"
        >
          {marked.replace(/[^\s]/g, '▁')}
        </button>
      ) : (
        <mark className={`bg-transparent ${highlightClass}`}>{marked}</mark>
      )}
      {after}
    </p>
  );
}
