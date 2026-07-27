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
  contactUrl: 'https://www.alsrkal.com/',

  // Backend function endpoints. Keep in one place only.
  endpoints: {
    chat: '/.netlify/functions/chat',
    models: '/.netlify/functions/models',
    image: '/.netlify/functions/image',
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
    width: 1024,
    height: 1024,
    // Direct keyless URL used when the backend function is unavailable.
    fallbackBaseUrl: 'https://image.pollinations.ai/prompt',
    fallbackModel: 'sana',
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
// `envKey` is the environment variable the backend function reads.
// `signupUrl` documents where administrators can create provider keys.
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

// OpenRouter first: one key unlocks the whole free catalogue.
export const PROVIDER_ORDER = [
  'openrouter', 'groq', 'gemini', 'cerebras', 'mistral',
  'github', 'nvidia', 'together', 'llm7',
];

// ---------------------------------------------------------------------------
// Image providers
// ---------------------------------------------------------------------------
// Mirrors PROVIDERS. `envKeys` lists every variable the server needs.
// ---------------------------------------------------------------------------
export const IMAGE_PROVIDERS = {
  pollinations: {
    id: 'pollinations',
    label: 'Pollinations',
    color: '#8b5cf6',
    keyless: true,
    envKeys: [],
    signupUrl: 'https://pollinations.ai',
    freeTier: { ar: 'مجاني بدون مفتاح', en: 'Free, no key required' },
  },
  cloudflare: {
    id: 'cloudflare',
    label: 'Cloudflare Workers AI',
    color: '#f6821f',
    envKeys: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
    signupUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    freeTier: {
      ar: 'FLUX.1 schnell بحصة يومية مجانية',
      en: 'FLUX.1 schnell with a free daily allowance',
    },
  },
  together: {
    id: 'together',
    label: 'Together AI',
    color: '#0f6fff',
    envKeys: ['TOGETHER_API_KEY'],
    signupUrl: 'https://api.together.xyz/settings/api-keys',
    freeTier: { ar: 'نقطة FLUX.1 schnell المجانية', en: 'Free FLUX.1 schnell endpoint' },
  },
};

export const IMAGE_PROVIDER_ORDER = ['pollinations', 'cloudflare', 'together'];

export const DEFAULT_IMAGE_MODEL = 'pollinations:sana';

const LEGACY_IMAGE_MODEL_MAP = {
  'pollinations:flux': DEFAULT_IMAGE_MODEL,
  flux: DEFAULT_IMAGE_MODEL,
};

export const normalizeImageModelId = (modelId) => {
  if (!modelId) return DEFAULT_IMAGE_MODEL;
  if (LEGACY_IMAGE_MODEL_MAP[modelId]) return LEGACY_IMAGE_MODEL_MAP[modelId];
  return modelId.includes(':') ? modelId : `pollinations:${modelId}`;
};

/** Display metadata for an image model id */
export const buildImageModelMeta = (canonicalId) => {
  const normalized = normalizeImageModelId(canonicalId);
  const separator = normalized.indexOf(':');
  const provider = normalized.slice(0, separator);
  const model = normalized.slice(separator + 1);
  const info = IMAGE_PROVIDERS[provider] || IMAGE_PROVIDERS.pollinations;

  return {
    id: normalized,
    rawId: model,
    provider,
    providerLabel: info.label,
    color: info.color,
    keyless: !!info.keyless,
    name: prettifyModelName(model),
    kind: 'image',
  };
};

export const FALLBACK_IMAGE_MODELS = [DEFAULT_IMAGE_MODEL];

// ---------------------------------------------------------------------------
// Model identity helpers  (canonical id = "provider:model")
// ---------------------------------------------------------------------------

export const DEFAULT_PROVIDER = 'openrouter';

// Strongest free model in the catalogue: 1M context, 550B MoE.
export const DEFAULT_MODEL = 'openrouter:nvidia/nemotron-3-ultra-550b-a55b:free';

/** Keyless emergency provider: never listed, used only if everything else fails */
export const EMERGENCY_MODEL = 'llm7:gemini-3.1-flash-lite';

const LEGACY_MODEL_MAP = {
  base: DEFAULT_MODEL,
  'pollinations:openai': DEFAULT_MODEL,
  'pollinations:openai-fast': DEFAULT_MODEL,
  'llama-3.3-70b-versatile': 'groq:llama-3.3-70b-versatile',
  'llama-3.1-8b-instant': 'groq:llama-3.1-8b-instant',
};

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

/** Vendor prefix of an OpenRouter-style id, e.g. "nvidia/nemotron..." */
const VENDOR_LABELS = {
  nvidia: 'NVIDIA',
  openai: 'OpenAI',
  google: 'Google',
  cohere: 'Cohere',
  poolside: 'poolside',
  inclusionai: 'InclusionAI',
  meta: 'Meta',
  'meta-llama': 'Meta',
  mistralai: 'Mistral AI',
  qwen: 'Qwen',
  deepseek: 'DeepSeek',
  moonshotai: 'Moonshot AI',
  'z-ai': 'Z.ai',
  openrouter: 'OpenRouter',
  bytedance: 'ByteDance',
  'bytedance-seed': 'ByteDance',
  xai: 'xAI',
  'black-forest-labs': 'Black Forest Labs',
};

export const getVendorLabel = (rawModel = '') => {
  if (!rawModel.includes('/')) return null;
  const vendor = rawModel.split('/')[0].toLowerCase();
  return VENDOR_LABELS[vendor] || vendor.replace(/(^|[-_])(\w)/g, (_, s, c) => s + c.toUpperCase());
};

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

  // Capabilities reported by the provider always beat the id heuristics.
  if (extra.vision) vision = true;
  if (extra.reasoning && !tags.includes('reasoning')) tags.push('reasoning');
  if (extra.tools && !tags.includes('tools')) tags.push('tools');

  const speedRule = SPEED_RULES.find((rule) => rule.match.test(model));
  const sizeMatch = model.match(SIZE_RE);

  return {
    id: `${provider}:${model}`,
    rawId: model,
    provider,
    providerLabel: providerInfo.label,
    vendor: getVendorLabel(model),
    name: extra.label || prettifyModelName(model),
    description: extra.description || null,
    color: providerInfo.color,
    keyless: !!providerInfo.keyless,
    speed: speedRule ? speedRule.speed : 'medium',
    size: sizeMatch ? `${sizeMatch[1]}B` : null,
    vision,
    tags,
    contextWindow: extra.contextWindow || null,
    maxOutput: extra.maxOutput || null,
    free: extra.free !== undefined ? extra.free : true,
  };
};

