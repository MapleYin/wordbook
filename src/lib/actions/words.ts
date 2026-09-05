'use server';

import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { getOrFetchDictionaryEntry } from '@/lib/dictionary/getOrFetchDictionaryEntry';
import { generateExplanation } from '@/lib/anthropic/generateExplanation';
import type {
  ExplanationLanguage,
  SentenceWithSource,
  SourceType,
  WordEntry,
  WordSelection,
} from '@/lib/words/types';

export interface AddWordsFromSentenceInput {
  sentenceText: string;
  sourceId?: string | null;
  newSourceTitle?: string | null;
  newSourceType?: SourceType;
  language: ExplanationLanguage;
  selections: WordSelection[];
}

export interface AddWordsFromSentenceResult {
  sentence: SentenceWithSource;
  wordEntries: WordEntry[];
  aiErrors: string[];
}

function validateSelections(sentenceText: string, selections: WordSelection[]) {
  for (const selection of selections) {
    if (
      selection.start < 0 ||
      selection.end <= selection.start ||
      selection.end > sentenceText.length ||
      sentenceText.slice(selection.start, selection.end) !== selection.text
    ) {
      throw new Error(`Invalid word selection: "${selection.text}" (${selection.start}-${selection.end})`);
    }
  }
}

export async function addWordsFromSentence(
  input: AddWordsFromSentenceInput,
): Promise<AddWordsFromSentenceResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const sentenceText = input.sentenceText.trim();
  if (!sentenceText) throw new Error('Sentence text is required.');
  if (input.selections.length === 0) throw new Error('Select at least one word.');
  validateSelections(sentenceText, input.selections);

  let sourceId = input.sourceId ?? null;
  if (input.newSourceTitle?.trim()) {
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .upsert(
        { user_id: user.id, title: input.newSourceTitle.trim(), type: input.newSourceType ?? 'other' },
        { onConflict: 'user_id,title' },
      )
      .select()
      .single();
    if (sourceError) throw new Error(sourceError.message);
    sourceId = source.id;
  }

  const { data: sentence, error: sentenceError } = await supabase
    .from('sentences')
    .insert({ user_id: user.id, source_id: sourceId, text: sentenceText })
    .select('*, source:sources(*)')
    .single();
  if (sentenceError) throw new Error(sentenceError.message);

  const aiErrors: string[] = [];
  let sentenceTranslation: string | null = null;

  const rowsToInsert = await Promise.all(
    input.selections.map(async (selection) => {
      const headword = selection.text.toLowerCase();
      const dictEntry = await getOrFetchDictionaryEntry(supabase, headword);

      const result = await generateExplanation({
        word: selection.text,
        sentence: sentenceText,
        highlightStart: selection.start,
        highlightEnd: selection.end,
        language: input.language,
        dictionaryMeanings: dictEntry?.meanings,
      });

      if (result.ok) {
        if (sentenceTranslation === null) sentenceTranslation = result.data.sentence_translation;
        return {
          user_id: user.id,
          sentence_id: sentence.id,
          word: selection.text,
          headword,
          highlight_start: selection.start,
          highlight_end: selection.end,
          language: input.language,
          explanation: result.data.explanation,
          part_of_speech: result.data.part_of_speech,
          definition: result.data.definition,
        };
      }

      aiErrors.push(`"${selection.text}": ${result.error.message}`);
      return {
        user_id: user.id,
        sentence_id: sentence.id,
        word: selection.text,
        headword,
        highlight_start: selection.start,
        highlight_end: selection.end,
        language: input.language,
        explanation: '',
        part_of_speech: '',
        definition: '',
      };
    }),
  );

  const { data: wordEntries, error: entriesError } = await supabase
    .from('word_entries')
    .insert(rowsToInsert)
    .select();
  if (entriesError) throw new Error(entriesError.message);

  let finalSentence: SentenceWithSource = sentence;
  if (sentenceTranslation !== null) {
    const { data: updatedSentence, error: updateError } = await supabase
      .from('sentences')
      .update({ translation: sentenceTranslation, translation_language: input.language })
      .eq('id', sentence.id)
      .select('*, source:sources(*)')
      .single();
    if (!updateError && updatedSentence) finalSentence = updatedSentence;
  }

  revalidatePath('/');

  return { sentence: finalSentence, wordEntries: wordEntries ?? [], aiErrors };
}

export async function regenerateWordExplanation(
  wordEntryId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: entry, error: fetchError } = await supabase
    .from('word_entries')
    .select('*, sentence:sentences(text)')
    .eq('id', wordEntryId)
    .eq('user_id', user.id)
    .single();
  if (fetchError || !entry) return { ok: false, error: 'Word not found.' };

  const dictEntry = await getOrFetchDictionaryEntry(supabase, entry.headword);
  const result = await generateExplanation({
    word: entry.word,
    sentence: entry.sentence.text,
    highlightStart: entry.highlight_start,
    highlightEnd: entry.highlight_end,
    language: entry.language,
    dictionaryMeanings: dictEntry?.meanings,
  });

  if (!result.ok) return { ok: false, error: result.error.message };

  const { error: updateError } = await supabase
    .from('word_entries')
    .update({
      explanation: result.data.explanation,
      part_of_speech: result.data.part_of_speech,
      definition: result.data.definition,
    })
    .eq('id', wordEntryId);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath('/');
  revalidatePath('/review');
  return { ok: true };
}

export async function updateWordExplanation(
  wordEntryId: string,
  fields: Partial<Pick<WordEntry, 'explanation' | 'part_of_speech' | 'definition'>>,
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
  revalidatePath('/review');
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
  revalidatePath('/review');
}
