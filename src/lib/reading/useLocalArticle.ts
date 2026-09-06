'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { SourceSelection } from '@/components/words/SourcePicker';

const STORAGE_KEY = 'wordbook.reading.article.v1';

export interface LocalArticle {
  content: string;
  sourceSelection: SourceSelection;
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

/**
 * A single disposable "current article" kept in the browser only — never sent
 * to the server. Pasting a new article replaces it; there's no history.
 */
export function useLocalArticle() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const article = useMemo<LocalArticle | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LocalArticle;
    } catch {
      return null;
    }
  }, [raw]);

  const save = useCallback((next: LocalArticle | null) => {
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable (private browsing, disabled) — the read below
      // will simply keep returning null, so the page falls back gracefully.
    }
    // Native "storage" events only fire in other tabs; dispatch one locally
    // so this tab's useSyncExternalStore re-reads the value we just wrote.
    window.dispatchEvent(new StorageEvent('storage'));
  }, []);

  return { article, save };
}
