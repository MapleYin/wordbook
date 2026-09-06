'use client';

import { Fragment, useMemo, useState } from 'react';
import { splitArticleIntoParagraphs } from '@/lib/reading/splitSentences';
import { SentenceWordPicker } from '@/components/words/SentenceWordPicker';
import { WordActionPanel } from '@/components/reading/WordActionPanel';
import type { SourceSelection } from '@/components/words/SourcePicker';
import type { SavedWordEntry } from '@/lib/reading/types';
import type { ExplanationLanguage, WordSelection } from '@/lib/words/types';

interface ArticleReaderProps {
  content: string;
  sourceSelection: SourceSelection;
  language: ExplanationLanguage;
  savedEntries: SavedWordEntry[];
  onSaved: (entry: SavedWordEntry) => void;
}

export function ArticleReader({ content, sourceSelection, language, savedEntries, onSaved }: ArticleReaderProps) {
  const paragraphs = useMemo(() => splitArticleIntoParagraphs(content), [content]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeSelection, setActiveSelection] = useState<WordSelection | null>(null);

  const lockedRangesBySentence = useMemo(() => {
    const map = new Map<string, WordSelection[]>();
    for (const entry of savedEntries) {
      const list = map.get(entry.sentenceKey) ?? [];
      list.push({ start: entry.start, end: entry.end, text: entry.text });
      map.set(entry.sentenceKey, list);
    }
    return map;
  }, [savedEntries]);

  function closeActive() {
    setActiveKey(null);
    setActiveSelection(null);
  }

  function handleSentenceChange(key: string, next: WordSelection[]) {
    if (next.length === 0) {
      if (activeKey === key) closeActive();
      return;
    }
    setActiveKey(key);
    setActiveSelection(next[next.length - 1]);
  }

  if (paragraphs.length === 0) {
    return <p className="text-muted-foreground">Nothing to read yet.</p>;
  }

  return (
    <div className="space-y-4">
      {paragraphs.map((sentences, paraIdx) => (
        <div key={paraIdx}>
          {sentences.map((sentenceText, sentIdx) => {
            const key = `${paraIdx}-${sentIdx}`;
            const isActive = activeKey === key && activeSelection !== null;
            return (
              <Fragment key={key}>
                <SentenceWordPicker
                  as="span"
                  sentenceKey={key}
                  sentence={sentenceText}
                  selections={isActive ? [activeSelection] : []}
                  onChange={(next) => handleSentenceChange(key, next)}
                  lockedRanges={lockedRangesBySentence.get(key)}
                />{' '}
                {isActive && (
                  <WordActionPanel
                    sentenceKey={key}
                    sentenceText={sentenceText}
                    selection={activeSelection}
                    language={language}
                    sourceSelection={sourceSelection}
                    onClose={closeActive}
                    onSaved={onSaved}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
}
