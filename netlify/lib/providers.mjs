// ============================================================================
// Server-side provider registry.
// Every provider below speaks the OpenAI Chat Completions protocol, so a single
// code path handles all of them (including SSE streaming).
// Add a provider here + set its env var in Netlify -> it becomes available.
// ============================================================================

export const PROVIDERS = {
  // Keyless provider: works with zero configuration, so the app is never dead
  // on arrival. Models flagged `pro` there need a paid key and are filtered out.
  llm7: {
    baseUrl: 'https://api.llm7.io/v1/chat/completions',
    modelsUrl: 'https://api.llm7.io/v1/models',
    envKey: 'LLM7_API_KEY', // optional: raises the rate limit
    keyless: true,
    parseModels: (data) =>
      (data?.data || [])
        .filter((m) => m.id && m.tier !== 'pro' && (m.model_type || 'chat') === 'chat')
        .map((m) => ({
          id: m.id,
          contextWindow: m.context_length || m.max_context_length || null,
          vision: !!m.vision,
        })),
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    envKey: 'GROQ_API_KEY',
    excludeModels: /whisper|tts|guard|playai|distil|embed/i,
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    envKey: 'OPENROUTER_API_KEY',
    extraHeaders: (origin) => ({
      'HTTP-Referer': origin || 'https://x-studio.netlify.app',
      'X-Title': 'X Studio',
    }),
    // Only surface the genuinely free models.
    parseModels: (data) =>
      (data?.data || [])
        .filter((m) => {
          const p = m?.pricing || {};
          const isFree = Number(p.prompt) === 0 && Number(p.completion) === 0;
          return isFree && typeof m.id === 'string';
        })
        .map((m) => ({
          id: m.id,
          contextWindow: m.context_length || null,
          vision: !!m.architecture?.input_modalities?.includes?.('image'),
        })),
  },
  gemini: {
    // Google exposes an OpenAI-compatible surface.
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/models',
    envKey: 'GEMINI_API_KEY',
    excludeModels: /embedding|aqa|imagen|veo|tts|native-audio|live/i,
  },
  cerebras: {
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    modelsUrl: 'https://api.cerebras.ai/v1/models',
    envKey: 'CEREBRAS_API_KEY',
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    modelsUrl: 'https://api.mistral.ai/v1/models',
    envKey: 'MISTRAL_API_KEY',
    excludeModels: /embed|ocr|moderation/i,
  },
  github: {
    baseUrl: 'https://models.github.ai/inference/chat/completions',
    modelsUrl: 'https://models.github.ai/catalog/models',
    envKey: 'GITHUB_MODELS_TOKEN',
    parseModels: (data) => {
      const list = Array.isArray(data) ? data : data?.data || [];
      return list
        .filter((m) => (m.supported_output_modalities || ['text']).includes('text'))
        .map((m) => ({ id: m.id || m.name, contextWindow: m.limits?.max_input_tokens || null }));
    },
  },
  nvidia: {
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    modelsUrl: 'https://integrate.api.nvidia.com/v1/models',
    envKey: 'NVIDIA_API_KEY',
    excludeModels: /embed|rerank|guard/i,
  },
  together: {
    baseUrl: 'https://api.together.xyz/v1/chat/completions',
    modelsUrl: 'https://api.together.xyz/v1/models',
    envKey: 'TOGETHER_API_KEY',
    parseModels: (data) => {
      const list = Array.isArray(data) ? data : data?.data || [];
      return list
        .filter((m) => m.type === 'chat' || !m.type)
        .map((m) => ({ id: m.id, contextWindow: m.context_length || null }));
    },
  },
};

export const DEFAULT_PROVIDER = 'llm7';
export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';

/** Key for a provider: user supplied (BYOK) wins over the server env var */
export const getProviderKey = (providerId, userKeys = {}) => {
  const provider = PROVIDERS[providerId];
  if (!provider) return null;
  const userKey = userKeys?.[providerId];
  if (typeof userKey === 'string' && userKey.trim()) return userKey.trim();
  return provider.envKey ? process.env[provider.envKey] || null : null;
};

/** Provider is usable when it needs no key, or a key (env or user) exists */
export const isProviderEnabled = (providerId, userKeys = {}) => {
  const provider = PROVIDERS[providerId];
  if (!provider) return false;
  if (provider.keyless) return true;
  return !!getProviderKey(providerId, userKeys);
};

export const getEnabledProviders = (userKeys = {}) =>
  Object.keys(PROVIDERS).filter((id) => isProviderEnabled(id, userKeys));

/** Split "provider:model" into its parts, tolerating legacy plain ids */
export const resolveModelId = (modelId) => {
  if (!modelId || typeof modelId !== 'string') {
    return { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL };
  }
  const separator = modelId.indexOf(':');
  if (separator === -1) {
    return { provider: DEFAULT_PROVIDER, model: modelId };
  }
  const provider = modelId.slice(0, separator);
  const model = modelId.slice(separator + 1);
  if (!PROVIDERS[provider]) {
    // e.g. "deepseek/deepseek-chat:free" sent without a provider prefix
    return { provider: DEFAULT_PROVIDER, model: modelId };
  }
  return { provider, model };
};

export const buildHeaders = (providerId, origin, userKeys = {}) => {
  const provider = PROVIDERS[providerId];
  const headers = { 'Content-Type': 'application/json' };

  const key = getProviderKey(providerId, userKeys);
  if (key) headers.Authorization = `Bearer ${key}`;

  if (provider.extraHeaders) {
    Object.assign(headers, provider.extraHeaders(origin));
  }
  return headers;
};
