'use client';

import { useMemo, useState } from 'react';
import { WordCard } from '@/components/words/WordCard';
import { SearchAndFilterBar } from '@/components/words/SearchAndFilterBar';
import type { DictionaryEntry, EntryType, ExplanationLanguage, Source, WordEntryWithSentence } from '@/lib/words/types';

interface WordListProps {
  words: WordEntryWithSentence[];
  sources: Source[];
  dictionaryByHeadword: Record<string, Pick<DictionaryEntry, 'phonetic'>>;
}

const NO_SOURCE = 'none';
// Multi-column (masonry) layout instead of CSS grid: a card's example-sentence toggle
// changes its height, and grid rows stretch every cell in that row to match the tallest
// one — columns lets each card sit at its own height with no forced row alignment.
const GRID_CLASS = 'columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4';

export function WordList({ words, sources, dictionaryByHeadword }: WordListProps) {
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState<ExplanationLanguage | 'all'>('all');
  const [sourceId, setSourceId] = useState<string | 'all'>('all');
  const [entryType, setEntryType] = useState<EntryType | 'all'>('all');
  const [groupBy, setGroupBy] = useState<'time' | 'source'>('time');

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
      if (entryType !== 'all' && w.entry_type !== entryType) return false;
      return true;
    });
  }, [words, search, language, sourceId, entryType]);

  // filtered is already time-sorted (the incoming query orders by created_at desc),
  // so bucketing by source here preserves each bucket's recency order for free.
  const sourceGroups = useMemo(() => {
    if (groupBy !== 'source') return null;
    const order: string[] = [];
    const groups = new Map<string, WordEntryWithSentence[]>();
    for (const entry of filtered) {
      const key = entry.sentence.source_id ?? NO_SOURCE;
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key)!.push(entry);
    }
    return order.map((key) => ({
      title: sources.find((s) => s.id === key)?.title ?? 'No source',
      entries: groups.get(key)!,
    }));
  }, [filtered, groupBy, sources]);

  if (words.length === 0) {
    return <p className="font-sans text-sm text-ink/60">No words yet — add one above to start your collection.</p>;
  }

  function renderCard(entry: WordEntryWithSentence) {
    return (
      <div key={entry.id} className="mb-4 break-inside-avoid">
        <WordCard
          entry={entry}
          dictionary={dictionaryByHeadword[entry.headword]}
          occurrenceCount={occurrenceCounts[entry.headword] ?? 1}
          sources={sources}
          onFilterByHeadword={setSearch}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-64 flex-1">
          <SearchAndFilterBar
            search={search}
            onSearchChange={setSearch}
            language={language}
            onLanguageChange={setLanguage}
            sourceId={sourceId}
            onSourceIdChange={setSourceId}
            sources={sources}
            entryType={entryType}
            onEntryTypeChange={setEntryType}
          />
        </div>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as 'time' | 'source')}
          className="rounded-md border border-ink/20 bg-white/60 px-2 py-1.5 font-sans text-sm text-ink outline-none focus:border-ink"
        >
          <option value="time">Group by time</option>
          <option value="source">Group by source</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="font-sans text-sm text-ink/60">No words match your search/filters.</p>
      ) : groupBy === 'source' ? (
        <div className="flex flex-col gap-6">
          {sourceGroups!.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <h2 className="font-serif text-sm text-ink/70">{group.title}</h2>
              <div className={GRID_CLASS}>{group.entries.map(renderCard)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className={GRID_CLASS}>{filtered.map(renderCard)}</div>
      )}
    </div>
  );
}
