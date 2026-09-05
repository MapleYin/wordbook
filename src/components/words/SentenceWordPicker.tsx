'use client';

import { tokenizeSentence } from '@/lib/words/offsets';
import type { WordSelection } from '@/lib/words/types';

interface SentenceWordPickerProps {
  sentence: string;
  selections: WordSelection[];
  onChange: (selections: WordSelection[]) => void;
}

export function SentenceWordPicker({ sentence, selections, onChange }: SentenceWordPickerProps) {
  const tokens = tokenizeSentence(sentence);

  function toggle(start: number, end: number, text: string) {
    const exists = selections.some((s) => s.start === start && s.end === end);
    if (exists) {
      onChange(selections.filter((s) => !(s.start === start && s.end === end)));
    } else {
      onChange([...selections, { start, end, text }].sort((a, b) => a.start - b.start));
    }
  }

  return (
    <p className="font-serif text-lg leading-relaxed text-ink">
      {tokens.map((token) => {
        if (!token.isWord) {
          return <span key={token.start}>{token.text}</span>;
        }
        const selected = selections.some((s) => s.start === token.start && s.end === token.end);
        return (
          <button
            key={token.start}
            type="button"
            onClick={() => toggle(token.start, token.end, token.text)}
            className={
              selected
                ? 'rounded bg-ink-500/15 text-ink-700 underline decoration-2 decoration-ink-500 underline-offset-4'
                : 'rounded text-ink hover:bg-ink-500/10'
            }
          >
            {token.text}
          </button>
        );
      })}
    </p>
  );
}
