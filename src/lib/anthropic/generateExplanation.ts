import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic/client';
import type { DictionaryMeaning, ExplanationLanguage } from '@/lib/words/types';

const fullResultSchema = z.object({
  part_of_speech: z.string(),
  explanation: z.string(),
  definition: z.string(),
  sentence_translation: z.string(),
});

const noDefinitionResultSchema = z.object({
  part_of_speech: z.string(),
  explanation: z.string(),
  sentence_translation: z.string(),
});

export interface ExplanationResult {
  part_of_speech: string;
  explanation: string;
  definition: string;
  sentence_translation: string;
}

export type GenerateExplanationResult =
  | { ok: true; data: ExplanationResult }
  | {
      ok: false;
      error: {
        kind: 'rate_limit' | 'overloaded' | 'auth' | 'invalid_request' | 'network' | 'unknown';
        message: string;
      };
    };

export interface GenerateExplanationInput {
  word: string;
  sentence: string;
  highlightStart: number;
  highlightEnd: number;
  language: ExplanationLanguage;
  dictionaryMeanings?: DictionaryMeaning[];
}

const FULL_TOOL_NAME = 'explain_word_in_sentence';
const NO_DEFINITION_TOOL_NAME = 'explain_word_in_sentence_with_dictionary_definition';

function resolveDefinitionFromDictionary(
  partOfSpeech: string,
  meanings: DictionaryMeaning[],
): string {
  const normalized = partOfSpeech.trim().toLowerCase();
  const matching = meanings.find((m) => m.partOfSpeech.trim().toLowerCase() === normalized);
  const chosen = matching ?? meanings[0];
  return chosen?.definitions[0] ?? '';
}

export async function generateExplanation(
  input: GenerateExplanationInput,
): Promise<GenerateExplanationResult> {
  const targetLangLabel = input.language === 'zh' ? 'Chinese (Simplified)' : 'English';
  const useDictionaryDefinition =
    input.language === 'en' && !!input.dictionaryMeanings && input.dictionaryMeanings.length > 0;

  const promptLines = [
    `Sentence: ${input.sentence}`,
    `Marked word (characters ${input.highlightStart}-${input.highlightEnd}): "${input.word}"`,
    `Write your answer in ${targetLangLabel}.`,
    `Explain what "${input.word}" means AS USED in this specific sentence — not a generic dictionary dump.`,
  ];

  if (useDictionaryDefinition && input.dictionaryMeanings) {
    promptLines.push(
      'Reference dictionary entries for this word (pick the part of speech that matches its use in the sentence):',
      ...input.dictionaryMeanings.map(
        (m) => `- ${m.partOfSpeech}: ${m.definitions.slice(0, 2).join('; ')}`,
      ),
    );
  }

  const userPrompt = promptLines.join('\n');

  try {
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system:
        'You are a meticulous vocabulary tutor helping a language learner build a personal word notebook. Always call the provided tool with your answer.',
      tools: useDictionaryDefinition
        ? [
            {
              name: NO_DEFINITION_TOOL_NAME,
              description:
                'Record the contextual meaning, part of speech, and sentence translation for the marked word. A dictionary definition is already available and will be attached separately.',
              input_schema: {
                type: 'object',
                properties: {
                  part_of_speech: {
                    type: 'string',
                    description:
                      'The part of speech as used in this sentence, matching one of the reference dictionary entries when possible (e.g. noun, verb, phrasal verb, idiom)',
                  },
                  explanation: {
                    type: 'string',
                    description:
                      'What the word means as used in this exact sentence, 1-3 sentences, in the target language',
                  },
                  sentence_translation: {
                    type: 'string',
                    description: 'Translation of the full sentence into the target language',
                  },
                },
                required: ['part_of_speech', 'explanation', 'sentence_translation'],
                additionalProperties: false,
              },
            },
          ]
        : [
            {
              name: FULL_TOOL_NAME,
              description:
                'Record the contextual meaning, part of speech, simple definition, and sentence translation for the marked word.',
              input_schema: {
                type: 'object',
                properties: {
                  part_of_speech: {
                    type: 'string',
                    description: 'e.g. noun, verb, phrasal verb, idiom',
                  },
                  explanation: {
                    type: 'string',
                    description:
                      'What the word means as used in this exact sentence, 1-3 sentences, in the target language',
                  },
                  definition: {
                    type: 'string',
                    description: 'Simple dictionary-style definition, in the target language',
                  },
                  sentence_translation: {
                    type: 'string',
                    description: 'Translation of the full sentence into the target language',
                  },
                },
                required: ['part_of_speech', 'explanation', 'definition', 'sentence_translation'],
                additionalProperties: false,
              },
            },
          ],
      tool_choice: {
        type: 'tool',
        name: useDictionaryDefinition ? NO_DEFINITION_TOOL_NAME : FULL_TOOL_NAME,
      },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const toolUse = message.content.find((block) => block.type === 'tool_use');
    if (!toolUse) {
      return { ok: false, error: { kind: 'unknown', message: 'Claude did not return structured output.' } };
    }

    if (useDictionaryDefinition && input.dictionaryMeanings) {
      const parsed = noDefinitionResultSchema.parse(toolUse.input);
      return {
        ok: true,
        data: {
          ...parsed,
          definition: resolveDefinitionFromDictionary(parsed.part_of_speech, input.dictionaryMeanings),
        },
      };
    }

    const parsed = fullResultSchema.parse(toolUse.input);
    return { ok: true, data: parsed };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return {
        ok: false,
        error: { kind: 'rate_limit', message: 'Claude is rate-limited right now — try again shortly.' },
      };
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return {
        ok: false,
        error: {
          kind: 'auth',
          message: 'AI explanation is unavailable (invalid API key or exhausted credits).',
        },
      };
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return {
        ok: false,
        error: { kind: 'network', message: 'Could not reach Claude — check your connection and try again.' },
      };
    }
    if (err instanceof Anthropic.APIError) {
      return {
        ok: false,
        error: {
          kind: err.status === 529 ? 'overloaded' : 'invalid_request',
          message: `Claude API error (${err.status}): ${err.message}`,
        },
      };
    }
    return { ok: false, error: { kind: 'unknown', message: 'Unexpected error generating the explanation.' } };
  }
}
