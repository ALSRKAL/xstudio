// ============================================================================
// X Studio - Central Configuration (Single Source of Truth)
// ----------------------------------------------------------------------------
// Everything global lives here: branding, endpoints, providers, model catalog,
// generation defaults and usage limits. Do NOT hardcode these values anywhere
// else in the app.
// ============================================================================

/** Application branding & global behaviour */
export const APP_CONFIG = {
  name: 'X Studio',
  shortName: 'X',
  version: '2.0.0',
  contactUrl: 'https://alsrkal.netlify.app/',

  // Backend endpoints (Netlify Functions). Keep in one place only.
  endpoints: {
    chat: '/.netlify/functions/chat',
    models: '/.netlify/functions/models',
  },

  // Direct (keyless) fallback used when the backend function is unreachable
  // e.g. during `npm start` without `netlify dev`.
  // Keyless, OpenAI-compatible endpoint called straight from the browser when
  // the Netlify function is unavailable (plain `npm start`, cold deploy).
  fallback: {
    chatUrl: 'https://api.llm7.io/v1/chat/completions',
    model: 'gemini-3.1-flash-lite',
  },


  images: {
    baseUrl: 'https://image.pollinations.ai/prompt',
    width: 1024,
    height: 1024,
    model: 'flux',
    nologo: true,
    enhance: true,
  },

  // Conversation memory sent to the model
  context: {
    maxMessages: 30,
    maxCharsPerMessage: 12000,
  },

  network: {
    timeoutMs: 120000,
    retries: 1,
    retryDelayMs: 800,
  },
};

/** Text generation defaults */
export const GENERATION_DEFAULTS = {
  temperature: 0.7,
  top_p: 0.95,
  max_tokens: 8000,
};

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
// `envKey` is the environment variable the Netlify function reads.
// `signupUrl` is surfaced in Settings so users know where to get a free key.
// ---------------------------------------------------------------------------
export const PROVIDERS = {
  llm7: {
    id: 'llm7',
    label: 'LLM7 (Free)',
    color: '#8b5cf6',
    envKey: 'LLM7_API_KEY',
    keyless: true,
    signupUrl: 'https://llm7.io',
    freeTier: {
      ar: 'يعمل بدون مفتاح — المفتاح المجاني يرفع الحد فقط',
      en: 'Works with no key - a free key only raises the limit',
    },
  },
  groq: {
    id: 'groq',
    label: 'Groq',
    color: '#f55036',
    envKey: 'GROQ_API_KEY',
    signupUrl: 'https://console.groq.com/keys',
    freeTier: { ar: 'طبقة مجانية سريعة جدًا (بدون بطاقة)', en: 'Very fast free tier (no card)' },
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    color: '#6467f2',
    envKey: 'OPENROUTER_API_KEY',
    signupUrl: 'https://openrouter.ai/keys',
    freeTier: { ar: 'عشرات الموديلات المجانية بمفتاح واحد', en: 'Dozens of free models, one key' },
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    color: '#4285f4',
    envKey: 'GEMINI_API_KEY',
    signupUrl: 'https://aistudio.google.com/apikey',
    freeTier: { ar: 'طبقة مجانية سخية من Google AI Studio', en: 'Generous free tier via AI Studio' },
  },
  cerebras: {
    id: 'cerebras',
    label: 'Cerebras',
    color: '#f97316',
    envKey: 'CEREBRAS_API_KEY',
    signupUrl: 'https://cloud.cerebras.ai',
    freeTier: { ar: 'أسرع استجابة مع طبقة مجانية', en: 'Fastest inference, free tier' },
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    color: '#ff7000',
    envKey: 'MISTRAL_API_KEY',
    signupUrl: 'https://console.mistral.ai/api-keys',
    freeTier: { ar: 'طبقة مجانية تجريبية', en: 'Free experiment tier' },
  },
  github: {
    id: 'github',
    label: 'GitHub Models',
    color: '#6e7681',
    envKey: 'GITHUB_MODELS_TOKEN',
    signupUrl: 'https://github.com/settings/tokens',
    freeTier: { ar: 'مجاني عبر GitHub token', en: 'Free with a GitHub token' },
  },
  nvidia: {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    color: '#76b900',
    envKey: 'NVIDIA_API_KEY',
    signupUrl: 'https://build.nvidia.com',
    freeTier: { ar: 'رصيد مجاني للمطورين', en: 'Free developer credits' },
  },
  together: {
    id: 'together',
    label: 'Together AI',
    color: '#0f6fff',
    envKey: 'TOGETHER_API_KEY',
    signupUrl: 'https://api.together.xyz/settings/api-keys',
    freeTier: { ar: 'موديلات مجانية محددة', en: 'Selected free models' },
  },
};

export const PROVIDER_ORDER = [
  'llm7', 'groq', 'gemini', 'cerebras', 'openrouter',
  'mistral', 'github', 'nvidia', 'together',
];

// ---------------------------------------------------------------------------
// Model identity helpers  (canonical id = "provider:model")
// ---------------------------------------------------------------------------

