'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { HighlightedSentence } from '@/components/words/HighlightedSentence';
import { SentenceSourceEditor } from '@/components/words/SentenceSourceEditor';
import { WordEntryPanel } from '@/components/words/WordEntryPanel';
import type { DictionaryEntry, Source, WordEntryWithSentence } from '@/lib/words/types';

interface WordCardProps {
  entry: WordEntryWithSentence;
  dictionary?: Pick<DictionaryEntry, 'phonetic'> | null;
  occurrenceCount: number;
  sources: Source[];
  onFilterByHeadword?: (headword: string) => void;
}

/** Grid card showing a word's meaning by default; the example sentence expands on click. */
export function WordCard({ entry, dictionary, occurrenceCount, sources, onFilterByHeadword }: WordCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="group relative flex flex-col rounded-lg border border-border bg-card p-4">
      <WordEntryPanel
        entry={entry}
        dictionary={dictionary}
        occurrenceCount={occurrenceCount}
        onFilterByHeadword={onFilterByHeadword}
      />

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex cursor-pointer items-center gap-1 self-start text-xs text-muted-foreground transition-transform hover:text-foreground active:scale-95"
      >
        <ChevronDown className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        {expanded ? 'Hide example sentence' : 'Show example sentence'}
      </button>

      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          <SentenceSourceEditor sentence={entry.sentence} sources={sources} />
          <p className="mt-1 font-serif text-sm leading-relaxed text-foreground">
            <HighlightedSentence
              sentence={entry.sentence.text}
              highlights={[{ start: entry.highlight_start, end: entry.highlight_end }]}
            />
          </p>
          {entry.sentence.translation && (
            <p className="mt-1.5 text-sm text-muted-foreground">{entry.sentence.translation}</p>
          )}
        </div>
      )}
    </article>
  );
}
