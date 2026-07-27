// ============================================================================
// X Studio - Model discovery (Netlify Function v2)
// ----------------------------------------------------------------------------
// Returns the models that are actually available right now for every provider
// that has a key (server env var or a key the user pasted in Settings).
// Keeps the UI correct when providers add or retire models, so no model id is
// ever hardcoded in the frontend.
// ============================================================================

import { PROVIDERS, getEnabledProviders, buildHeaders } from '../lib/providers.mjs';

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
      .map((m) => ({ ...m, id: `${providerId}:${m.id}` }));
  } catch {
    return [];
  }
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
  const enabled = getEnabledProviders(userKeys);
  const cacheKey = enabled.join(',');
  const cached = cache.get(cacheKey);

  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cached.payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  const results = await Promise.all(
    enabled.map(async (providerId) => ({
      providerId,
      models: await fetchProviderModels(providerId, origin, userKeys),
    }))
  );

  const payload = {
    success: true,
    updatedAt: new Date().toISOString(),
    providers: results.map((r) => ({
      id: r.providerId,
      keyless: !!PROVIDERS[r.providerId].keyless,
      modelCount: r.models.length,
    })),
    models: results.flatMap((r) => r.models),
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
