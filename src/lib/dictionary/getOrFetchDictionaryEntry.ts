import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchFreeDictionaryEntry } from '@/lib/dictionary/freeDictionary';
import type { DictionaryEntry } from '@/lib/words/types';

interface DictionaryCacheRow {
  headword: string;
  phonetic: string | null;
  audio_url: string | null;
  meanings: DictionaryEntry['meanings'];
}

/**
 * Cache-first dictionary lookup: checks word_dictionary_cache before calling
 * the free external API, and upserts a fresh result so it's shared across
 * every user who later looks up the same word. Returns null on a genuine
 * "not found" without caching that miss, so a future fix upstream can retry.
 */
export async function getOrFetchDictionaryEntry(
  supabase: SupabaseClient,
  headword: string,
): Promise<DictionaryEntry | null> {
  const key = headword.trim().toLowerCase();
  if (!key) return null;

  const { data: cached } = await supabase
    .from('word_dictionary_cache')
    .select('headword, phonetic, audio_url, meanings')
    .eq('headword', key)
    .maybeSingle<DictionaryCacheRow>();

  if (cached) {
    return {
      headword: cached.headword,
      phonetic: cached.phonetic,
      audio_url: cached.audio_url,
      meanings: cached.meanings ?? [],
    };
  }

  const fetched = await fetchFreeDictionaryEntry(key);
  if (!fetched) return null;

  await supabase.from('word_dictionary_cache').upsert({
    headword: fetched.headword,
    phonetic: fetched.phonetic,
    audio_url: fetched.audio_url,
    meanings: fetched.meanings,
  });

  return fetched;
}