/**
 * Offline catalog. Used when the backend model discovery is unavailable
 * (local `npm start`, network error). Discovery at runtime is authoritative.
 */
/**
 * Offline catalogue: the free OpenRouter models verified against the live
 * /models endpoint. Runtime discovery is authoritative and replaces this list,
 * so it only has to keep the picker usable without a network round trip.
 */
export const FALLBACK_MODELS = [
  buildModelMeta('openrouter:nvidia/nemotron-3-ultra-550b-a55b:free', {
    contextWindow: 1000000,
    reasoning: true,
  }),
  buildModelMeta('openrouter:nvidia/nemotron-3-super-120b-a12b:free', {
    contextWindow: 262144,
    reasoning: true,
  }),
  buildModelMeta('openrouter:inclusionai/ling-3.0-flash:free', { contextWindow: 262144 }),
  buildModelMeta('openrouter:poolside/laguna-m.1:free', { contextWindow: 262144 }),
  buildModelMeta('openrouter:poolside/laguna-s-2.1:free', { contextWindow: 262144 }),
  buildModelMeta('openrouter:poolside/laguna-xs-2.1:free', { contextWindow: 262144 }),
  buildModelMeta('openrouter:google/gemma-4-31b-it:free', {
    contextWindow: 262144,
    vision: true,
  }),
  buildModelMeta('openrouter:google/gemma-4-26b-a4b-it:free', {
    contextWindow: 262144,
    vision: true,
  }),
  buildModelMeta('openrouter:cohere/north-mini-code:free', { contextWindow: 256000 }),
  buildModelMeta('openrouter:nvidia/nemotron-3-nano-30b-a3b:free', { contextWindow: 256000 }),
  buildModelMeta('openrouter:nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', {
    contextWindow: 256000,
    vision: true,
    reasoning: true,
  }),
  buildModelMeta('openrouter:openrouter/free', { contextWindow: 200000, vision: true }),
  buildModelMeta('openrouter:openai/gpt-oss-20b:free', { contextWindow: 131072 }),
  buildModelMeta('openrouter:nvidia/nemotron-nano-12b-v2-vl:free', {
    contextWindow: 128000,
    vision: true,
  }),
  buildModelMeta('openrouter:nvidia/nemotron-nano-9b-v2:free', { contextWindow: 128000 }),
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
