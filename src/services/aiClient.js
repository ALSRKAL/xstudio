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
  buildImageModelMeta,
  buildModelMeta,
  normalizeModelId,
  DEFAULT_MODEL,
  DIRECT_FALLBACK_MODELS,
  EMERGENCY_MODEL,
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
  MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  UPSTREAM: 'UPSTREAM',
  EMPTY: 'EMPTY',
};

export { ERROR_CODES };

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
  let hasExplicitCode = false;
  try {
    const data = await response.json();
    if (data?.error) message = data.error;
    if (data?.code) {
      code = data.code;
      hasExplicitCode = true;
    }
  } catch {
    /* keep default message */
  }
  if (!hasExplicitCode && response.status === 429) code = ERROR_CODES.RATE_LIMITED;
  if (!hasExplicitCode && response.status === 503) code = ERROR_CODES.NO_PROVIDER;
  if (!hasExplicitCode && response.status === 504) code = ERROR_CODES.TIMEOUT;
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
    modelId: EMERGENCY_MODEL,
    fallback: false,
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
    allow_fallback: false,
    keys: getApiKeys(),
  };

  if (!shouldUseBackendFunctions()) {
    if (payload.model !== EMERGENCY_MODEL) {
      throw new AiError(
        ERROR_CODES.MODEL_UNAVAILABLE,
        'The selected model requires the full-stack server.'
      );
    }
    return streamDirectFallback({ messages: payload.messages, onToken, signal });
  }

  try {
    const response = await fetch(APP_CONFIG.endpoints.chat, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (response.status === 404 || response.status === 405) {
      if (payload.model === EMERGENCY_MODEL) {
        return streamDirectFallback({ messages: payload.messages, onToken, signal });
      }
      throw new AiError(
        ERROR_CODES.MODEL_UNAVAILABLE,
        'The selected model requires an available backend function.',
        response.status
      );
    }

    if (!response.ok || !response.body) throw await mapHttpError(response);

    const content = await readStream(response, onToken);
    if (!content.trim()) throw new AiError(ERROR_CODES.EMPTY, 'Empty response from model');

    const provider = response.headers.get('x-ai-provider') || 'unknown';
    const actualModel = response.headers.get('x-ai-model') || payload.model;
    return {
      content,
      provider,
      model: actualModel,
      modelId: actualModel.startsWith(`${provider}:`) ? actualModel : `${provider}:${actualModel}`,
      fallback: response.headers.get('x-ai-fallback') === '1',
    };
  } catch (error) {
    if (isAbort(error)) throw new AiError(ERROR_CODES.ABORTED, 'Generation stopped');

    // A network failure reaching the proxy may still call the exact same
    // keyless model directly. This never substitutes a different model.
    if (payload.model === EMERGENCY_MODEL && !(error instanceof AiError)) {
      try {
        return await streamDirectFallback({ messages: payload.messages, onToken, signal });
      } catch (directError) {
        if (isAbort(directError)) throw new AiError(ERROR_CODES.ABORTED, 'Generation stopped');
        throw directError instanceof AiError
          ? directError
          : new AiError(ERROR_CODES.UPSTREAM, directError?.message || 'Generation failed');
      }
    }

    throw error instanceof AiError
      ? error
      : new AiError(ERROR_CODES.UPSTREAM, error?.message || 'Generation failed');
  }
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
    return { models: DIRECT_FALLBACK_MODELS, imageModels: [], live: false };
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
    const discoveredModels = (data?.models || []).map((m) =>
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
    const models = discoveredModels.some((model) => model.id === EMERGENCY_MODEL)
      ? discoveredModels
      : [...discoveredModels, ...DIRECT_FALLBACK_MODELS];

    if (!discoveredModels.length) {
      return { models: DIRECT_FALLBACK_MODELS, imageModels, live: false };
    }
    return { models, imageModels, live: true, updatedAt: data.updatedAt };
  } catch {
    return { models: DIRECT_FALLBACK_MODELS, imageModels: [], live: false };
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
