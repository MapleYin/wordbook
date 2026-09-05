'use client';

import { useState, useTransition } from 'react';
import { deleteWord, regenerateWordExplanation, updateWordExplanation } from '@/lib/actions/words';
import { HighlightedSentence } from '@/components/words/HighlightedSentence';
import type { WordEntryWithSentence } from '@/lib/words/types';

interface WordCardProps {
  entry: WordEntryWithSentence;
  dictionary?: { phonetic: string | null; audio_url: string | null } | null;
  occurrenceCount: number;
  onFilterByHeadword?: (headword: string) => void;
}

export function WordCard({ entry, dictionary, occurrenceCount, onFilterByHeadword }: WordCardProps) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    explanation: entry.explanation,
    part_of_speech: entry.part_of_speech,
    definition: entry.definition,
  });
  const [regenError, setRegenError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function playAudio() {
    if (dictionary?.audio_url) new Audio(dictionary.audio_url).play().catch(() => {});
  }

  function handleSaveEdit() {
    startTransition(async () => {
      await updateWordExplanation(entry.id, fields);
      setEditing(false);
    });
  }

  function handleRegenerate() {
    setRegenError(null);
    startTransition(async () => {
      const result = await regenerateWordExplanation(entry.id);
      if (!result.ok) setRegenError(result.error);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${entry.word}"?`)) return;
    startTransition(async () => {
      await deleteWord(entry.id);
    });
  }

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-white/50 p-5">
      <HighlightedSentence
        sentence={entry.sentence.text}
        start={entry.highlight_start}
        end={entry.highlight_end}
      />

      <div className="flex flex-wrap items-center gap-2 font-sans text-sm text-ink/70">
        <span className="font-serif text-base font-semibold text-ink">{entry.word}</span>
        {dictionary?.phonetic && <span className="text-ink/50">{dictionary.phonetic}</span>}
        {dictionary?.audio_url && (
          <button
            type="button"
            onClick={playAudio}
            aria-label="Play pronunciation"
            className="rounded-full px-1.5 text-ink-500 hover:text-ink-700"
          >
            🔊
          </button>
        )}
        {entry.part_of_speech && <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs">{entry.part_of_speech}</span>}
        {entry.sentence.source && <span className="text-ink/50">from {entry.sentence.source.title}</span>}
        {occurrenceCount > 1 && (
          <button
            type="button"
            onClick={() => onFilterByHeadword?.(entry.headword)}
            className="text-ink-500 underline decoration-dotted hover:text-ink-700"
          >
            seen in {occurrenceCount} sentences
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2 font-sans text-sm">
          <label className="flex flex-col gap-1">
            Part of speech
            <input
              value={fields.part_of_speech}
              onChange={(e) => setFields((f) => ({ ...f, part_of_speech: e.target.value }))}
              className="rounded-md border border-ink/20 bg-white/60 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Definition
            <textarea
              value={fields.definition}
              onChange={(e) => setFields((f) => ({ ...f, definition: e.target.value }))}
              rows={2}
              className="rounded-md border border-ink/20 bg-white/60 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Explanation
            <textarea
              value={fields.explanation}
              onChange={(e) => setFields((f) => ({ ...f, explanation: e.target.value }))}
              rows={2}
              className="rounded-md border border-ink/20 bg-white/60 px-2 py-1"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isPending}
              className="rounded-md bg-ink px-3 py-1.5 text-paper hover:bg-ink-700"
            >
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-md px-3 py-1.5 text-ink/60 hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1 font-sans text-sm text-ink/90">
          {entry.definition && <p><span className="text-ink/50">Definition: </span>{entry.definition}</p>}
          {entry.explanation && <p><span className="text-ink/50">In this sentence: </span>{entry.explanation}</p>}
          {entry.sentence.translation && (
            <p className="text-ink/70">{entry.sentence.translation}</p>
          )}
          {!entry.explanation && !entry.definition && (
            <p className="italic text-ink/50">No explanation yet — edit to add one, or try regenerating.</p>
          )}
        </div>
      )}

      {regenError && <p className="font-sans text-xs text-red-700">{regenError}</p>}

      {!editing && (
        <div className="flex gap-3 font-sans text-xs text-ink/50">
          <button type="button" onClick={() => setEditing(true)} className="hover:text-ink">Edit</button>
          <button type="button" onClick={handleRegenerate} disabled={isPending} className="hover:text-ink">Regenerate</button>
          <button type="button" onClick={handleDelete} disabled={isPending} className="hover:text-red-700">Delete</button>
        </div>
      )}
    </article>
  );
}
