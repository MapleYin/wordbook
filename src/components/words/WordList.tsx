'use client';

import { useMemo, useState } from 'react';
import { WordCard } from '@/components/words/WordCard';
import { SearchAndFilterBar } from '@/components/words/SearchAndFilterBar';
import type { DictionaryEntry, ExplanationLanguage, Source, WordEntryWithSentence } from '@/lib/words/types';

interface WordListProps {
  words: WordEntryWithSentence[];
  sources: Source[];
  dictionaryByHeadword: Record<string, Pick<DictionaryEntry, 'phonetic' | 'audio_url'>>;
}

export function WordList({ words, sources, dictionaryByHeadword }: WordListProps) {
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<ExplanationLanguage | 'all'>('all');
  const [sourceId, setSourceId] = useState<string | 'all'>('all');

  const occurrenceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of words) counts[w.headword] = (counts[w.headword] ?? 0) + 1;
    return counts;
  }, [words]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return words.filter((w) => {
      if (query && !w.word.toLowerCase().includes(query) && !w.headword.includes(query)) return false;
      if (language !== 'all' && w.language !== language) return false;
      if (sourceId !== 'all' && w.sentence.source_id !== sourceId) return false;
      return true;
    });
  }, [words, search, language, sourceId]);

  if (words.length === 0) {
    return <p className="font-sans text-sm text-ink/60">No words yet — add one above to start your collection.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchAndFilterBar
        search={search}
        onSearchChange={setSearch}
        language={language}
        onLanguageChange={setLanguage}
        sourceId={sourceId}
        onSourceIdChange={setSourceId}
        sources={sources}
      />

      {filtered.length === 0 ? (
        <p className="font-sans text-sm text-ink/60">No words match your search/filters.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((entry) => (
            <WordCard
              key={entry.id}
              entry={entry}
              dictionary={dictionaryByHeadword[entry.headword]}
              occurrenceCount={occurrenceCounts[entry.headword] ?? 1}
              onFilterByHeadword={setSearch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
