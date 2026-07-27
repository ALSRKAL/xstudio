import {
  DEFAULT_MODEL,
  EMERGENCY_MODEL,
  FALLBACK_MODELS,
  buildModelMeta,
  getLimitsForModel,
  getVendorLabel,
  isKeylessModel,
  normalizeModelId,
  prettifyModelName,
  shouldUseBackendFunctions,
  splitModelId,
} from './api';

describe('model id handling', () => {
  it('migrates legacy ids stored by v1', () => {
    expect(normalizeModelId('base')).toBe(DEFAULT_MODEL);
    expect(normalizeModelId('llama-3.3-70b-versatile')).toBe('groq:llama-3.3-70b-versatile');
  });

  it('falls back to the default when nothing is stored', () => {
    expect(normalizeModelId(undefined)).toBe(DEFAULT_MODEL);
    expect(normalizeModelId('')).toBe(DEFAULT_MODEL);
  });

  it('keeps canonical ids untouched, including vendor-prefixed ones', () => {
    expect(normalizeModelId('groq:openai/gpt-oss-120b')).toBe('groq:openai/gpt-oss-120b');
    expect(splitModelId('openrouter:deepseek/deepseek-chat:free')).toEqual({
      provider: 'openrouter',
      model: 'deepseek/deepseek-chat:free',
    });
  });
});

describe('display metadata', () => {
  it('builds readable names', () => {
    expect(prettifyModelName('meta-llama/llama-4-scout-17b-16e-instruct')).toContain('Llama 4 Scout');
    expect(prettifyModelName('deepseek/deepseek-chat:free')).toBe('Deepseek Chat');
  });

  it('derives capabilities from the model id', () => {
    const coder = buildModelMeta('groq:qwen3-coder-32b');
    expect(coder.tags).toContain('code');
    expect(coder.size).toBe('32B');

    const fast = buildModelMeta('groq:llama-3.1-8b-instant');
    expect(fast.speed).toBe('very-fast');

    expect(buildModelMeta('gemini:gemini-2.5-flash').vision).toBe(true);
  });

  it('carries provider identity', () => {
    const meta = buildModelMeta('groq:llama-3.3-70b-versatile');
    expect(meta.provider).toBe('groq');
    expect(meta.providerLabel).toBe('Groq');
    expect(meta.keyless).toBe(false);
  });
});

describe('usage limits', () => {
  it('never limits the keyless emergency provider', () => {
    expect(isKeylessModel(EMERGENCY_MODEL)).toBe(true);
    expect(getLimitsForModel(EMERGENCY_MODEL)).toEqual({
      dailyLimit: Infinity,
      totalLimit: Infinity,
    });
  });

  it('applies finite limits to keyed providers', () => {
    const limits = getLimitsForModel('groq:llama-3.1-8b-instant');
    expect(Number.isFinite(limits.dailyLimit)).toBe(true);
    expect(limits.totalLimit).toBeGreaterThan(0);
  });
});

describe('OpenRouter catalogue', () => {
  it('defaults to a free OpenRouter model', () => {
    expect(DEFAULT_MODEL.startsWith('openrouter:')).toBe(true);
    expect(DEFAULT_MODEL.endsWith(':free')).toBe(true);
  });

  it('keeps the free suffix inside the model id', () => {
    expect(splitModelId(DEFAULT_MODEL).model).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
  });

  it('labels the vendor behind each model', () => {
    expect(getVendorLabel('nvidia/nemotron-3-ultra-550b-a55b:free')).toBe('NVIDIA');
    expect(getVendorLabel('inclusionai/ling-3.0-flash:free')).toBe('InclusionAI');
    expect(getVendorLabel('gemini-2.5-flash')).toBeNull();
  });

  it('ships an offline catalogue of free models only', () => {
    expect(FALLBACK_MODELS.length).toBeGreaterThan(5);
    FALLBACK_MODELS.forEach((model) => {
      expect(model.provider).toBe('openrouter');
      expect(model.contextWindow).toBeGreaterThan(0);
    });
  });

  it('prefers provider-reported capabilities over id guesses', () => {
    const meta = buildModelMeta('openrouter:cohere/north-mini-code:free', {
      label: 'North Mini Code (free)',
      description: 'A coding model.',
      contextWindow: 256000,
      vision: true,
      reasoning: true,
    });

    expect(meta.name).toBe('North Mini Code (free)');
    expect(meta.vendor).toBe('Cohere');
    expect(meta.vision).toBe(true);
    expect(meta.tags).toContain('reasoning');
    expect(meta.tags).toContain('code');
    expect(meta.description).toBe('A coding model.');
  });
});

describe('backend function availability', () => {
  const original = process.env.REACT_APP_USE_BACKEND_FUNCTIONS;

  afterEach(() => {
    if (original === undefined) delete process.env.REACT_APP_USE_BACKEND_FUNCTIONS;
    else process.env.REACT_APP_USE_BACKEND_FUNCTIONS = original;
  });

  it('honours the explicit frontend-only override', () => {
    process.env.REACT_APP_USE_BACKEND_FUNCTIONS = 'false';
    expect(shouldUseBackendFunctions()).toBe(false);
  });

  it('honours the explicit full-stack override', () => {
    process.env.REACT_APP_USE_BACKEND_FUNCTIONS = 'true';
    expect(shouldUseBackendFunctions()).toBe(true);
  });
});