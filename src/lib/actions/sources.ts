'use server';

import { createClient, requireUser } from '@/lib/supabase/server';
import type { Source, SourceType } from '@/lib/words/types';

export async function listSources(): Promise<Source[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createSource(title: string, type: SourceType = 'other'): Promise<Source> {
  const user = await requireUser();
  const supabase = await createClient();

  const trimmed = title.trim();
  if (!trimmed) throw new Error('Source title is required.');

  const { data, error } = await supabase
    .from('sources')
    .upsert({ user_id: user.id, title: trimmed, type }, { onConflict: 'user_id,title' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
