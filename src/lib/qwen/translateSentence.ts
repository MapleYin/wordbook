import { qwen, QWEN_MODEL } from '@/lib/qwen/client';
import { mapQwenError, type QwenError } from '@/lib/qwen/errors';
import type { ExplanationLanguage } from '@/lib/words/types';

export type TranslateSentenceResult =
  | { ok: true; translation: string }
  | { ok: false; error: QwenError };

const TOOL_NAME = 'record_translation';

export async function translateSentence(
  sentence: string,
  language: ExplanationLanguage,
): Promise<TranslateSentenceResult> {
  const targetLangLabel = language === 'zh' ? 'Chinese (Simplified)' : 'English';

  try {
    const completion = await qwen.chat.completions.create({
      model: QWEN_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a precise translator. Always call the provided tool with your answer.',
        },
        { role: 'user', content: `Translate this sentence into ${targetLangLabel}:\n${sentence}` },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: TOOL_NAME,
            description: 'Record the translation of the sentence.',
            parameters: {
              type: 'object',
              properties: {
                translation: {
                  type: 'string',
                  description: `The sentence translated into ${targetLangLabel}`,
                },
              },
              required: ['translation'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: TOOL_NAME } },
    });

    const toolCall = completion.choices[0]?.message.tool_calls?.[0];
    if (!toolCall || toolCall.type !== 'function') {
      return { ok: false, error: { kind: 'unknown', message: 'Qwen did not return structured output.' } };
    }

    const parsed = JSON.parse(toolCall.function.arguments) as { translation?: string };
    if (!parsed.translation) {
      return { ok: false, error: { kind: 'unknown', message: 'Qwen returned an empty translation.' } };
    }

    return { ok: true, translation: parsed.translation };
  } catch (err) {
    return { ok: false, error: mapQwenError(err) };
  }
}
