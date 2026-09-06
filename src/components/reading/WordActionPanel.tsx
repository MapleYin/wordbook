'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { unstable_rethrow } from 'next/navigation';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { addWordsFromSentence, lookupWordEntry } from '@/lib/actions/words';
import { getYoudaoAudioUrl } from '@/lib/dictionary/youdaoAudio';
import { Button } from '@/components/ui/button';
import type { SourceSelection } from '@/components/words/SourcePicker';
import type { SavedWordEntry } from '@/lib/reading/types';
import type { ExplanationLanguage, WordSelection } from '@/lib/words/types';

interface WordActionPanelProps {
  sentenceKey: string;
  sentenceText: string;
  selection: WordSelection;
  language: ExplanationLanguage;
  sourceSelection: SourceSelection;
  onClose: () => void;
  onSaved: (entry: SavedWordEntry) => void;
}

interface LookupData {
  phonetic: string;
  part_of_speech: string;
  meaning: string;
  sentenceTranslation: string;
}

const POPUP_WIDTH = 320;
const POPUP_MARGIN = 8;

function playPronunciation(text: string) {
  if (!text.trim()) return;
  new Audio(getYoudaoAudioUrl(text)).play().catch(() => {
    toast.error('Could not play the pronunciation');
  });
}

export function WordActionPanel({
  sentenceKey,
  sentenceText,
  selection,
  language,
  sourceSelection,
  onClose,
  onSaved,
}: WordActionPanelProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [data, setData] = useState<LookupData | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Anchor the floating popup to the clicked token's current position.
  useLayoutEffect(() => {
    function updatePosition() {
      const anchor = document.querySelector<HTMLElement>(
        `[data-sentence-key="${CSS.escape(sentenceKey)}"] [data-token-start="${selection.start}"]`,
      );
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const left = Math.min(Math.max(rect.left, POPUP_MARGIN), window.innerWidth - POPUP_WIDTH - POPUP_MARGIN);
      setPosition({ top: rect.bottom + 6, left });
    }
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [sentenceKey, selection.start]);

  // Close on an outside click or Escape.
  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStatus('loading');
      try {
        const result = await lookupWordEntry({ word: selection.text, sentence: sentenceText, language });
        if (cancelled) return;
        if (result.ok) {
          setData({
            phonetic: result.data.phonetic,
            part_of_speech: result.data.part_of_speech,
            meaning: result.data.meaning,
            sentenceTranslation: result.data.sentenceTranslation,
          });
          setStatus('loaded');
        } else {
          setError(result.error);
          setStatus('error');
        }
      } catch (err) {
        if (cancelled) return;
        unstable_rethrow(err);
        setError(err instanceof Error ? err.message : `Could not explain "${selection.text}"`);
        setStatus('error');
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // Re-fetch when the selected span changes, or retryCount is bumped by the Retry button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.start, selection.end, selection.text, retryCount]);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const result = await addWordsFromSentence({
        sentenceText,
        sourceId: sourceSelection.sourceId,
        newSourceTitle: sourceSelection.newSourceTitle,
        newSourceType: sourceSelection.newSourceType,
        language,
        translation: data.sentenceTranslation,
        drafts: [
          {
            start: selection.start,
            end: selection.end,
            text: selection.text,
            phonetic: data.phonetic,
            part_of_speech: data.part_of_speech,
            meaning: data.meaning,
          },
        ],
      });
      if (result.skippedWords.length > 0) {
        toast.success(`Already in your collection: ${result.skippedWords.join(', ')}`);
      } else {
        toast.success('Added to your collection');
      }
      onSaved({
        id: `${sentenceKey}:${selection.start}-${selection.end}`,
        sentenceKey,
        start: selection.start,
        end: selection.end,
        text: selection.text,
        phonetic: data.phonetic,
        partOfSpeech: data.part_of_speech,
        meaning: data.meaning,
      });
      onClose();
    } catch (err) {
      unstable_rethrow(err);
      toast.error(err instanceof Error ? err.message : 'Could not save the word');
    } finally {
      setSaving(false);
    }
  }

  if (!position) return null;

  return createPortal(
    <div
      ref={popupRef}
      style={{ position: 'fixed', top: position.top, left: position.left, width: POPUP_WIDTH }}
      className="z-50 rounded-md border border-border bg-card p-3 font-sans text-sm shadow-lg"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="float-right text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      {status === 'loading' && <p className="text-muted-foreground">Translating…</p>}

      {status === 'error' && (
        <div className="space-y-2">
          <p className="text-destructive">{error}</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => setRetryCount((n) => n + 1)}>
            Retry
          </Button>
        </div>
      )}

      {status === 'loaded' && data && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pr-5">
            <span className="font-serif text-lg text-foreground">{selection.text}</span>
            {data.phonetic && (
              <button
                type="button"
                onClick={() => playPronunciation(selection.text)}
                aria-label={`Hear "${selection.text}" pronounced`}
                className="cursor-pointer text-sm text-muted-foreground underline decoration-dotted underline-offset-2 transition-transform hover:text-foreground active:scale-95 active:text-accent-foreground"
              >
                {data.phonetic}
              </button>
            )}
            {data.part_of_speech && (
              <span className="font-serif text-sm italic text-muted-foreground">{data.part_of_speech}</span>
            )}
            {data.meaning && <span className="text-foreground">{data.meaning}</span>}
          </div>
          <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Add to collection'}
          </Button>
        </div>
      )}
    </div>,
    document.body,
  );
}
