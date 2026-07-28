import { fetchAvailableModels } from './aiClient';
import { processImageGeneration } from '../utils/imageGenerator';
import { DIRECT_FALLBACK_MODELS } from '../config/api';

const originalOverride = process.env.REACT_APP_USE_BACKEND_FUNCTIONS;

describe('frontend-only local fallbacks', () => {
  beforeEach(() => {
    process.env.REACT_APP_USE_BACKEND_FUNCTIONS = 'false';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalOverride === undefined) delete process.env.REACT_APP_USE_BACKEND_FUNCTIONS;
    else process.env.REACT_APP_USE_BACKEND_FUNCTIONS = originalOverride;
  });

  it('uses the offline model catalogue without requesting a missing function', async () => {
    const result = await fetchAvailableModels();
    expect(result).toEqual({ models: DIRECT_FALLBACK_MODELS, imageModels: [], live: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('builds a direct image URL without requesting a missing function', async () => {
    const result = await processImageGeneration('a blue mountain at sunrise', { seed: 7 });
    expect(result.success).toBe(true);
    expect(result.fallback).toBe(true);
    expect(result.provider).toBe('pollinations');
    expect(result.imageUrl).toContain('image.pollinations.ai');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});