/** Legacy ids stored in localStorage from v1 */
const LEGACY_MODEL_MAP = {
  base: 'llm7:gemini-3.1-flash-lite',
  'pollinations:openai': 'llm7:gemini-3.1-flash-lite',
  'pollinations:openai-fast': 'llm7:gemini-3.1-flash-lite',
  'llama-3.3-70b-versatile': 'groq:llama-3.3-70b-versatile',
  'llama-3.1-8b-instant': 'groq:llama-3.1-8b-instant',
};

export const DEFAULT_PROVIDER = 'llm7';
export const DEFAULT_MODEL = 'llm7:gemini-3.1-flash-lite';

export const normalizeModelId = (modelId) => {
  if (!modelId) return DEFAULT_MODEL;
  if (LEGACY_MODEL_MAP[modelId]) return LEGACY_MODEL_MAP[modelId];
  return modelId.includes(':') ? modelId : `${DEFAULT_PROVIDER}:${modelId}`;
};

export const splitModelId = (modelId) => {
  const normalized = normalizeModelId(modelId);
  const separator = normalized.indexOf(':');
  return {
    provider: normalized.slice(0, separator),
    model: normalized.slice(separator + 1),
  };
};

/** Human readable name derived from a raw model id */
export const prettifyModelName = (rawModel = '') => {
  const withoutVendor = rawModel.split('/').pop().replace(/:free$/, '');
  return withoutVendor
    .replace(/[-_]/g, ' ')
    .replace(/\b(\d+)b\b/gi, (_, n) => `${n}B`)
    .replace(/\bit\b/gi, 'IT')
    .replace(/\boss\b/gi, 'OSS')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

// Heuristics used to decorate any dynamically discovered model.
const CAPABILITY_RULES = [
  { match: /vision|vl|multimodal|scout|maverick|gemini|gpt-4|llava/i, vision: true },
  { match: /coder|codestral|code/i, tags: ['code'] },
  { match: /reason|r1|thinking|o[13]-|qwq/i, tags: ['reasoning'] },
];

const SPEED_RULES = [
  { match: /instant|8b|4b|mini|nano|flash|lite|20b|small/i, speed: 'very-fast' },
  { match: /scout|32b|30b|9b|7b|oss-120b/i, speed: 'fast' },
];

const SIZE_RE = /(\d+(?:\.\d+)?)\s*b\b/i;

/** Build full display metadata for a canonical model id */
export const buildModelMeta = (canonicalId, extra = {}) => {
  const { provider, model } = splitModelId(canonicalId);
  const providerInfo = PROVIDERS[provider] || PROVIDERS[DEFAULT_PROVIDER];

  let vision = false;
  const tags = [];
  CAPABILITY_RULES.forEach((rule) => {
    if (rule.match.test(model)) {
      if (rule.vision) vision = true;
      if (rule.tags) tags.push(...rule.tags);
    }
  });

  const speedRule = SPEED_RULES.find((rule) => rule.match.test(model));
  const sizeMatch = model.match(SIZE_RE);

  return {
    id: `${provider}:${model}`,
    rawId: model,
    provider,
    providerLabel: providerInfo.label,
    name: prettifyModelName(model),
    color: providerInfo.color,
    keyless: !!providerInfo.keyless,
    speed: speedRule ? speedRule.speed : 'medium',
    size: sizeMatch ? `${sizeMatch[1]}B` : null,
    vision,
    tags,
    contextWindow: extra.contextWindow || null,
    free: extra.free !== undefined ? extra.free : true,
    ...extra,
  };
};

/**
 * Offline catalog. Used when the backend model discovery is unavailable
 * (local `npm start`, network error). Discovery at runtime is authoritative.
 */
export const FALLBACK_MODELS = [
  buildModelMeta('llm7:gemini-3.1-flash-lite', {
    speed: 'very-fast',
    recommended: true,
  }),
];

// ---------------------------------------------------------------------------
// Usage limits (per device). Set `enabled: false` to remove all limits.
// ---------------------------------------------------------------------------
export const USAGE_LIMITS = {
  enabled: true,
  cycleDays: 30,
  // Keyless providers are never limited.
  deviceTotal: 500,
  perModelDaily: 100,
  perModelCycle: 500,
};

/** Back-compat export used by older modules */
export const DEVICE_TOTAL_LIMIT = USAGE_LIMITS.deviceTotal;

export const getLimitsForModel = (modelId) => {
  const { provider } = splitModelId(modelId);
  const providerInfo = PROVIDERS[provider];
  if (!USAGE_LIMITS.enabled || providerInfo?.keyless) {
    return { dailyLimit: Infinity, totalLimit: Infinity };
  }
  return {
    dailyLimit: USAGE_LIMITS.perModelDaily,
    totalLimit: USAGE_LIMITS.perModelCycle,
  };
};

/** True when the model runs through a provider that requires no API key */
export const isKeylessModel = (modelId) => {
  const { provider } = splitModelId(modelId);
  return !!PROVIDERS[provider]?.keyless;
};

/** Display metadata for a model id (used across the UI) */
export const getModelInfo = (modelId) => buildModelMeta(modelId);
