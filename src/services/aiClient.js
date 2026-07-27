// ============================================================================
// X Studio - Unified AI client
// ----------------------------------------------------------------------------
// One entry point for every text model, whatever the provider:
//   * real token-by-token streaming (SSE)
//   * cancellation via AbortSignal
//   * automatic retry on transient network errors
//   * graceful keyless fallback when the backend function is unavailable
//     (e.g. `npm start` without `netlify dev`)
// ============================================================================

import {
  APP_CONFIG,
  GENERATION_DEFAULTS,
  FALLBACK_MODELS,
  buildImageModelMeta,
  buildModelMeta,
  normalizeModelId,
  DEFAULT_MODEL,
  shouldUseBackendFunctions,
} from '../config/api';
import { getApiKeys } from '../utils/apiKeys';
import { readSseStream } from './sseParser';

export class AiError extends Error {
  constructor(code, message, status = 0) {
    super(message || code);
    this.name = 'AiError';
    this.code = code;
    this.status = status;
  }
}

const ERROR_CODES = {
  ABORTED: 'ABORTED',
  OFFLINE: 'OFFLINE',
  RATE_LIMITED: 'RATE_LIMITED',
  NO_PROVIDER: 'NO_PROVIDER',
  TIMEOUT: 'TIMEOUT',
  UPSTREAM: 'UPSTREAM',
  EMPTY: 'EMPTY',
};

export { ERROR_CODES };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isAbort = (error) => error?.name === 'AbortError' || error?.code === ERROR_CODES.ABORTED;

/**
 * AbortSignal.timeout is missing in older Safari and in jsdom, so fall back to
 * a plain controller. Returns undefined when aborting is unsupported entirely.
 */
const timeoutSignal = (ms) => {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  if (typeof AbortController === 'undefined') return undefined;

  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
};

/** Trim history so we never blow past the model/provider input budget */
const prepareMessages = (messages, systemPrompt) => {
  const { maxMessages, maxCharsPerMessage } = APP_CONFIG.context;

  const history = messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-maxMessages)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content:
        m.content.length > maxCharsPerMessage
          ? `${m.content.slice(0, maxCharsPerMessage)}…`
          : m.content,
    }));

  return systemPrompt ? [{ role: 'system', content: systemPrompt }, ...history] : history;
};

const mapHttpError = async (response) => {
  let message = `Request failed (${response.status})`;
  let code = ERROR_CODES.UPSTREAM;
  try {
    const data = await response.json();
    if (data?.error) message = data.error;
    if (data?.code) code = data.code;
  } catch {
    /* keep default message */
  }
  if (response.status === 429) code = ERROR_CODES.RATE_LIMITED;
  if (response.status === 503) code = ERROR_CODES.NO_PROVIDER;
  if (response.status === 504) code = ERROR_CODES.TIMEOUT;
  return new AiError(code, message, response.status);
};

const readStream = (response, onToken) => readSseStream(response.body, onToken);

