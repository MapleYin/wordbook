import OpenAI from 'openai';

export interface QwenError {
  kind: 'rate_limit' | 'auth' | 'invalid_request' | 'network' | 'unknown';
  message: string;
}

export function mapQwenError(err: unknown): QwenError {
  if (err instanceof OpenAI.RateLimitError) {
    return { kind: 'rate_limit', message: 'Qwen is rate-limited right now — try again shortly.' };
  }
  if (err instanceof OpenAI.AuthenticationError) {
    return {
      kind: 'auth',
      message: 'AI explanation is unavailable (invalid API key or exhausted credits).',
    };
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return { kind: 'network', message: 'Could not reach Qwen — check your connection and try again.' };
  }
  if (err instanceof OpenAI.APIError) {
    return { kind: 'invalid_request', message: `Qwen API error (${err.status}): ${err.message}` };
  }
  return { kind: 'unknown', message: 'Unexpected error calling Qwen.' };
}
