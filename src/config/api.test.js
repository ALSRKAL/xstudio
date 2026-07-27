import {
  DEFAULT_MODEL,
  buildModelMeta,
  getLimitsForModel,
  isKeylessModel,
  normalizeModelId,
  prettifyModelName,
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
  it('never limits keyless providers', () => {
    expect(isKeylessModel(DEFAULT_MODEL)).toBe(true);
    expect(getLimitsForModel(DEFAULT_MODEL)).toEqual({
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
