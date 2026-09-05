import { HighlightedSentence } from '@/components/words/HighlightedSentence';
import type { WordEntryWithSentence } from '@/lib/words/types';

interface ReviewCardProps {
  entry: WordEntryWithSentence;
  revealed: boolean;
  onReveal: () => void;
}

export function ReviewCard({ entry, revealed, onReveal }: ReviewCardProps) {
  return (
    <div className="flex min-h-64 flex-col justify-center gap-4 rounded-lg border border-ink/10 bg-white/50 p-8 text-center">
      <HighlightedSentence
        sentence={entry.sentence.text}
        start={entry.highlight_start}
        end={entry.highlight_end}
        hidden={!revealed}
        onReveal={onReveal}
      />

      {revealed ? (
        <div className="flex flex-col gap-1 font-sans text-sm text-ink/80">
          <p className="font-serif text-xl font-semibold text-ink">{entry.word}</p>
          {entry.part_of_speech && <p className="text-ink/50">{entry.part_of_speech}</p>}
          {entry.definition && <p>{entry.definition}</p>}
          {entry.explanation && <p className="text-ink/70">{entry.explanation}</p>}
        </div>
      ) : (
        <p className="font-sans text-xs text-ink/40">Tap the blank to reveal</p>
      )}
    </div>
  );
}
