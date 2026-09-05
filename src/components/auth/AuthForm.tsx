'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Mode = 'sign-in' | 'sign-up';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === 'sign-in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.refresh();
      router.push('/');
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.refresh();
      router.push('/');
      return;
    }
    setNotice('Check your email to confirm your account, then sign in.');
    setMode('sign-in');
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-6 flex gap-2 font-sans text-sm">
        <button
          type="button"
          onClick={() => setMode('sign-in')}
          className={`rounded-full px-4 py-1.5 transition ${
            mode === 'sign-in' ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode('sign-up')}
          className={`rounded-full px-4 py-1.5 transition ${
            mode === 'sign-up' ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-sans">
        <label className="flex flex-col gap-1 text-sm text-ink/80">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-ink/20 bg-white/60 px-3 py-2 text-ink outline-none focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink/80">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-ink/20 bg-white/60 px-3 py-2 text-ink outline-none focus:border-ink"
          />
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {notice && <p className="text-sm text-ink/70">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink-700 disabled:opacity-60"
        >
          {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