// ---------------------------------------------------------------------------
// Keyless direct fallback (used only when the backend function is missing)
// ---------------------------------------------------------------------------
const streamDirectFallback = async ({ messages, onToken, signal }) => {
  const response = await fetch(APP_CONFIG.fallback.chatUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: APP_CONFIG.fallback.model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok || !response.body) throw await mapHttpError(response);

  const content = await readStream(response, onToken);
  return {
    content,
    provider: APP_CONFIG.fallback.provider,
    model: APP_CONFIG.fallback.model,
    fallback: true,
  };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Stream a chat completion.
 * @returns {Promise<{content: string, provider: string, model: string, fallback: boolean}>}
 */
export const streamChat = async ({
  model,
  messages,
  systemPrompt,
  onToken,
  signal,
  temperature,
  maxTokens,
} = {}) => {
  if (!navigator.onLine) throw new AiError(ERROR_CODES.OFFLINE, 'No internet connection');

  const payload = {
    model: normalizeModelId(model) || DEFAULT_MODEL,
    messages: prepareMessages(messages || [], systemPrompt),
    stream: true,
    temperature: temperature ?? GENERATION_DEFAULTS.temperature,
    top_p: GENERATION_DEFAULTS.top_p,
    max_tokens: maxTokens ?? GENERATION_DEFAULTS.max_tokens,
    keys: getApiKeys(),
  };

  const { retries, retryDelayMs } = APP_CONFIG.network;
  let lastError;

  if (!shouldUseBackendFunctions()) {
    return streamDirectFallback({ messages: payload.messages, onToken, signal });
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(APP_CONFIG.endpoints.chat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });

      // Backend function not deployed (plain CRA dev server) -> keyless path
      if (response.status === 404 || response.status === 405) {
        return streamDirectFallback({ messages: payload.messages, onToken, signal });
      }

      if (!response.ok || !response.body) throw await mapHttpError(response);

      const content = await readStream(response, onToken);
      if (!content.trim()) throw new AiError(ERROR_CODES.EMPTY, 'Empty response from model');

      return {
        content,
        provider: response.headers.get('x-ai-provider') || 'unknown',
        model: response.headers.get('x-ai-model') || payload.model,
        fallback: response.headers.get('x-ai-fallback') === '1',
      };
    } catch (error) {
      if (isAbort(error)) throw new AiError(ERROR_CODES.ABORTED, 'Generation stopped');
      lastError = error;

      const retryable =
        !(error instanceof AiError) || // network/parse failure
        [ERROR_CODES.TIMEOUT, ERROR_CODES.EMPTY].includes(error.code);

      if (attempt < retries && retryable) {
        await sleep(retryDelayMs);
        continue;
      }
      break;
    }
  }

  // Last resort: keyless provider so the user still gets an answer.
  if (!isAbort(lastError)) {
    try {
      return await streamDirectFallback({ messages: payload.messages, onToken, signal });
    } catch (fallbackError) {
      if (isAbort(fallbackError)) throw new AiError(ERROR_CODES.ABORTED, 'Generation stopped');
    }
  }

  throw lastError instanceof AiError
    ? lastError
    : new AiError(ERROR_CODES.UPSTREAM, lastError?.message || 'Generation failed');
};

/** Single-shot completion (no streaming) - used for translation & utilities */
export const completeChat = async ({ model, messages, systemPrompt, temperature, maxTokens }) => {
  const preparedMessages = prepareMessages(messages || [], systemPrompt);
  const completeDirectly = async () => {
    const direct = await fetch(APP_CONFIG.fallback.chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: APP_CONFIG.fallback.model,
        messages: preparedMessages,
        stream: false,
      }),
    });
    if (!direct.ok) throw await mapHttpError(direct);
    const data = await direct.json();
    return data?.choices?.[0]?.message?.content || '';
  };

  if (!shouldUseBackendFunctions()) return completeDirectly();

  const response = await fetch(APP_CONFIG.endpoints.chat, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: normalizeModelId(model) || DEFAULT_MODEL,
      messages: preparedMessages,
      stream: false,
      temperature: temperature ?? 0.2,
      max_tokens: maxTokens ?? 800,
      keys: getApiKeys(),
    }),
  });

  if (response.status === 404 || response.status === 405) return completeDirectly();
  if (!response.ok) throw await mapHttpError(response);
  const data = await response.json();
  return data?.content || '';
};

/**
 * Discover the models the backend can actually serve right now.
 * Falls back to the offline catalog so the UI always has something to show.
 */
export const fetchAvailableModels = async ({ refresh = false } = {}) => {
  if (!shouldUseBackendFunctions()) {
    return { models: FALLBACK_MODELS, imageModels: [], live: false };
  }

  try {
    const response = await fetch(APP_CONFIG.endpoints.models, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: getApiKeys(), refresh }),
      signal: timeoutSignal(15000),
    });
    if (!response.ok) throw new Error(`models ${response.status}`);

    const data = await response.json();
    const models = (data?.models || []).map((m) =>
      buildModelMeta(m.id, {
        label: m.label || null,
        description: m.description || null,
        contextWindow: m.contextWindow || null,
        maxOutput: m.maxOutput || null,
        vision: !!m.vision,
        reasoning: !!m.reasoning,
        tools: !!m.tools,
        free: true,
      })
    );
    const imageModels = (data?.imageModels || []).map((m) => buildImageModelMeta(m.id));

    if (!models.length) return { models: FALLBACK_MODELS, imageModels, live: false };
    return { models, imageModels, live: true, updatedAt: data.updatedAt };
  } catch {
    return { models: FALLBACK_MODELS, imageModels: [], live: false };
  }
};

/** Translate any language to English (used for image prompts) */
export const translateToEnglish = async (text) => {
  const content = await completeChat({
    systemPrompt:
      'You are a translation engine for AI image prompts. Translate the user text to English. ' +
      'Return ONLY the translation, preserving every visual detail, style and mood. No quotes, no notes.',
    messages: [{ role: 'user', content: text }],
    temperature: 0.1,
    maxTokens: 400,
  });

  return content
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^(translation|translated|english|result)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};
