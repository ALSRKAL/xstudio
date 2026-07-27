// ============================================================================
// X Studio - Model discovery (Netlify Function v2)
// ----------------------------------------------------------------------------
// Returns the models that are actually available right now for every provider
// that has a key (server env var or a key the user pasted in Settings).
// Keeps the UI correct when providers add or retire models, so no model id is
// ever hardcoded in the frontend.
// ============================================================================

import { PROVIDERS, getEnabledProviders, buildHeaders } from '../lib/providers.mjs';
import {
  IMAGE_PROVIDERS,
  getEnabledImageProviders,
  getImageKey,
} from '../lib/imageProviders.mjs';

const CACHE_TTL_MS = 10 * 60 * 1000;
// Cached per provider set, so BYOK users get their own entry.
const cache = new Map();

const parseDefault = (data) =>
  (data?.data || data?.models || [])
    .map((m) => ({
      id: m.id || m.name,
      contextWindow: m.context_window || m.context_length || m.max_context_length || null,
    }))
    .filter((m) => m.id);

const fetchProviderModels = async (providerId, origin, userKeys) => {
  const provider = PROVIDERS[providerId];
  if (!provider.modelsUrl) return [];

  try {
    const response = await fetch(provider.modelsUrl, {
      headers: buildHeaders(providerId, origin, userKeys),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return [];

    const data = await response.json();
    const parsed = provider.parseModels ? provider.parseModels(data) : parseDefault(data);

    return parsed
      .filter((m) => m.id && !(provider.excludeModels && provider.excludeModels.test(m.id)))
      .map((m) => ({ ...m, id: `${providerId}:${m.id}` }))
      .sort((a, b) => (b.contextWindow || 0) - (a.contextWindow || 0));
  } catch {
    return [];
  }
};

/** Image providers either publish a model list or declare a static one */
const fetchImageModels = async (providerId, userKeys) => {
  const provider = IMAGE_PROVIDERS[providerId];

  if (provider.modelsUrl) {
    try {
      const key = getImageKey(providerId, userKeys);
      const response = await fetch(provider.modelsUrl, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
        signal: AbortSignal.timeout(12000),
      });
      if (response.ok) {
        const data = await response.json();
        const parsed = provider.parseModels ? provider.parseModels(data) : [];
        if (parsed.length) return parsed.map((id) => `${providerId}:${id}`);
      }
    } catch {
      /* fall through to the static list */
    }
  }

  const fallback = provider.staticModels || (provider.defaultModel ? [provider.defaultModel] : []);
  return fallback.map((id) => `${providerId}:${id}`);
};

export default async (req) => {
  let userKeys = {};
  let force = false;

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (body?.keys && typeof body.keys === 'object') userKeys = body.keys;
      force = body?.refresh === true;
    } catch {
      /* ignore malformed body: behave like a plain GET */
    }
  } else {
    force = new URL(req.url).searchParams.get('refresh') === '1';
  }

  const origin = req.headers.get('origin');
  // Hidden providers back the automatic fallback but are never listed.
  const enabled = getEnabledProviders(userKeys).filter((id) => !PROVIDERS[id].hidden);
  const cacheKey = enabled.join(',');
  const cached = cache.get(cacheKey);

  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cached.payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const enabledImage = getEnabledImageProviders(userKeys);

  const [results, imageResults] = await Promise.all([
    Promise.all(
      enabled.map(async (providerId) => ({
        providerId,
        models: await fetchProviderModels(providerId, origin, userKeys),
      }))
    ),
    Promise.all(
      enabledImage.map(async (providerId) => ({
        providerId,
        models: await fetchImageModels(providerId, userKeys),
      }))
    ),
  ]);

  const payload = {
    success: true,
    updatedAt: new Date().toISOString(),
    providers: [
      ...results.map((r) => ({
        id: r.providerId,
        kind: 'text',
        keyless: !!PROVIDERS[r.providerId].keyless,
        modelCount: r.models.length,
      })),
      ...imageResults.map((r) => ({
        id: r.providerId,
        kind: 'image',
        keyless: !!IMAGE_PROVIDERS[r.providerId].keyless,
        modelCount: r.models.length,
      })),
    ],
    models: results.flatMap((r) => r.models),
    imageModels: imageResults.flatMap((r) => r.models.map((id) => ({ id }))),
  };

  if (cache.size > 50) cache.clear();
  cache.set(cacheKey, { at: Date.now(), payload });

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Responses depend on the caller's keys - never cache them publicly.
      'Cache-Control': 'private, no-store',
      'X-Cache': 'MISS',
    },
  });
};
