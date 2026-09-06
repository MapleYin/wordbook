'use client';

import { useState } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { toast } from 'sonner';
import { addWordsFromSentence, lookupWordEntry, translateSentenceForForm } from '@/lib/actions/words';
import { normalizeSentenceWhitespace } from '@/lib/words/normalizeSentence';
import { SentenceWordPicker } from '@/components/words/SentenceWordPicker';
import { SourcePicker, type SourceSelection } from '@/components/words/SourcePicker';
import { WordDraftCard, emptyWordDraft, type WordDraft } from '@/components/words/WordDraftCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ExplanationLanguage, Source, WordSelection } from '@/lib/words/types';

interface AddWordFormProps {
  sources: Source[];
}

const emptySourceSelection: SourceSelection = { sourceId: null, newSourceTitle: null, newSourceType: 'other' };

function keyOf(s: { start: number; end: number }) {
  return `${s.start}-${s.end}`;
}

export function AddWordForm({ sources }: AddWordFormProps) {
  const [sentenceText, setSentenceText] = useState('');
  const [selections, setSelections] = useState<WordSelection[]>([]);
  const [drafts, setDrafts] = useState<Record<string, WordDraft>>({});
  const [language, setLanguage] = useState<ExplanationLanguage>('zh');
  const [translation, setTranslation] = useState('');
  const [translationLoading, setTranslationLoading] = useState(false);
  const [sourceSelection, setSourceSelection] = useState<SourceSelection>(emptySourceSelection);
  const [explaining, setExplaining] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleSelectionsChange(next: WordSelection[]) {
    setSelections(next);
    setDrafts((prev) => {
      const nextDrafts: Record<string, WordDraft> = {};
      for (const s of next) {
        const key = keyOf(s);
        nextDrafts[key] = prev[key] ?? { ...emptyWordDraft };
      }
      return nextDrafts;
    });
  }

  function handleSentencePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData('text');
    if (!/\r\n|\r|\n/.test(pasted)) return;
    e.preventDefault();

    const textarea = e.currentTarget;
    const cleaned = normalizeSentenceWhitespace(pasted);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = sentenceText.slice(0, start) + cleaned + sentenceText.slice(end);

    setSentenceText(nextValue);
    handleSelectionsChange([]);
    setTranslation('');

    const cursor = start + cleaned.length;
    requestAnimationFrame(() => textarea.setSelectionRange(cursor, cursor));
  }

  function updateDraft(key: string, patch: Partial<WordDraft>) {
    setDrafts((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], ...patch } } : prev));
  }

  function removeSelection(key: string) {
    setSelections((prev) => prev.filter((s) => keyOf(s) !== key));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function ensureTranslation() {
    if (translation.trim() || translationLoading) return;
    setTranslationLoading(true);
    const result = await translateSentenceForForm(sentenceText, language);
    setTranslationLoading(false);
    if (result.ok) setTranslation(result.translation);
    else toast.error(`Sentence translation: ${result.error}`);
  }

  async function handleExplain() {
    if (selections.length === 0) {
      toast.error('Mark at least one word or phrase in the sentence first.');
      return;
    }
    setExplaining(true);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of selections) {
        const key = keyOf(s);
        next[key] = { ...(next[key] ?? emptyWordDraft), pending: true };
      }
      return next;
    });

    let gotTranslation = false;
    for (const s of selections) {
      const key = keyOf(s);
      try {
        const result = await lookupWordEntry({ word: s.text, sentence: sentenceText, language });
        if (result.ok) {
          updateDraft(key, {
            phonetic: result.data.phonetic,
            part_of_speech: result.data.part_of_speech,
            meaning: result.data.meaning,
            pending: false,
          });
          if (!gotTranslation && !translation.trim()) {
            setTranslation(result.data.sentenceTranslation);
            gotTranslation = true;
          }
        } else {
          updateDraft(key, { pending: false });
          toast.error(`${s.text}: ${result.error}`);
        }
      } catch (error) {
        unstable_rethrow(error);
        updateDraft(key, { pending: false });
        toast.error(error instanceof Error ? `${s.text}: ${error.message}` : `Could not explain "${s.text}"`);
      }
    }

    if (!gotTranslation) await ensureTranslation();
    setExplaining(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!sentenceText.trim()) {
      toast.error('Paste a sentence first.');
      return;
    }
    if (selections.length === 0) {
      toast.error('Mark at least one word or phrase in the sentence first.');
      return;
    }

    setSaving(true);
    try {
      const result = await addWordsFromSentence({
        sentenceText,
        sourceId: sourceSelection.sourceId,
        newSourceTitle: sourceSelection.newSourceTitle,
        newSourceType: sourceSelection.newSourceType,
        language,
        translation,
        drafts: selections.map((s) => {
          const d = drafts[keyOf(s)] ?? emptyWordDraft;
          return {
            start: s.start,
            end: s.end,
            text: s.text,
            phonetic: d.phonetic,
            part_of_speech: d.part_of_speech,
            meaning: d.meaning,
          };
        }),
      });
      const addedCount = result.wordEntries.length;
      const addedMessage = addedCount > 1 ? `${addedCount} entries added` : 'Added to your collection';
      if (result.skippedWords.length > 0) {
        toast.success(`${addedMessage} (already had: ${result.skippedWords.join(', ')})`);
      } else {
        toast.success(addedMessage);
      }
      setSentenceText('');
      setSelections([]);
      setDrafts({});
      setTranslation('');
      // Keep the source selected — the next sentence is often from the same book/article.
      setSourceSelection({ sourceId: result.sentence.source_id, newSourceTitle: null, newSourceType: 'other' });
    } catch (error) {
      unstable_rethrow(error);
      toast.error(error instanceof Error ? error.message : 'Could not save the words');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-serif text-xl text-foreground">Add words</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste the sentence you read, then tap a new word — or drag across a few words to mark a phrase.
      </p>

      <Textarea
        value={sentenceText}
        onChange={(e) => {
          setSentenceText(e.target.value);
          handleSelectionsChange([]);
          setTranslation('');
        }}
        onPaste={handleSentencePaste}
        rows={3}
        placeholder="Paste a sentence from the article or novel…"
        className="mt-4 font-serif text-base leading-relaxed"
      />

      {sentenceText.trim() !== '' && (
        <div className="mt-4 rounded-md bg-secondary/60 p-4">
          <SentenceWordPicker sentence={sentenceText} selections={selections} onChange={handleSelectionsChange} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Translate to</span>
          <div className="flex overflow-hidden rounded-md border border-border">
            {(['zh', 'en'] as ExplanationLanguage[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                className={
                  language === code
                    ? 'bg-primary px-3 py-1 text-primary-foreground'
                    : 'bg-card px-3 py-1 text-muted-foreground hover:bg-secondary'
                }
              >
                {code === 'zh' ? '中文' : 'English'}
              </button>
            ))}
          </div>
        </div>
        <Button type="button" variant="secondary" disabled={selections.length === 0 || explaining} onClick={handleExplain}>
          {explaining
            ? 'Thinking…'
            : selections.length > 1
              ? `Explain ${selections.length} selections`
              : 'Explain this'}
        </Button>
        {selections.length > 0 && (
          <span className="text-sm text-muted-foreground">
            Selected: {selections.map((s) => `“${s.text}”`).join(', ')}
          </span>
        )}
      </div>

      {selections.length > 0 && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          {selections.map((s) => {
            const key = keyOf(s);
            const draft = drafts[key] ?? emptyWordDraft;
            return (
              <WordDraftCard
                key={key}
                id={key}
                word={s.text}
                draft={draft}
                onChange={(patch) => updateDraft(key, patch)}
                onRemove={() => removeSelection(key)}
              />
            );
          })}

          <div className="space-y-1.5">
            <Label htmlFor="sentence-translation">Sentence translation</Label>
            <Textarea
              id="sentence-translation"
              rows={2}
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder={
                translationLoading ? 'Translating…' : 'Auto-filled when you explain a word, or type your own…'
              }
            />
          </div>
        </div>
      )}

      <div className="mt-5">
        <SourcePicker sources={sources} value={sourceSelection} onChange={setSourceSelection} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={selections.length === 0 || saving || explaining}>
          {saving ? 'Saving…' : selections.length > 1 ? `Save ${selections.length} selections` : 'Save'}
        </Button>
      </div>
    </form>
  );
}
