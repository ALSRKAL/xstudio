import { fetchAvailableModels } from './aiClient';
import { detectImageGenerationIntent, processImageGeneration } from '../utils/imageGenerator';
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

  it('detects direct image requests without hijacking analysis or website prompts', () => {
    expect(detectImageGenerationIntent('أنشئ لي صورة لمدينة مستقبلية')).toBe(true);
    expect(detectImageGenerationIntent('صمم شعاراً بسيطاً لشركة تقنية')).toBe(true);
    expect(detectImageGenerationIntent('Create an image of a mountain at sunrise')).toBe(true);
    expect(detectImageGenerationIntent('اشرح الصورة المرفقة بالتفصيل')).toBe(false);
    expect(detectImageGenerationIntent('كيف أنشئ صورة بالذكاء الاصطناعي؟')).toBe(false);
    expect(detectImageGenerationIntent('صمم موقعاً احترافياً لشركة')).toBe(false);
    expect(detectImageGenerationIntent('اجعلها أكثر إشراقاً', { hasImageContext: true })).toBe(true);
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