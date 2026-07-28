// ============================================================================
// Server-side image provider registry.
// ----------------------------------------------------------------------------
// Each provider exposes the same contract:
//   generate(ctx) -> { url, persistable, model }
// `persistable` marks a stable remote URL that can be re-fetched later; data
// URLs are session-only because they are far too large for chat history.
//
// Adding a provider = one entry here + one entry in src/config/api.js.
// ============================================================================

const clampSize = (value, fallback) => {
  const n = Number(value) || fallback;
  return Math.min(Math.max(Math.round(n / 64) * 64, 256), 1536);
};

/** Upstream samplers validate the seed as a signed 32-bit int */
export const MAX_SEED = 2147483647;

/**
 * Millisecond timestamps overflow the 32-bit seed range and make the upstream
 * reject the whole request, so every seed is normalised here.
 */
export const normalizeSeed = (seed) => {
  const n = Number(seed);
  if (!Number.isFinite(n) || n < 0) return Math.floor(Math.random() * MAX_SEED);
  return Math.floor(n) % (MAX_SEED + 1);
};

const readError = async (response, label) => {
  let detail = '';
  try {
    detail = (await response.text()).slice(0, 240);
  } catch {
    /* ignore */
  }
  return new Error(`${label} ${response.status}${detail ? `: ${detail}` : ''}`);
};

export const IMAGE_PROVIDERS = {
  // --- keyless -------------------------------------------------------------
  pollinations: {
    envKey: null,
    keyless: true,
    modelsUrl: 'https://image.pollinations.ai/models',
    defaultModel: 'sana',
    parseModels: (data) => (Array.isArray(data) ? data : data?.models || []).filter(Boolean),

    // Deterministic URL: no proxying needed and the browser can cache it.
    async generate({ prompt, model, width, height, seed }) {
      const params = new URLSearchParams({
        width: String(clampSize(width, 1024)),
        height: String(clampSize(height, 1024)),
        model: model || 'sana',
        seed: String(normalizeSeed(seed)),
        nologo: 'true',
        referrer: 'x-studio',
      });
      // `enhance` is deliberately omitted: it rewrites the prompt with an LLM
      // upstream, which is both slower and an extra failure point. Prompts are
      // already enriched client-side in utils/imageGenerator.js.

      return {
        url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`,
        persistable: true,
        model: model || 'sana',
      };
    },
  },

  // --- Cloudflare Workers AI (free daily allocation) -----------------------
  cloudflare: {
    envKey: 'CLOUDFLARE_API_TOKEN',
    accountEnvKey: 'CLOUDFLARE_ACCOUNT_ID',
    defaultModel: '@cf/black-forest-labs/flux-1-schnell',
    staticModels: [
      '@cf/black-forest-labs/flux-1-schnell',
      '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      '@cf/bytedance/stable-diffusion-xl-lightning',
    ],

    async generate({ prompt, model, key, accountId, seed }) {
      if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID is not configured');

      const target = model || this.defaultModel;
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${target}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, seed: normalizeSeed(seed) }),
          signal: AbortSignal.timeout(90000),
        }
      );

      if (!response.ok) throw await readError(response, 'Cloudflare');

      const contentType = response.headers.get('content-type') || '';

      // Newer models stream raw image bytes, flux-schnell returns base64 JSON.
      if (!contentType.includes('application/json')) {
        const buffer = Buffer.from(await response.arrayBuffer());
        return {
          url: `data:${contentType || 'image/png'};base64,${buffer.toString('base64')}`,
          persistable: false,
          model: target,
        };
      }

      const data = await response.json();
      const base64 = data?.result?.image;
      if (!base64) throw new Error('Cloudflare returned no image');

      return {
        url: `data:image/jpeg;base64,${base64}`,
        persistable: false,
        model: target,
      };
    },
  },

  // --- Together AI (free FLUX endpoint) ------------------------------------
  together: {
    envKey: 'TOGETHER_API_KEY',
    defaultModel: 'black-forest-labs/FLUX.1-schnell-Free',
    staticModels: [
      'black-forest-labs/FLUX.1-schnell-Free',
      'black-forest-labs/FLUX.1-schnell',
    ],

    async generate({ prompt, model, key, width, height, seed }) {
      const target = model || this.defaultModel;
      const response = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: target,
          prompt,
          width: clampSize(width, 1024),
          height: clampSize(height, 1024),
          steps: 4,
          n: 1,
          seed: seed === undefined ? undefined : normalizeSeed(seed),
          response_format: 'url',
        }),
        signal: AbortSignal.timeout(90000),
      });

      if (!response.ok) throw await readError(response, 'Together');

      const data = await response.json();
      const item = data?.data?.[0];

      if (item?.url) return { url: item.url, persistable: true, model: target };
      if (item?.b64_json) {
        return { url: `data:image/png;base64,${item.b64_json}`, persistable: false, model: target };
      }
      throw new Error('Together returned no image');
    },
  },
};

export const DEFAULT_IMAGE_PROVIDER = 'pollinations';

/** BYOK wins over the server env var */
export const getImageKey = (providerId, userKeys = {}) => {
  const provider = IMAGE_PROVIDERS[providerId];
  if (!provider) return null;
  const userKey = userKeys?.[providerId];
  if (typeof userKey === 'string' && userKey.trim()) return userKey.trim();
  return provider.envKey ? process.env[provider.envKey] || null : null;
};

export const isImageProviderEnabled = (providerId, userKeys = {}) => {
  const provider = IMAGE_PROVIDERS[providerId];
  if (!provider) return false;
  if (provider.keyless) return true;
  if (!getImageKey(providerId, userKeys)) return false;
  // Cloudflare additionally needs the account id.
  if (provider.accountEnvKey && !process.env[provider.accountEnvKey]) return false;
  return true;
};

export const getEnabledImageProviders = (userKeys = {}) =>
  Object.keys(IMAGE_PROVIDERS).filter((id) => isImageProviderEnabled(id, userKeys));

export const resolveImageModelId = (modelId) => {
  if (!modelId || typeof modelId !== 'string') {
    return { provider: DEFAULT_IMAGE_PROVIDER, model: null };
  }
  const separator = modelId.indexOf(':');
  if (separator === -1) return { provider: DEFAULT_IMAGE_PROVIDER, model: modelId };

  const provider = modelId.slice(0, separator);
  const model = modelId.slice(separator + 1);
  if (!IMAGE_PROVIDERS[provider]) return { provider: DEFAULT_IMAGE_PROVIDER, model: modelId };
  return { provider, model };
};
