'use client';

import { useState } from 'react';
import { useLocalArticle } from '@/lib/reading/useLocalArticle';
import { ArticleReader } from '@/components/reading/ArticleReader';
import { SavedWordsSidebar } from '@/components/reading/SavedWordsSidebar';
import { SourcePicker, type SourceSelection } from '@/components/words/SourcePicker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { SavedWordEntry } from '@/lib/reading/types';
import type { ExplanationLanguage, Source } from '@/lib/words/types';

interface ReadingWorkspaceProps {
  sources: Source[];
}

const emptySourceSelection: SourceSelection = { sourceId: null, newSourceTitle: null, newSourceType: 'other' };

export function ReadingWorkspace({ sources }: ReadingWorkspaceProps) {
  const { article, save } = useLocalArticle();
  const [draftContent, setDraftContent] = useState('');
  const [draftSource, setDraftSource] = useState<SourceSelection>(emptySourceSelection);
  const [language, setLanguage] = useState<ExplanationLanguage>('zh');
  const [savedEntries, setSavedEntries] = useState<SavedWordEntry[]>([]);

  if (!article) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-serif text-xl text-foreground">Paste an article</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste the full text you&apos;re reading. Click any word or phrase in it to translate or collect it — no
          need to copy sentences out by hand. The article stays in your browser only; it&apos;s never saved to the
          server.
        </p>
        <Textarea
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          rows={12}
          placeholder="Paste the article text here…"
          className="mt-4 font-serif text-base leading-relaxed"
        />
        <div className="mt-4">
          <SourcePicker sources={sources} value={draftSource} onChange={setDraftSource} />
        </div>
        <div className="mt-5">
          <Button
            type="button"
            disabled={!draftContent.trim()}
            onClick={() => {
              setSavedEntries([]);
              save({ content: draftContent, sourceSelection: draftSource });
            }}
          >
            Start reading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
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
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            save(null);
            setDraftContent('');
            setDraftSource(emptySourceSelection);
            setSavedEntries([]);
          }}
        >
          New article
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <div className="rounded-lg border border-border bg-card p-5">
          <ArticleReader
            content={article.content}
            sourceSelection={article.sourceSelection}
            language={language}
            savedEntries={savedEntries}
            onSaved={(entry) => setSavedEntries((prev) => [...prev, entry])}
          />
        </div>
        <SavedWordsSidebar entries={savedEntries} />
      </div>
    </div>
  );
}
