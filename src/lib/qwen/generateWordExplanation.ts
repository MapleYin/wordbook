import OpenAI from 'openai';
import { qwen, QWEN_MODEL } from '@/lib/qwen/client';
import { mapQwenError, type QwenError } from '@/lib/qwen/errors';
import type { EntryType, ExplanationLanguage } from '@/lib/words/types';

export interface GenerateWordExplanationInput {
  word: string;
  sentence: string;
  language: ExplanationLanguage;
  entryType: EntryType;
}

export interface WordExplanationData {
  phonetic: string;
  explanation: string;
  partOfSpeech: string;
  sentenceTranslation: string;
}

export type GenerateWordExplanationResult =
  | { ok: true; data: WordExplanationData }
  | { ok: false; error: QwenError };

const TOOL_NAME = 'explain_word_in_sentence';

export async function generateWordExplanation(
  input: GenerateWordExplanationInput,
): Promise<GenerateWordExplanationResult> {
  const target = input.language === 'zh' ? 'Chinese (Simplified)' : 'English';
  const isPhrase = input.entryType === 'phrase';
  const label = isPhrase ? 'Phrase' : 'Word';
  const phoneticPrompt = isPhrase
    ? 'the IPA pronunciation, or an empty string if this phrase has no single standard pronunciation worth noting'
    : 'the IPA pronunciation of the word wrapped in slashes, e.g. /dɪˈmiːnə/';
  const partOfSpeechPrompt = isPhrase
    ? 'a short usage category for the phrase, e.g. idiom, phrasal verb, fixed collocation, or informal expression'
    : 'part of speech in English, e.g. noun, verb, adjective';

  const prompt = `You help an English learner build a vocabulary notebook.

${label}: "${input.word}"
Sentence it appeared in: "${input.sentence}"

Use the sentence only to pick which sense of the word or phrase applies. Reply with json only, no prose, using exactly these keys:
{
  "phonetic": "${phoneticPrompt}",
  "explanation": "the plain dictionary meaning of the word or phrase, in the sense that fits this sentence, written in ${target}. Just the meaning itself — no mention of the sentence or how it's used there.",
  "partOfSpeech": "${partOfSpeechPrompt}",
  "sentenceTranslation": "the whole sentence rendered in ${target}"
}`;

  try {
    const completion = await qwen.chat.completions.create({
      model: QWEN_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a meticulous dictionary editor helping a language learner build a personal vocabulary notebook. Give plain dictionary definitions, not contextual paraphrases. Always call the provided tool with your answer.',
        },
        { role: 'user', content: prompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: TOOL_NAME,
            description: 'Record the pronunciation, dictionary meaning, part of speech, and sentence translation.',
            parameters: {
              type: 'object',
              properties: {
                phonetic: {
                  type: 'string',
                  description: isPhrase
                    ? 'The IPA pronunciation, or an empty string if this phrase has no single standard pronunciation worth noting'
                    : 'The IPA pronunciation of the word wrapped in slashes, e.g. /dɪˈmiːnə/',
                },
                explanation: {
                  type: 'string',
                  description: `The plain dictionary meaning of the word or phrase, in the sense that fits this sentence, written in ${target}. Just the meaning itself — no mention of the sentence or how it's used there.`,
                },
                partOfSpeech: {
                  type: 'string',
                  description: isPhrase
                    ? 'A short usage category for the phrase, e.g. idiom, phrasal verb, fixed collocation, or informal expression'
                    : 'Part of speech in English, e.g. noun, verb, adjective',
                },
                sentenceTranslation: {
                  type: 'string',
                  description: `The whole sentence rendered in ${target}`,
                },
              },
              required: isPhrase
                ? ['explanation', 'partOfSpeech', 'sentenceTranslation']
                : ['phonetic', 'explanation', 'partOfSpeech', 'sentenceTranslation'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: TOOL_NAME } },
      // DashScope rejects a forced tool_choice while thinking mode is active.
      enable_thinking: false,
    } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);

    const toolCall = completion.choices[0]?.message.tool_calls?.[0];
    if (!toolCall || toolCall.type !== 'function') {
      return { ok: false, error: { kind: 'unknown', message: 'Qwen did not return structured output.' } };
    }

    const parsed = JSON.parse(toolCall.function.arguments) as Partial<WordExplanationData>;
    if (!parsed.explanation || !parsed.partOfSpeech || !parsed.sentenceTranslation || (!isPhrase && !parsed.phonetic)) {
      return { ok: false, error: { kind: 'unknown', message: 'Qwen returned an incomplete answer.' } };
    }

    return {
      ok: true,
      data: {
        phonetic: parsed.phonetic ?? '',
        explanation: parsed.explanation,
        partOfSpeech: parsed.partOfSpeech,
        sentenceTranslation: parsed.sentenceTranslation,
      },
    };
  } catch (err) {
    return { ok: false, error: mapQwenError(err) };
  }
}
