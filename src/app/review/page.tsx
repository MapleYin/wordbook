import { createClient, requireUser } from '@/lib/supabase/server';
import { TopNav } from '@/components/layout/TopNav';
import { ReviewDeck } from '@/components/review/ReviewDeck';
import type { WordEntryWithSentence } from '@/lib/words/types';

export default async function ReviewPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: words, error } = await supabase
    .from('word_entries')
    .select('*, sentence:sentences(*, source:sources(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <>
      <TopNav signedIn />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16">
        <h1 className="mb-6 font-serif text-2xl text-ink">Review</h1>
        <ReviewDeck words={(words ?? []) as WordEntryWithSentence[]} />
      </main>
    </>
  );
}
