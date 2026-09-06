'use client';

import { Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { getYoudaoAudioUrl } from '@/lib/dictionary/youdaoAudio';

interface SpeakButtonProps {
  text: string;
  label?: string;
}

/** A small speaker button that reads a word aloud via Youdao's TTS endpoint. */
export function SpeakButton({ text, label }: SpeakButtonProps) {
  function play() {
    if (!text.trim()) return;
    new Audio(getYoudaoAudioUrl(text)).play().catch(() => {
      toast.error('Could not play the pronunciation');
    });
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={`Hear "${text}" pronounced`}
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Volume2 className="size-3.5" />
      {label ?? 'Listen'}
    </button>
  );
}
