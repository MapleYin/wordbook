'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { deleteWord, updateWordExplanation } from '@/lib/actions/words';
import { getYoudaoAudioUrl } from '@/lib/dictionary/youdaoAudio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { WordEntryWithSentence } from '@/lib/words/types';

interface WordEntryPanelProps {
  entry: WordEntryWithSentence;
  dictionary?: { phonetic: string | null } | null;
  occurrenceCount: number;
  onFilterByHeadword?: (headword: string) => void;
}

function playPronunciation(text: string) {
  if (!text.trim()) return;
  new Audio(getYoudaoAudioUrl(text)).play().catch(() => {
    toast.error('Could not play the pronunciation');
  });
}

/**
 * One marked word's info + edit/delete controls. Rendered inside a WordCard, which must
 * set `relative group` so the actions menu below can position itself over the card corner
 * and reveal on card hover.
 */
export function WordEntryPanel({ entry, dictionary, occurrenceCount, onFilterByHeadword }: WordEntryPanelProps) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [fields, setFields] = useState({
    meaning: [entry.definition, entry.explanation].filter(Boolean).join(' '),
    part_of_speech: entry.part_of_speech,
    phonetic: entry.phonetic,
  });
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  function handleSaveEdit() {
    startTransition(async () => {
      try {
        await updateWordExplanation(entry.id, {
          phonetic: fields.phonetic,
          part_of_speech: fields.part_of_speech,
          explanation: fields.meaning,
          definition: '',
        });
        setEditing(false);
      } catch (error) {
        unstable_rethrow(error);
        toast.error(error instanceof Error ? error.message : 'Could not save');
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteWord(entry.id);
        toast.success('Word removed');
      } catch (error) {
        unstable_rethrow(error);
        setConfirmingDelete(false);
        toast.error(error instanceof Error ? error.message : 'Could not remove');
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={menuRef} className="absolute right-2 top-2">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Word actions"
          className={`rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 ${menuOpen ? 'opacity-100' : ''}`}
        >
          <MoreVertical className="size-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-md border border-border bg-card p-1 shadow-md">
            {confirmingDelete ? (
              <div className="p-2">
                <p className="text-sm text-foreground">Delete &ldquo;{entry.word}&rdquo;?</p>
                <div className="mt-2.5 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
                    {isPending ? 'Removing…' : 'Delete'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                  className="block w-full rounded px-3 py-1.5 text-left text-sm text-foreground hover:bg-secondary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="block w-full rounded px-3 py-1.5 text-left text-sm text-destructive hover:bg-secondary"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pr-8">
        <h3 className="font-serif text-2xl text-foreground">{entry.word}</h3>
        {entry.entry_type !== 'phrase' && (entry.phonetic || dictionary?.phonetic) && (
          <button
            type="button"
            onClick={() => playPronunciation(entry.word)}
            aria-label={`Hear "${entry.word}" pronounced`}
            className="cursor-pointer text-sm text-muted-foreground underline decoration-dotted underline-offset-2 transition-transform hover:text-foreground active:scale-95 active:text-accent-foreground"
          >
            {entry.phonetic || dictionary?.phonetic}
          </button>
        )}
        {entry.part_of_speech && (
          <span className="font-serif text-sm italic text-muted-foreground">{entry.part_of_speech}</span>
        )}
        {occurrenceCount > 1 && (
          <button
            type="button"
            onClick={() => onFilterByHeadword?.(entry.headword)}
            className="ml-auto text-xs text-muted-foreground underline decoration-dotted hover:text-foreground"
          >
            seen in {occurrenceCount} sentences
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`phonetic-${entry.id}`}>Pronunciation</Label>
              <Input
                id={`phonetic-${entry.id}`}
                value={fields.phonetic}
                onChange={(e) => setFields((f) => ({ ...f, phonetic: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`pos-${entry.id}`}>Part of speech</Label>
              <Input
                id={`pos-${entry.id}`}
                value={fields.part_of_speech}
                onChange={(e) => setFields((f) => ({ ...f, part_of_speech: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`meaning-${entry.id}`}>Meaning</Label>
            <Textarea
              id={`meaning-${entry.id}`}
              rows={3}
              value={fields.meaning}
              onChange={(e) => setFields((f) => ({ ...f, meaning: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} disabled={isPending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : entry.definition || entry.explanation ? (
        <p className="border-l-2 border-accent pl-3 text-[15px] leading-relaxed text-foreground">
          {entry.definition}
          {entry.definition && entry.explanation ? ' ' : ''}
          {entry.explanation}
        </p>
      ) : (
        <p className="border-l-2 border-border pl-3 text-[15px] italic text-muted-foreground">
          No explanation yet — edit to add one.
        </p>
      )}
    </div>
  );
}
