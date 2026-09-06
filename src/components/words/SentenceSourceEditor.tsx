'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { toast } from 'sonner';
import { updateSentenceSource } from '@/lib/actions/words';
import { SourcePicker, type SourceSelection } from '@/components/words/SourcePicker';
import { Button } from '@/components/ui/button';
import type { SentenceWithSource, Source } from '@/lib/words/types';

interface SentenceSourceEditorProps {
  sentence: SentenceWithSource;
  sources: Source[];
}

const emptySelection = (sourceId: string | null): SourceSelection => ({
  sourceId,
  newSourceTitle: null,
  newSourceType: 'other',
});

/** Lets the source attributed to a sentence (and every word marked in it) be changed after saving. */
export function SentenceSourceEditor({ sentence, sources }: SentenceSourceEditorProps) {
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<SourceSelection>(emptySelection(sentence.source_id));
  const [isPending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    function handleOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setEditing(false);
        setSelection(emptySelection(sentence.source_id));
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setEditing(false);
        setSelection(emptySelection(sentence.source_id));
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [editing, sentence.source_id]);

  function handleSave() {
    startTransition(async () => {
      try {
        await updateSentenceSource(sentence.id, selection);
        setEditing(false);
      } catch (error) {
        unstable_rethrow(error);
        toast.error(error instanceof Error ? error.message : 'Could not update source');
      }
    });
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          setSelection(emptySelection(sentence.source_id));
          setEditing(true);
        }}
        className="text-xs text-muted-foreground underline decoration-dotted hover:text-foreground"
      >
        {sentence.source ? `from ${sentence.source.title}` : 'Add source'}
      </button>

      {editing && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full z-10 mt-2 w-64 rounded-md border border-border bg-card p-3 shadow-md"
        >
          <SourcePicker sources={sources} value={selection} onChange={setSelection} />
          <div className="mt-2.5 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
