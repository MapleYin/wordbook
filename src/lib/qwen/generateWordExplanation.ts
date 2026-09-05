import { qwen, QWEN_MODEL } from '@/lib/qwen/client';
import { mapQwenError, type QwenError } from '@/lib/qwen/errors';
import type { DictionaryMeaning, ExplanationLanguage } from '@/lib/words/types';

export interface ExplanationResult {
  part_of_speech: string;
  explanation: string;
  definition: string;
}

export type GenerateExplanationResult = { ok: true; data: ExplanationResult } | { ok: false; error: QwenError };

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

function resolveDefinitionFromDictionary(partOfSpeech: string, meanings: DictionaryMeaning[]): string {
  const normalized = partOfSpeech.trim().toLowerCase();
  const matching = meanings.find((m) => m.partOfSpeech.trim().toLowerCase() === normalized);
  const chosen = matching ?? meanings[0];
  return chosen?.definitions[0] ?? '';
}

export async function generateWordExplanation(
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

  const toolName = useDictionaryDefinition ? NO_DEFINITION_TOOL_NAME : FULL_TOOL_NAME;
  const properties: Record<string, { type: string; description: string }> = {
    part_of_speech: {
      type: 'string',
      description: useDictionaryDefinition
        ? 'The part of speech as used in this sentence, matching one of the reference dictionary entries when possible (e.g. noun, verb, phrasal verb, idiom)'
        : 'e.g. noun, verb, phrasal verb, idiom',
    },
    explanation: {
      type: 'string',
      description: 'What the word means as used in this exact sentence, 1-3 sentences, in the target language',
    },
  };
  const required = ['part_of_speech', 'explanation'];
  if (!useDictionaryDefinition) {
    properties.definition = {
      type: 'string',
      description: 'Simple dictionary-style definition, in the target language',
    };
    required.push('definition');
  }

  try {
    const completion = await qwen.chat.completions.create({
      model: QWEN_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a meticulous vocabulary tutor helping a language learner build a personal word notebook. Always call the provided tool with your answer.',
        },
        { role: 'user', content: promptLines.join('\n') },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: toolName,
            description: useDictionaryDefinition
              ? 'Record the contextual meaning and part of speech for the marked word. A dictionary definition is already available and will be attached separately.'
              : 'Record the contextual meaning, part of speech, and simple definition for the marked word.',
            parameters: {
              type: 'object',
              properties,
              required,
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: toolName } },
    });

    const toolCall = completion.choices[0]?.message.tool_calls?.[0];
    if (!toolCall || toolCall.type !== 'function') {
      return { ok: false, error: { kind: 'unknown', message: 'Qwen did not return structured output.' } };
    }

    const parsed = JSON.parse(toolCall.function.arguments) as {
      part_of_speech?: string;
      explanation?: string;
      definition?: string;
    };
    if (!parsed.part_of_speech || !parsed.explanation) {
      return { ok: false, error: { kind: 'unknown', message: 'Qwen returned an incomplete answer.' } };
    }

    const definition =
      useDictionaryDefinition && input.dictionaryMeanings
        ? resolveDefinitionFromDictionary(parsed.part_of_speech, input.dictionaryMeanings)
        : parsed.definition ?? '';

    return {
      ok: true,
      data: { part_of_speech: parsed.part_of_speech, explanation: parsed.explanation, definition },
    };
  } catch (err) {
    return { ok: false, error: mapQwenError(err) };
  }
}
