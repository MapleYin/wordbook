import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { listSources } from '@/lib/actions/sources';
import { TopNav } from '@/components/layout/TopNav';
import { ReadingWorkspace } from '@/components/reading/ReadingWorkspace';

export default async function ReadingPage() {
  const user = await getUser();
  if (!user) redirect('/auth');

  const sources = await listSources();

  return (
    <>
      <TopNav signedIn />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 pb-16">
        <ReadingWorkspace sources={sources} />
      </main>
    </>
  );
}
