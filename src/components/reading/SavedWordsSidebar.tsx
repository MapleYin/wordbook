'use client';

import { getYoudaoAudioUrl } from '@/lib/dictionary/youdaoAudio';
import type { SavedWordEntry } from '@/lib/reading/types';

interface SavedWordsSidebarProps {
  entries: SavedWordEntry[];
}

function playPronunciation(text: string) {
  if (!text.trim()) return;
  new Audio(getYoudaoAudioUrl(text)).play().catch(() => {});
}

export function SavedWordsSidebar({ entries }: SavedWordsSidebarProps) {
  return (
    <aside className="rounded-lg border border-border bg-card p-4 lg:sticky lg:top-6">
      <h2 className="font-serif text-base text-foreground">Saved from this article</h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Words you collect will show up here.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {[...entries].reverse().map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 border-b border-border/60 pb-2 last:border-0 last:pb-0">
              <span className="font-serif text-foreground">{entry.text}</span>
              {entry.phonetic && (
                <button
                  type="button"
                  onClick={() => playPronunciation(entry.text)}
                  aria-label={`Hear "${entry.text}" pronounced`}
                  className="cursor-pointer text-muted-foreground underline decoration-dotted underline-offset-2 transition-transform hover:text-foreground active:scale-95 active:text-accent-foreground"
                >
                  {entry.phonetic}
                </button>
              )}
              {entry.partOfSpeech && <span className="font-serif italic text-muted-foreground">{entry.partOfSpeech}</span>}
              {entry.meaning && <span className="text-foreground">{entry.meaning}</span>}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
