'use server';

import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { generateWordExplanation } from '@/lib/qwen/generateWordExplanation';
import { translateSentence } from '@/lib/qwen/translateSentence';
import { inferEntryType } from '@/lib/words/entryType';
import type { ExplanationLanguage, SentenceWithSource, SourceType, WordEntry } from '@/lib/words/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SourceSelectionInput {
  sourceId?: string | null;
  newSourceTitle?: string | null;
  newSourceType?: SourceType;
}

/** Resolves a source selection to a source id, creating the source first if a new title was given. */
async function resolveSourceId(
  supabase: SupabaseClient,
  userId: string,
  selection: SourceSelectionInput,
): Promise<string | null> {
  if (selection.newSourceTitle?.trim()) {
    const { data: source, error } = await supabase
      .from('sources')
      .upsert(
        { user_id: userId, title: selection.newSourceTitle.trim(), type: selection.newSourceType ?? 'other' },
        { onConflict: 'user_id,title' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return source.id;
  }
  return selection.sourceId ?? null;
}

export interface WordEntryDraftInput {
  start: number;
  end: number;
  text: string;
  phonetic: string;
  part_of_speech: string;
  meaning: string;
}

export interface AddWordsFromSentenceInput {
  sentenceText: string;
  sourceId?: string | null;
  newSourceTitle?: string | null;
  newSourceType?: SourceType;
  language: ExplanationLanguage;
  translation?: string | null;
  drafts: WordEntryDraftInput[];
}

export interface AddWordsFromSentenceResult {
  sentence: SentenceWithSource;
  wordEntries: WordEntry[];
  /** Words that were skipped because that headword was already marked in this sentence. */
  skippedWords: string[];
}

function validateDrafts(sentenceText: string, drafts: WordEntryDraftInput[]) {
  for (const draft of drafts) {
    if (
      draft.start < 0 ||
      draft.end <= draft.start ||
      draft.end > sentenceText.length ||
      sentenceText.slice(draft.start, draft.end) !== draft.text
    ) {
      throw new Error(`Invalid word selection: "${draft.text}" (${draft.start}-${draft.end})`);
    }
  }
}

/**
 * Persists a sentence and its marked words exactly as composed in the form —
 * whether each field was typed by hand or filled via lookupWordEntry/
 * translateSentenceForForm. No AI calls happen here, so saving never fails
 * because of an upstream model error.
 */
export async function addWordsFromSentence(
  input: AddWordsFromSentenceInput,
): Promise<AddWordsFromSentenceResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const sentenceText = input.sentenceText.trim();
  if (!sentenceText) throw new Error('Sentence text is required.');
  if (input.drafts.length === 0) throw new Error('Select at least one word.');
  validateDrafts(sentenceText, input.drafts);

  const sourceId = await resolveSourceId(supabase, user.id, input);

  const translation = input.translation?.trim() || null;

  // Reuse an existing sentence with identical text instead of creating a duplicate.
  const { data: matches, error: matchError } = await supabase
    .from('sentences')
    .select('*, source:sources(*)')
    .eq('user_id', user.id)
    .eq('text', sentenceText)
    .order('created_at', { ascending: true })
    .limit(1);
  if (matchError) throw new Error(matchError.message);

  let sentence = matches?.[0] ?? null;
  if (sentence) {
    const updates: Record<string, unknown> = {};
    if (!sentence.source_id && sourceId) updates.source_id = sourceId;
    if (!sentence.translation && translation) {
      updates.translation = translation;
      updates.translation_language = input.language;
    }
    if (Object.keys(updates).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from('sentences')
        .update(updates)
        .eq('id', sentence.id)
        .select('*, source:sources(*)')
        .single();
      if (updateError) throw new Error(updateError.message);
      sentence = updated;
    }
  } else {
    const { data: inserted, error: sentenceError } = await supabase
      .from('sentences')
      .insert({
        user_id: user.id,
        source_id: sourceId,
        text: sentenceText,
        translation,
        translation_language: translation ? input.language : null,
      })
      .select('*, source:sources(*)')
      .single();
    if (sentenceError) throw new Error(sentenceError.message);
    sentence = inserted;
  }

  // Skip words already marked in this sentence — same headword marked twice
  // (across submissions, or twice within one submission) merges into one entry.
  const { data: existingEntries, error: existingEntriesError } = await supabase
    .from('word_entries')
    .select('headword')
    .eq('sentence_id', sentence.id);
  if (existingEntriesError) throw new Error(existingEntriesError.message);

  const seenHeadwords = new Set((existingEntries ?? []).map((e) => e.headword));
  const skippedWords: string[] = [];
  const newDrafts: WordEntryDraftInput[] = [];
  for (const draft of input.drafts) {
    const headword = draft.text.toLowerCase();
    if (seenHeadwords.has(headword)) {
      skippedWords.push(draft.text);
      continue;
    }
    seenHeadwords.add(headword);
    newDrafts.push(draft);
  }

  if (newDrafts.length === 0) {
    throw new Error('These words are already in your collection for this sentence.');
  }

  const rowsToInsert = newDrafts.map((draft) => ({
    user_id: user.id,
    sentence_id: sentence.id,
    word: draft.text,
    headword: draft.text.toLowerCase(),
    highlight_start: draft.start,
    highlight_end: draft.end,
    language: input.language,
    explanation: draft.meaning,
    part_of_speech: draft.part_of_speech,
    definition: '',
    phonetic: draft.phonetic,
    entry_type: inferEntryType(draft.text),
  }));

  const { data: wordEntries, error: entriesError } = await supabase
    .from('word_entries')
    .insert(rowsToInsert)
    .select();
  if (entriesError) throw new Error(entriesError.message);

  revalidatePath('/');

  return { sentence, wordEntries: wordEntries ?? [], skippedWords };
}

/** Changes which source a sentence (and every word marked in it) is attributed to. */
export async function updateSentenceSource(
  sentenceId: string,
  selection: SourceSelectionInput,
): Promise<SentenceWithSource> {
  const user = await requireUser();
  const supabase = await createClient();

  const sourceId = await resolveSourceId(supabase, user.id, selection);

  const { data: sentence, error } = await supabase
    .from('sentences')
    .update({ source_id: sourceId })
    .eq('id', sentenceId)
    .eq('user_id', user.id)
    .select('*, source:sources(*)')
    .single();
  if (error) throw new Error(error.message);

  revalidatePath('/');
  return sentence;
}

export interface LookupWordInput {
  word: string;
  sentence: string;
  language: ExplanationLanguage;
}

export type LookupWordResult =
  | {
      ok: true;
      data: { phonetic: string; part_of_speech: string; meaning: string; sentenceTranslation: string };
    }
  | { ok: false; error: string };

/** Client-triggered AI explanation of a word as used in its sentence. */
export async function lookupWordEntry(input: LookupWordInput): Promise<LookupWordResult> {
  await requireUser();

  const entryType = inferEntryType(input.word);
  const result = await generateWordExplanation({ ...input, entryType });
  if (!result.ok) return { ok: false, error: result.error.message };

  return {
    ok: true,
    data: {
      phonetic: result.data.phonetic,
      part_of_speech: result.data.partOfSpeech,
      meaning: result.data.explanation,
      sentenceTranslation: result.data.sentenceTranslation,
    },
  };
}

export type TranslateSentenceForFormResult = { ok: true; translation: string } | { ok: false; error: string };

/** Client-triggered AI translation of the whole sentence, independent of any single word. */
export async function translateSentenceForForm(
  sentenceText: string,
  language: ExplanationLanguage,
): Promise<TranslateSentenceForFormResult> {
  await requireUser();
  const result = await translateSentence(sentenceText, language);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, translation: result.translation };
}

export async function updateWordExplanation(
  wordEntryId: string,
  fields: Partial<Pick<WordEntry, 'explanation' | 'part_of_speech' | 'definition' | 'phonetic'>>,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('word_entries')
    .update(fields)
    .eq('id', wordEntryId)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  revalidatePath('/');
}

export async function deleteWord(wordEntryId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('word_entries')
    .delete()
    .eq('id', wordEntryId)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  revalidatePath('/');
}
