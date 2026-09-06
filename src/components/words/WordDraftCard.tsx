'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SpeakButton } from '@/components/words/SpeakButton';

export interface WordDraft {
  phonetic: string;
  part_of_speech: string;
  meaning: string;
  pending: boolean;
}

export const emptyWordDraft: WordDraft = {
  phonetic: '',
  part_of_speech: '',
  meaning: '',
  pending: false,
};

interface WordDraftCardProps {
  id: string;
  word: string;
  draft: WordDraft;
  onChange: (patch: Partial<WordDraft>) => void;
  onRemove: () => void;
}

export function WordDraftCard({ id, word, draft, onChange, onRemove }: WordDraftCardProps) {
  return (
    <div className="space-y-2 rounded-md border border-border/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-serif text-lg text-foreground">{word}</h3>
        {draft.phonetic && <span className="text-sm text-muted-foreground">{draft.phonetic}</span>}
        <SpeakButton text={word} />
        {draft.pending && <span className="text-xs text-muted-foreground">Thinking…</span>}
        <button type="button" onClick={onRemove} className="ml-auto text-xs text-muted-foreground hover:text-destructive">
          Remove
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`phonetic-${id}`}>Pronunciation</Label>
          <Input
            id={`phonetic-${id}`}
            value={draft.phonetic}
            onChange={(e) => onChange({ phonetic: e.target.value })}
            placeholder="/…/"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`pos-${id}`}>Part of speech</Label>
          <Input
            id={`pos-${id}`}
            value={draft.part_of_speech}
            onChange={(e) => onChange({ part_of_speech: e.target.value })}
            placeholder="noun, verb…"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`meaning-${id}`}>Meaning</Label>
        <Textarea
          id={`meaning-${id}`}
          rows={3}
          value={draft.meaning}
          onChange={(e) => onChange({ meaning: e.target.value })}
          placeholder="What does it mean? Type your own, or click Explain."
        />
      </div>
    </div>
  );
}
