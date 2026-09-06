import type { EntryType, ExplanationLanguage, Source } from '@/lib/words/types';

interface SearchAndFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  language: ExplanationLanguage | 'all';
  onLanguageChange: (value: ExplanationLanguage | 'all') => void;
  sourceId: string | 'all';
  onSourceIdChange: (value: string | 'all') => void;
  sources: Source[];
  entryType: EntryType | 'all';
  onEntryTypeChange: (value: EntryType | 'all') => void;
}

export function SearchAndFilterBar({
  search,
  onSearchChange,
  language,
  onLanguageChange,
  sourceId,
  onSourceIdChange,
  sources,
  entryType,
  onEntryTypeChange,
}: SearchAndFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 font-sans text-sm">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by word…"
        className="flex-1 rounded-md border border-ink/20 bg-white/60 px-3 py-1.5 text-ink outline-none focus:border-ink"
      />
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value as ExplanationLanguage | 'all')}
        className="rounded-md border border-ink/20 bg-white/60 px-2 py-1.5 text-ink outline-none focus:border-ink"
      >
        <option value="all">All languages</option>
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
      <select
        value={sourceId}
        onChange={(e) => onSourceIdChange(e.target.value)}
        className="rounded-md border border-ink/20 bg-white/60 px-2 py-1.5 text-ink outline-none focus:border-ink"
      >
        <option value="all">All sources</option>
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.title}
          </option>
        ))}
      </select>
      <select
        value={entryType}
        onChange={(e) => onEntryTypeChange(e.target.value as EntryType | 'all')}
        className="rounded-md border border-ink/20 bg-white/60 px-2 py-1.5 text-ink outline-none focus:border-ink"
      >
        <option value="all">All types</option>
        <option value="word">Words</option>
        <option value="phrase">Phrases</option>
      </select>
    </div>
  );
}
