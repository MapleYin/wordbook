'use client';

import { useState } from 'react';
import { ReviewCard } from '@/components/review/ReviewCard';
import type { WordEntryWithSentence } from '@/lib/words/types';

interface ReviewDeckProps {
  words: WordEntryWithSentence[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function ReviewDeck({ words }: ReviewDeckProps) {
  const [deck, setDeck] = useState(words);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (deck.length === 0) {
    return <p className="font-sans text-sm text-ink/60">No words to review yet — go add some first.</p>;
  }

  function go(nextIndex: number) {
    const wrapped = (nextIndex + deck.length) % deck.length;
    setIndex(wrapped);
    setRevealed(false);
  }

  function handleShuffle() {
    setDeck(shuffle(deck));
    setIndex(0);
    setRevealed(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center font-sans text-xs text-ink/50">
        {index + 1} / {deck.length}
      </p>

      <ReviewCard entry={deck[index]} revealed={revealed} onReveal={() => setRevealed(true)} />

      <div className="flex justify-center gap-3 font-sans text-sm">
        <button onClick={() => go(index - 1)} className="rounded-md px-3 py-1.5 text-ink/70 hover:text-ink">
          ← Prev
        </button>
        <button onClick={handleShuffle} className="rounded-md px-3 py-1.5 text-ink/70 hover:text-ink">
          Shuffle
        </button>
        <button onClick={() => go(index + 1)} className="rounded-md px-3 py-1.5 text-ink/70 hover:text-ink">
          Next →
        </button>
      </div>
    </div>
  );
}
