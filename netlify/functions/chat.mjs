// ============================================================================
// X Studio - Chat proxy (Netlify Function v2)
// ----------------------------------------------------------------------------
// * Keeps every API key server-side.
// * Speaks one protocol (OpenAI chat completions) to all providers.
// * Streams tokens back to the browser (SSE passthrough) for a live typing feel.
// * Retries transient failures and falls back to a keyless provider.
// ============================================================================

import {
  PROVIDERS,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL,
  isProviderEnabled,
  resolveModelId,
  buildHeaders,
} from '../lib/providers.mjs';

const LIMITS = {
  maxMessages: 60,
  maxCharsPerMessage: 24000,
  maxSystemChars: 160000,
  maxTotalChars: 320000,
  maxTokens: 32000,
  timeoutMs: 120000,
  requestsPerMinute: 30,
};

const RETRY_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

// Best-effort in-memory throttle (per warm instance).
const hits = new Map();

const json = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const throttled = (ip) => {
  const now = Date.now();
  const windowStart = now - 60000;
  const timestamps = (hits.get(ip) || []).filter((t) => t > windowStart);
  timestamps.push(now);
  hits.set(ip, timestamps);
  if (hits.size > 500) hits.clear(); // keep memory bounded
  return timestamps.length > LIMITS.requestsPerMinute;
};

const sanitizeMessages = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-LIMITS.maxMessages)
    .map((m) => {
      const role = ['system', 'user', 'assistant'].includes(m.role) ? m.role : 'user';
      const maxChars = role === 'system' ? LIMITS.maxSystemChars : LIMITS.maxCharsPerMessage;
      return {
        role,
        content: m.content.slice(0, maxChars),
      };
    });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callProvider = async ({ providerId, model, messages, options, origin, stream, userKeys }) => {
  const provider = PROVIDERS[providerId];
  const payload = {
    model,
    messages,
    stream,
    temperature: Math.min(Math.max(options.temperature ?? 0.7, 0), 2),
    top_p: Math.min(Math.max(options.top_p ?? 0.95, 0), 1),
    max_tokens: Math.min(options.max_tokens ?? 8000, LIMITS.maxTokens),
  };

  return fetch(provider.baseUrl, {
    method: 'POST',
    headers: buildHeaders(providerId, origin, userKeys),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(LIMITS.timeoutMs),
  });
};

const readError = async (response) => {
  try {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      return parsed?.error?.message || parsed?.message || text.slice(0, 300);
    } catch {
      return text.slice(0, 300);
    }
  } catch {
    return `Upstream error ${response.status}`;
  }
};

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  }
  if (req.method !== 'POST') {
    return json(405, { success: false, error: 'Method not allowed' });
  }

  const ip = req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (throttled(ip)) {
    return json(429, {
      success: false,
      error: 'Too many requests. Please wait a moment and try again.',
      code: 'RATE_LIMITED',
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: 'Invalid JSON body' });
  }

  // ---- Build the message list -------------------------------------------
  // Accepts the modern shape { messages } and the legacy
  // { prompt, conversationHistory, systemPrompt } shape.
  let messages = sanitizeMessages(body.messages);
  if (!messages.length) {
    const legacy = [
      body.systemPrompt && { role: 'system', content: body.systemPrompt },
      ...(Array.isArray(body.conversationHistory) ? body.conversationHistory : []),
      body.prompt && { role: 'user', content: body.prompt },
    ].filter(Boolean);
    messages = sanitizeMessages(legacy);
  }

  if (!messages.length) {
    return json(400, { success: false, error: 'No messages provided' });
  }

  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalChars > LIMITS.maxTotalChars) {
    return json(413, { success: false, error: 'Conversation too large' });
  }

  const requested = resolveModelId(body.model);
  const allowFallback = body.allow_fallback !== false;
  const stream = body.stream !== false;
  const origin = req.headers.get('origin');
  // Bring-your-own-key: forwarded per request, never stored or logged.
  const userKeys = body.keys && typeof body.keys === 'object' ? body.keys : {};
  const options = {
    temperature: body.temperature,
    top_p: body.top_p,
    max_tokens: body.max_tokens,
  };

  // The public app requests strict routing: the chosen model either runs or
  // returns a clear error. Legacy/API callers may still opt into fallback.
  const attempts = [];
  if (isProviderEnabled(requested.provider, userKeys)) {
    attempts.push({ providerId: requested.provider, model: requested.model });
  } else if (!allowFallback) {
    return json(503, {
      success: false,
      error: 'The selected model provider is not configured on the server.',
      code: 'MODEL_UNAVAILABLE',
    });
  }
  if (allowFallback && requested.provider !== DEFAULT_PROVIDER) {
    attempts.push({ providerId: DEFAULT_PROVIDER, model: DEFAULT_MODEL, fallback: true });
  }

  if (!attempts.length) {
    return json(503, {
      success: false,
      error: 'No AI provider is configured on the server.',
      code: allowFallback ? 'NO_PROVIDER' : 'MODEL_UNAVAILABLE',
    });
  }

  let lastError = 'Unknown error';
  let lastStatus = 502;

  for (const attempt of attempts) {
    const maxTries = 2;

    for (let tryIndex = 0; tryIndex < maxTries; tryIndex += 1) {
      let response;
      try {
        response = await callProvider({ ...attempt, messages, options, origin, stream, userKeys });
      } catch (error) {
        lastError = error.name === 'TimeoutError' ? 'Provider timed out' : error.message;
        lastStatus = 504;
        if (tryIndex + 1 < maxTries) await sleep(600);
        continue;
      }

      if (!response.ok) {
        lastStatus = response.status;
        const retryAfter = Number(response.headers.get('retry-after'));
        lastError = await readError(response);
        // Auth / model errors will not fix themselves: move to next provider.
        if (!RETRY_STATUS.has(response.status)) break;
        if (tryIndex + 1 < maxTries) {
          const wait = Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 4000)
            : 900;
          await sleep(wait);
        }
        continue;
      }

      const meta = {
        'x-ai-provider': attempt.providerId,
        'x-ai-model': attempt.model,
        'x-ai-fallback': attempt.fallback ? '1' : '0',
      };

      if (stream) {
        return new Response(response.body, {
          status: 200,
          headers: {
            ...meta,
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        });
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({
          success: true,
          content: data?.choices?.[0]?.message?.content || '',
          provider: attempt.providerId,
          model: attempt.model,
          fallback: !!attempt.fallback,
          usage: data?.usage || null,
        }),
        { status: 200, headers: { ...meta, 'Content-Type': 'application/json' } }
      );
    }
  }

  // OpenRouter answers 404 "No allowed providers are available..." when the
  // account privacy/provider settings block every upstream for that model. The
  // key is valid, so a generic "model unavailable" would send the operator
  // hunting in the wrong place.
  if (/no allowed providers/i.test(lastError)) {
    return json(403, {
      success: false,
      error:
        'The provider account blocks every upstream for this model. '
        + 'Enable the providers in the OpenRouter privacy settings '
        + '(openrouter.ai/settings/privacy), then retry.',
      code: 'PROVIDER_BLOCKED',
    });
  }

  return json(lastStatus >= 400 && lastStatus < 600 ? lastStatus : 502, {
    success: false,
    error: allowFallback ? lastError : `Selected model failed: ${lastError}`,
    code: allowFallback ? 'UPSTREAM_FAILED' : 'MODEL_UNAVAILABLE',
  });
};
