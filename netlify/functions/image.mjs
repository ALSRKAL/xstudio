// ============================================================================
// X Studio - Image generation (Netlify Function v2)
// ----------------------------------------------------------------------------
// Same shape as the chat function: validation, per-IP throttle, retry and a
// keyless fallback so a request never dies just because a key is missing.
// ============================================================================

import {
  IMAGE_PROVIDERS,
  DEFAULT_IMAGE_PROVIDER,
  getImageKey,
  isImageProviderEnabled,
  resolveImageModelId,
} from '../lib/imageProviders.mjs';

const LIMITS = {
  maxPromptChars: 2000,
  requestsPerMinute: 20,
};

const hits = new Map();

const json = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const throttled = (ip) => {
  const windowStart = Date.now() - 60000;
  const stamps = (hits.get(ip) || []).filter((t) => t > windowStart);
  stamps.push(Date.now());
  hits.set(ip, stamps);
  if (hits.size > 500) hits.clear();
  return stamps.length > LIMITS.requestsPerMinute;
};

export default async (req) => {
  if (req.method !== 'POST') {
    return json(405, { success: false, error: 'Method not allowed' });
  }

  const ip = req.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (throttled(ip)) {
    return json(429, {
      success: false,
      error: 'Too many image requests. Please wait a moment.',
      code: 'RATE_LIMITED',
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: 'Invalid JSON body' });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return json(400, { success: false, error: 'No prompt provided' });
  if (prompt.length > LIMITS.maxPromptChars) {
    return json(413, { success: false, error: 'Prompt too long' });
  }

  const userKeys = body.keys && typeof body.keys === 'object' ? body.keys : {};
  const requested = resolveImageModelId(body.model);

  const attempts = [];
  if (isImageProviderEnabled(requested.provider, userKeys)) {
    attempts.push({ providerId: requested.provider, model: requested.model });
  }
  if (requested.provider !== DEFAULT_IMAGE_PROVIDER) {
    attempts.push({ providerId: DEFAULT_IMAGE_PROVIDER, model: null, fallback: true });
  }

  if (!attempts.length) {
    return json(503, {
      success: false,
      error: 'No image provider is configured.',
      code: 'NO_PROVIDER',
    });
  }

  let lastError = 'Image generation failed';

  for (const attempt of attempts) {
    const provider = IMAGE_PROVIDERS[attempt.providerId];

    try {
      const result = await provider.generate({
        prompt: prompt.slice(0, LIMITS.maxPromptChars),
        model: attempt.model,
        width: body.width,
        height: body.height,
        seed: body.seed,
        key: getImageKey(attempt.providerId, userKeys),
        accountId: provider.accountEnvKey ? process.env[provider.accountEnvKey] : null,
      });

      return json(200, {
        success: true,
        url: result.url,
        persistable: result.persistable,
        provider: attempt.providerId,
        model: `${attempt.providerId}:${result.model}`,
        fallback: !!attempt.fallback,
      });
    } catch (error) {
      lastError = error.name === 'TimeoutError' ? 'Image provider timed out' : error.message;
    }
  }

  return json(502, { success: false, error: lastError, code: 'UPSTREAM_FAILED' });
};
