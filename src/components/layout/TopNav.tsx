'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function TopNav({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  }

  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 font-sans text-sm">
      <Link href="/" className="font-serif text-lg text-ink">
        English Words Collector
      </Link>
      {signedIn && (
        <nav className="flex items-center gap-4 text-ink/70">
          <Link href="/reading" className="hover:text-ink">Reading</Link>
          <button type="button" onClick={handleSignOut} className="hover:text-ink">Sign out</button>
        </nav>
      )}
    </header>
  );
}
