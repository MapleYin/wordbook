'use client';

import { useRef, useState } from 'react';
import { highlightClass } from '@/components/words/HighlightedSentence';
import { tokenizeSentence, type SentenceToken } from '@/lib/words/offsets';
import type { WordSelection } from '@/lib/words/types';

interface SentenceWordPickerProps {
  sentence: string;
  selections: WordSelection[];
  onChange: (selections: WordSelection[]) => void;
  /** Root element tag — 'span' lets the sentence flow inline within a larger paragraph. Defaults to 'p'. */
  as?: 'p' | 'span';
  /** Ranges rendered as a permanent highlight instead of a clickable token — e.g. already-collected words. */
  lockedRanges?: WordSelection[];
  /** Set as `data-sentence-key` on the root element, so a token can be located in the DOM (e.g. to anchor a popup). */
  sentenceKey?: string;
}

const TOUCH_HOLD_MS = 300;
const TOUCH_MOVE_CANCEL_PX = 8;

export function SentenceWordPicker({
  sentence,
  selections,
  onChange,
  as = 'p',
  lockedRanges = [],
  sentenceKey,
}: SentenceWordPickerProps) {
  const tokens = tokenizeSentence(sentence);
  const [drag, setDrag] = useState<{ anchor: SentenceToken; hover: SentenceToken } | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function isLocked(token: SentenceToken) {
    return lockedRanges.some((r) => token.start >= r.start && token.end <= r.end);
  }

  function toggle(token: SentenceToken) {
    const containing = selections.find((s) => token.start >= s.start && token.end <= s.end);
    if (containing) {
      onChange(selections.filter((s) => s !== containing));
    } else {
      onChange([...selections, { start: token.start, end: token.end, text: token.text }].sort((a, b) => a.start - b.start));
    }
  }

  function tokenAtPoint(x: number, y: number): SentenceToken | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('button[data-token-start]');
    if (!el) return null;
    const start = Number(el.dataset.tokenStart);
    const token = tokens.find((t) => t.start === start) ?? null;
    return token && !isLocked(token) ? token : null;
  }

  function clearTouchTimer() {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    touchStartRef.current = null;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
    const token = tokenAtPoint(e.clientX, e.clientY);
    if (!token) return;
    if (e.pointerType === 'touch') {
      // Require a brief hold before entering drag-select so a normal tap or
      // scroll-swipe starting on a word isn't hijacked.
      touchStartRef.current = { x: e.clientX, y: e.clientY };
      touchTimerRef.current = setTimeout(() => setDrag({ anchor: token, hover: token }), TOUCH_HOLD_MS);
    } else {
      setDrag({ anchor: token, hover: token });
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    if (touchTimerRef.current && touchStartRef.current) {
      const dx = e.clientX - touchStartRef.current.x;
      const dy = e.clientY - touchStartRef.current.y;
      if (Math.hypot(dx, dy) > TOUCH_MOVE_CANCEL_PX) clearTouchTimer();
    }
    if (!drag) return;
    e.preventDefault();
    const token = tokenAtPoint(e.clientX, e.clientY);
    if (token) setDrag((d) => (d ? { ...d, hover: token } : d));
  }

  function finalizeDrag() {
    if (!drag) return;
    const { anchor, hover } = drag;
    setDrag(null);
    if (anchor.start === hover.start) {
      toggle(anchor);
      return;
    }
    const start = Math.min(anchor.start, hover.start);
    const end = Math.max(anchor.end, hover.end);
    const text = sentence.slice(start, end);
    const withoutOverlaps = selections.filter((s) => s.end <= start || s.start >= end);
    onChange([...withoutOverlaps, { start, end, text }].sort((a, b) => a.start - b.start));
  }

  function handlePointerUp() {
    clearTouchTimer();
    finalizeDrag();
  }

  function handlePointerCancel() {
    clearTouchTimer();
    setDrag(null);
  }

  const Tag = as;

  return (
    <Tag
      data-sentence-key={sentenceKey}
      className="touch-none font-serif text-lg leading-relaxed text-foreground"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {tokens.map((token) => {
        if (!token.isWord) {
          return (
            <span key={token.start} className="whitespace-pre-wrap">
              {token.text}
            </span>
          );
        }
        if (isLocked(token)) {
          return (
            <mark key={token.start} className={highlightClass}>
              {token.text}
            </mark>
          );
        }
        const selected = selections.some((s) => token.start >= s.start && token.end <= s.end);
        const previewing =
          !!drag &&
          token.start >= Math.min(drag.anchor.start, drag.hover.start) &&
          token.end <= Math.max(drag.anchor.end, drag.hover.end);
        return (
          <button
            key={token.start}
            type="button"
            data-token-start={token.start}
            className={
              selected
                ? highlightClass
                : previewing
                  ? 'rounded-sm bg-accent/20 px-0.5'
                  : 'rounded-sm px-0.5 hover:bg-accent/40'
            }
          >
            {token.text}
          </button>
        );
      })}
    </Tag>
  );
}
