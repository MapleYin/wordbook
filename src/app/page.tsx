import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import { listSources } from '@/lib/actions/sources';
import { TopNav } from '@/components/layout/TopNav';
import { AddWordForm } from '@/components/words/AddWordForm';
import { WordList } from '@/components/words/WordList';
import type { DictionaryEntry, WordEntryWithSentence } from '@/lib/words/types';

export default async function HomePage() {
  const user = await getUser();

  if (!user) {
    return (
      <>
        <TopNav signedIn={false} />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <h1 className="mb-4 font-serif text-4xl text-ink">English Words Collector</h1>
          <p className="mb-8 max-w-md font-sans text-ink/70">
            A personal vocabulary notebook. Paste a sentence you met while reading, mark the new
            word, and get an explanation you can keep forever.
          </p>
          <Link
            href="/auth"
            className="rounded-md bg-ink px-5 py-2.5 font-sans text-sm font-medium text-paper hover:bg-ink-700"
          >
            Sign in to get started
          </Link>
        </main>
      </>
    );
  }

  const supabase = await createClient();
  const [sources, { data: words, error }] = await Promise.all([
    listSources(),
    supabase
      .from('word_entries')
      .select('*, sentence:sentences(*, source:sources(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);
  if (error) throw new Error(error.message);

  const wordEntries = (words ?? []) as WordEntryWithSentence[];
  const headwords = [...new Set(wordEntries.map((w) => w.headword))];

  const dictionaryByHeadword: Record<string, Pick<DictionaryEntry, 'phonetic' | 'audio_url'>> = {};
  if (headwords.length > 0) {
    const { data: dictRows } = await supabase
      .from('word_dictionary_cache')
      .select('headword, phonetic, audio_url')
      .in('headword', headwords);
    for (const row of dictRows ?? []) {
      dictionaryByHeadword[row.headword] = { phonetic: row.phonetic, audio_url: row.audio_url };
    }
  }

  return (
    <>
      <TopNav signedIn />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 pb-16">
        <AddWordForm sources={sources} />
        <WordList words={wordEntries} sources={sources} dictionaryByHeadword={dictionaryByHeadword} />
      </main>
    </>
  );
}
