import type { DictionaryEntry, DictionaryMeaning } from '@/lib/words/types';

interface RawPhonetic {
  text?: string;
  audio?: string;
}

interface RawDefinition {
  definition?: string;
}

interface RawMeaning {
  partOfSpeech?: string;
  definitions?: RawDefinition[];
}

interface RawEntry {
  phonetic?: string;
  phonetics?: RawPhonetic[];
  meanings?: RawMeaning[];
}

/**
 * Looks up a word against the free, keyless dictionaryapi.dev API.
 * Returns null when the word isn't found (404) or the response is malformed.
 */
export async function fetchFreeDictionaryEntry(headword: string): Promise<DictionaryEntry | null> {
  const key = headword.trim().toLowerCase();
  if (!key) return null;

  let response: Response;
  try {
    response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`,
    );
  } catch {
    return null;
  }

  if (!response.ok) return null;

  let json: RawEntry[];
  try {
    json = await response.json();
  } catch {
    return null;
  }

  const entry = json[0];
  if (!entry) return null;

  const phonetic = entry.phonetic ?? entry.phonetics?.find((p) => p.text)?.text ?? null;
  const audioUrl = entry.phonetics?.find((p) => p.audio)?.audio || null;
  const meanings: DictionaryMeaning[] = (entry.meanings ?? [])
    .filter((m): m is RawMeaning & { partOfSpeech: string } => Boolean(m.partOfSpeech))
    .map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: (m.definitions ?? [])
        .map((d) => d.definition)
        .filter((d): d is string => Boolean(d)),
    }))
    .filter((m) => m.definitions.length > 0);

  return { headword: key, phonetic, audio_url: audioUrl, meanings };
}
