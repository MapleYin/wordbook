'use client';

import { useState } from 'react';
import type { Source, SourceType } from '@/lib/words/types';

export interface SourceSelection {
  sourceId: string | null;
  newSourceTitle: string | null;
  newSourceType: SourceType;
}

interface SourcePickerProps {
  sources: Source[];
  value: SourceSelection;
  onChange: (value: SourceSelection) => void;
}

const NEW_SOURCE_VALUE = '__new__';
const NO_SOURCE_VALUE = '__none__';

export function SourcePicker({ sources, value, onChange }: SourcePickerProps) {
  const [showNewSourceFields, setShowNewSourceFields] = useState(false);

  function handleSelectChange(selected: string) {
    if (selected === NEW_SOURCE_VALUE) {
      setShowNewSourceFields(true);
      onChange({ sourceId: null, newSourceTitle: '', newSourceType: 'other' });
      return;
    }
    setShowNewSourceFields(false);
    onChange({
      sourceId: selected === NO_SOURCE_VALUE ? null : selected,
      newSourceTitle: null,
      newSourceType: 'other',
    });
  }

  return (
    <div className="flex flex-col gap-2 font-sans text-sm">
      <label className="font-medium text-foreground">Source (optional)</label>
      <select
        value={showNewSourceFields ? NEW_SOURCE_VALUE : value.sourceId ?? NO_SOURCE_VALUE}
        onChange={(e) => handleSelectChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-card px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value={NO_SOURCE_VALUE}>No source</option>
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.title}
          </option>
        ))}
        <option value={NEW_SOURCE_VALUE}>＋ New source…</option>
      </select>

      {showNewSourceFields && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Book or article title"
            value={value.newSourceTitle ?? ''}
            onChange={(e) => onChange({ ...value, newSourceTitle: e.target.value })}
            className="h-9 flex-1 rounded-md border border-border bg-card px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            value={value.newSourceType}
            onChange={(e) => onChange({ ...value, newSourceType: e.target.value as SourceType })}
            className="h-9 rounded-md border border-border bg-card px-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="book">Book</option>
            <option value="article">Article</option>
            <option value="other">Other</option>
          </select>
        </div>
      )}
    </div>
  );
}
