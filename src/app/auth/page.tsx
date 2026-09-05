import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { AuthForm } from '@/components/auth/AuthForm';

export default async function AuthPage() {
  const user = await getUser();
  if (user) redirect('/');

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="mb-8 text-center font-serif text-3xl text-ink">English Words Collector</h1>
      <AuthForm />
    </main>
  );
}
