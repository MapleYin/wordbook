'use client';

import { useState, useTransition } from 'react';
import { addWordsFromSentence } from '@/lib/actions/words';
import { SentenceWordPicker } from '@/components/words/SentenceWordPicker';
import { SourcePicker, type SourceSelection } from '@/components/words/SourcePicker';
import type { ExplanationLanguage, Source, WordSelection } from '@/lib/words/types';

interface AddWordFormProps {
  sources: Source[];
}

const emptySourceSelection: SourceSelection = { sourceId: null, newSourceTitle: null, newSourceType: 'other' };

export function AddWordForm({ sources }: AddWordFormProps) {
  const [sentenceText, setSentenceText] = useState('');
  const [selections, setSelections] = useState<WordSelection[]>([]);
  const [language, setLanguage] = useState<ExplanationLanguage>('zh');
  const [sourceSelection, setSourceSelection] = useState<SourceSelection>(emptySourceSelection);
  const [aiErrors, setAiErrors] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setAiErrors([]);

    if (!sentenceText.trim()) {
      setFormError('Paste a sentence first.');
      return;
    }
    if (selections.length === 0) {
      setFormError('Click at least one word in the sentence to mark it.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await addWordsFromSentence({
          sentenceText,
          sourceId: sourceSelection.sourceId,
          newSourceTitle: sourceSelection.newSourceTitle,
          newSourceType: sourceSelection.newSourceType,
          language,
          selections,
        });
        if (result.aiErrors.length > 0) setAiErrors(result.aiErrors);
        setSentenceText('');
        setSelections([]);
        setSourceSelection(emptySourceSelection);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-ink/10 bg-paper-muted/60 p-5">
      <label className="flex flex-col gap-1 font-sans text-sm text-ink/70">
        Sentence
        <textarea
          value={sentenceText}
          onChange={(e) => {
            setSentenceText(e.target.value);
            setSelections([]);
          }}
          rows={3}
          placeholder="Paste the sentence you just read…"
          className="rounded-md border border-ink/20 bg-white/60 px-3 py-2 font-serif text-lg text-ink outline-none focus:border-ink"
        />
      </label>

      {sentenceText.trim() && (
        <div className="rounded-md border border-ink/10 bg-white/40 p-3">
          <p className="mb-2 font-sans text-xs text-ink/50">Click one or more words to mark them</p>
          <SentenceWordPicker sentence={sentenceText} selections={selections} onChange={setSelections} />
        </div>
      )}

      <SourcePicker sources={sources} value={sourceSelection} onChange={setSourceSelection} />

      <div className="flex flex-col gap-1 font-sans text-sm text-ink/70">
        <span>Explanation language</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={language === 'zh'} onChange={() => setLanguage('zh')} />
            中文
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={language === 'en'} onChange={() => setLanguage('en')} />
            English
          </label>
        </div>
      </div>

      {formError && <p className="font-sans text-sm text-red-700">{formError}</p>}
      {aiErrors.length > 0 && (
        <div className="rounded-md border border-amber-600/30 bg-amber-50 p-3 font-sans text-sm text-amber-800">
          <p className="font-medium">Saved, but AI explanation failed for:</p>
          <ul className="mt-1 list-disc pl-5">
            {aiErrors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
          <p className="mt-1">You can edit the explanation by hand below.</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-ink px-4 py-2 font-sans text-sm font-medium text-paper transition hover:bg-ink-700 disabled:opacity-60"
      >
        {isPending ? 'Saving…' : `Save ${selections.length > 1 ? `${selections.length} words` : 'word'}`}
      </button>
    </form>
  );
}
