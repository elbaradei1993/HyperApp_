/* global Deno, DOMException, fetch */
const MODEL = Deno.env.get('CLOUDFLARE_AI_MODEL') || '@cf/meta/llama-3.1-8b-instruct-fast';
const MAX_PROVIDER_ATTEMPTS = 2;

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: 'rate_limit' | 'timeout' | 'unavailable' | 'invalid',
  ) {
    super(message);
  }
}

export interface AiClientInput {
  accountId: string;
  apiToken: string;
  systemPrompt: string;
  turnPrompt: string;
  signal: AbortSignal;
}

export interface AiClientResult {
  payload: unknown;
  model: string;
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, milliseconds);
    signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new DOMException('Request cancelled.', 'AbortError'));
    }, { once: true });
  });
}

export async function generateWithConfiguredProvider(input: AiClientInput): Promise<AiClientResult> {
  for (let attempt = 0; attempt < MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(input.accountId)}/ai/run/${MODEL}`,
      {
        method: 'POST',
        signal: input.signal,
        headers: {
          Authorization: `Bearer ${input.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: input.systemPrompt },
            { role: 'user', content: input.turnPrompt },
          ],
          max_tokens: 650,
          temperature: 0.25,
        }),
      },
    );

    if (response.ok) {
      return { payload: await response.json(), model: MODEL };
    }
    if (response.status === 429) {
      throw new AiProviderError('Free-tier rate limit reached.', 429, 'rate_limit');
    }
    const transient = response.status >= 500;
    if (!transient || attempt === MAX_PROVIDER_ATTEMPTS - 1) {
      throw new AiProviderError('Hosted provider unavailable.', response.status, 'unavailable');
    }
    await delay(350 * (2 ** attempt), input.signal);
  }
  throw new AiProviderError('Hosted provider unavailable.', 502, 'unavailable');
}

export const CONFIGURED_AI_MODEL = MODEL;
