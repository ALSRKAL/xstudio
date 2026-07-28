// Image Generation utilities with Arabic translation support

import { translateToEnglish } from '../services/aiClient';
import {
  APP_CONFIG,
  DEFAULT_IMAGE_MODEL,
  normalizeImageModelId,
  shouldUseBackendFunctions,
} from '../config/api';
import { getApiKeys } from './apiKeys';

/**
 * Detects if text contains Arabic characters
 */
export const hasArabicText = (text) => {
  return /[\u0600-\u06FF]/.test(text);
};

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------
// One composer serves text and images, so the router has to be generous with
// real phrasing yet strict about look-alikes (explain this photo, how do I
// design a logo, build me a landing page).

const IMAGE_OBJECTS_EN = '(?:images?|photos?|pictures?|pics?|logos?|posters?|avatars?|wallpapers?|illustrations?|artworks?|drawings?|paintings?|sketch(?:es)?|thumbnails?|banners?|mockups?|portraits?|graphics?|icons?)';
const IMAGE_ACTIONS_EN = '(?:generate|create|draw|make|design|render|produce|paint|sketch|imagine|illustrate|visuali[sz]e|show me|give me)';
const IMAGE_OBJECTS_AR = '(?:صورة|صوره|صور|صوراً|صورا|صورتين|شعار|شعاراً|شعارا|لوجو|بوستر|بوستراً|ملصق|خلفية|خلفيه|افاتار|أفاتار|رسم|رسمة|رسمه|رسمات|لوحة|لوحه|بورتريه|ايقونة|أيقونة|بانر|غلاف)';
const IMAGE_ACTIONS_AR = '(?:انشئ|أنشئ|انشىء|أنشىء|ولد|ولّد|ارسم|إرسم|ارسملي|صمم|صمّم|اعمل|إعمل|اصنع|إصنع|سوي|سوّي|اعطني|أعطني|اعطيني|هات|جيب|انتج|أنتج|صور|صوّر)';
const IMAGE_WANTS_AR = '(?:اريد|أريد|ابغى|أبغى|بدي|ابي|أبي|ودي|عايز|عاوز|محتاج|ممكن|لو سمحت|من فضلك|رجاء|أرجو)';

const normalizeIntentText = (text) => String(text || '')
  .normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Explicit slash command, so the router can always be overridden by hand.
 * `/image a red fox` and `/صورة ثعلب أحمر` both force the image path.
 */
const IMAGE_COMMAND_RE = /^\/(?:image|images|img|imagine|pic|draw|صورة|صوره|صور|ارسم|رسم)(?:\s+|$)/i;

/**
 * @returns {{forced: boolean, prompt: string}} prompt has the command stripped
 */
export const parseImageCommand = (text) => {
  const value = String(text || '');
  const match = value.match(IMAGE_COMMAND_RE);
  if (!match) return { forced: false, prompt: value.trim() };
  return { forced: true, prompt: value.slice(match[0].length).trim() };
};

/**
 * Requests that mention visual words but clearly want text or a runnable
 * project. Checked before any positive rule.
 */
const isVisualLookAlike = (value, lower) => {
  const asksHowTo = new RegExp(`\\b(?:how (?:do|can|would) (?:i|we|you)|how to|what(?:'s| is) the best way to)\\b.{0,56}\\b${IMAGE_ACTIONS_EN}\\b.{0,40}\\b${IMAGE_OBJECTS_EN}\\b`, 'i');
  const analyzesImage = /\b(?:explain|analy[sz]e|describe|identify|summari[sz]e|review|caption|read|translate|what(?:'s| is) in)\b.{0,44}\b(?:this|that|the|my|an?)?\s*(?:image|photo|picture|screenshot)\b/i;
  const asksHowToArabic = new RegExp(`(?:كيف|كيفية|ما طريقة|اشرح طريقة|شرح طريقة|ما هي افضل طريقة).{0,56}${IMAGE_ACTIONS_AR}.{0,40}${IMAGE_OBJECTS_AR}`);
  const analyzesImageArabic = /(?:اشرح|حلل|حلّل|صف|وصف|ما في|ماذا في|ما يوجد|تعرف على|اقرا|اقرأ|ترجم).{0,44}(?:الصورة|هذه الصورة|هذي الصورة|صوره|الصور|اللقطة)/;
  const buildsArtifact = new RegExp(
    `(?:${IMAGE_ACTIONS_AR}|ابن|ابني|طور|طوّر|برمج|اكتب)`
    + '.{0,44}'
    + '(?:موقع|تطبيق|واجهة|صفحة ويب|صفحه|لوحة تحكم|كود|برنامج|سكربت|دالة|مكون|قاعدة بيانات|جدول|خطة|سيرة ذاتية|عرض تقديمي|مقال|تقرير|ايميل|بريد)'
  );
  const buildsArtifactEn = /\b(?:build|create|design|develop|code|write|implement)\b.{0,44}\b(?:website|web ?app|web ?page|landing page|dashboard|user interface|ui|component|api|script|function|database|table|resume|cv|article|report|email|essay)\b/i;

  // Charts and diagrams are data work, not generative art.
  const wantsChart = /\b(?:chart|graph|diagram|flow ?chart|plot|schema)\b/i.test(lower)
    || /(?:رسم بياني|مخطط|بياني|دياجرام|انفوجرافيك)/.test(value);

  return asksHowTo.test(lower)
    || analyzesImage.test(lower)
    || asksHowToArabic.test(value)
    || analyzesImageArabic.test(value)
    || buildsArtifact.test(value)
    || buildsArtifactEn.test(lower)
    || wantsChart;
};

/**
 * Detects an explicit request to create visual content. Explanation, analysis,
 * how-to questions and website/app requests stay in the text/artifact path.
 *
 * @param {string} text raw composer value
 * @param {{hasImageContext?: boolean}} options `hasImageContext` enables
 *   short follow-up edits ("make it darker") to stay on the image path.
 * @returns {boolean}
 */
export const detectImageGenerationIntent = (text, { hasImageContext = false } = {}) => {
  const value = normalizeIntentText(text);
  if (!value) return false;

  // An explicit command wins over every heuristic below.
  if (IMAGE_COMMAND_RE.test(value)) return true;

  const lower = value.toLowerCase();
  if (isVisualLookAlike(value, lower)) return false;

  // action + object: "generate a logo for ...", "صمم لي شعار ..."
  const englishExplicit = new RegExp(`\\b${IMAGE_ACTIONS_EN}\\b.{0,72}\\b${IMAGE_OBJECTS_EN}\\b`, 'i');
  const arabicExplicit = new RegExp(`${IMAGE_ACTIONS_AR}.{0,72}${IMAGE_OBJECTS_AR}`);

  // "i want an image of ...", "أريد صورة لـ ..."
  const englishWants = new RegExp(`\\b(?:i want|i need|can you|could you|would you|please)\\b.{0,32}\\b${IMAGE_OBJECTS_EN}\\b`, 'i');
  const arabicWants = new RegExp(`${IMAGE_WANTS_AR}.{0,32}${IMAGE_OBJECTS_AR}`);

  // Bare drawing verbs: "draw a fox", "ارسم ثعلب"
  const englishVerbFirst = /^(?:please\s+)?(?:draw|paint|sketch|render|imagine)(?:\s|$)/i;
  const arabicVerbFirst = /^(?:من فضلك\s+|لو سمحت\s+)?(?:ارسم|إرسم|ارسملي|ولد|ولّد|صور|صوّر)(?:\s|لي|ني|$)/;

  // Noun-first prompts: "a picture of a red fox", "صورة ثعلب أحمر".
  // Questions are excluded here: "ما هذه الصورة؟" must stay text.
  const isQuestion = /[?؟]\s*$/.test(value);
  const englishNounFirst = new RegExp(`^(?:an?\\s+|the\\s+)?${IMAGE_OBJECTS_EN}\\s+(?:of|for|showing|with|about)\\b`, 'i');
  const arabicNounFirst = new RegExp(`^${IMAGE_OBJECTS_AR}\\s+\\S`);
  const nounFirst = !isQuestion && (englishNounFirst.test(lower) || arabicNounFirst.test(value));

  // "text to image" style phrasing
  const englishTextToImage = /\btext[ -]?to[ -]?image\b|\bai (?:art|image)\b/i;

  // Short follow-ups only make sense right after an image was produced.
  const contextualEdit = hasImageContext && (
    /^(?:make|change|turn|add|remove|replace|edit|modify|another|again|same|now)\b/i.test(lower)
    || /^(?:عدل|عدّل|غير|غيّر|اجعل|اجعلها|حول|حوّل|اضف|أضف|احذف|شيل|كبر|صغر|زد|قلل|نفس|مرة اخرى|مره اخرى|كمان|وحدة ثانية|واحدة ثانية)(?:\s|ها|ه|لي|$)/.test(value)
  );

  return englishExplicit.test(lower)
    || arabicExplicit.test(value)
    || englishWants.test(lower)
    || arabicWants.test(value)
    || englishVerbFirst.test(lower)
    || arabicVerbFirst.test(value)
    || englishTextToImage.test(lower)
    || nounFirst
    || contextualEdit;
};

/**
 * Translates non-English prompts to English through the unified AI client.
 * Never throws: falls back to the original text so generation always proceeds.
 */
export const translateArabicToEnglish = async (arabicText) => {
  try {
    const translation = (await translateToEnglish(arabicText))
      // drop any Arabic that leaked into the answer
      .replace(/[\u0600-\u06FF]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return translation.length >= 3 ? translation : arabicText;
  } catch (error) {
    console.error('Translation failed, using original prompt:', error);
    return arabicText;
  }
};

/**
 * Enhances image prompts with quality descriptors
 */
export const enhanceImagePrompt = (prompt) => {
  // Check existing quality descriptors
  const hasQuality = /\b(high quality|detailed|professional|4k|8k|hd|uhd|masterpiece|best quality|ultra detailed)\b/i.test(prompt);
  const hasStyle = /\b(realistic|photorealistic|hyperrealistic|digital art|oil painting|watercolor|anime|cartoon|3d render|cinematic|illustration)\b/i.test(prompt);
  const hasLighting = /\b(lighting|light|shadow|bright|dark|sunset|sunrise|golden hour|studio light|natural light|dramatic light)\b/i.test(prompt);
  const hasCameraAngle = /\b(close-up|wide angle|aerial view|bird's eye|low angle|high angle|macro|panoramic)\b/i.test(prompt);
  
  let enhanced = prompt;
  
  // Add quality if missing
  if (!hasQuality) {
    enhanced += ', high quality, detailed, 8k';
  }
  
  // Add style for short prompts
  if (!hasStyle && prompt.split(' ').length < 8) {
    // Detect if it's a portrait/person
    if (/\b(person|man|woman|girl|boy|face|portrait|people)\b/i.test(prompt)) {
      enhanced += ', professional photography';
    } else if (/\b(art|painting|drawing|sketch)\b/i.test(prompt)) {
      enhanced += ', digital art';
    } else {
      enhanced += ', photorealistic';
    }
  }
  
  // Add lighting for portraits
  if (!hasLighting && /\b(person|man|woman|girl|boy|face|portrait)\b/i.test(prompt)) {
    enhanced += ', perfect lighting';
  }
  
  // Add camera angle for scenes
  if (!hasCameraAngle && /\b(landscape|city|building|mountain|ocean|forest|scene)\b/i.test(prompt)) {
    enhanced += ', wide angle';
  }
  
  return enhanced;
};

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------

/** Upstream samplers validate the seed as a signed 32-bit int */
export const MAX_SEED = 2147483647;

/**
 * Single source of truth for image seeds. `Date.now()` overflows the 32-bit
 * range the providers accept and makes them reject the whole request, so every
 * seed the app produces goes through here.
 */
export const normalizeSeed = (seed) => {
  const n = Number(seed);
  if (!Number.isFinite(n) || n <= 0) return Math.floor(Math.random() * MAX_SEED);
  return Math.floor(n) % (MAX_SEED + 1);
};

/** Fresh seed for a regenerate, so the next image is genuinely different */
export const randomSeed = () => Math.floor(Math.random() * MAX_SEED);

/**
 * Keyless direct URL, used only when the backend function is unreachable
 * (plain `npm start`). Everything else goes through the image function so that
 * provider keys stay on the server.
 */
export const generateImageUrl = (prompt, seed = null) => {
  const { fallbackBaseUrl, fallbackModel, width, height } = APP_CONFIG.images;
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model: fallbackModel,
    seed: String(normalizeSeed(seed)),
    nologo: 'true',
    referrer: 'x-studio',
  });

  return `${fallbackBaseUrl}/${encodeURIComponent(prompt)}?${params.toString()}`;
};

const directImageResult = (finalPrompt, userPrompt, wasTranslated, seed) => ({
  success: true,
  imageUrl: generateImageUrl(finalPrompt, seed),
  persistable: true,
  provider: 'pollinations',
  model: DEFAULT_IMAGE_MODEL,
  fallback: true,
  originalPrompt: userPrompt,
  processedPrompt: finalPrompt,
  wasTranslated,
});

/**
 * Translate (if needed), enrich, then generate through the backend so provider
 * keys never reach the browser.
 *
 * @returns {Promise<{success: boolean, imageUrl?: string, persistable?: boolean,
 *   model?: string, provider?: string, fallback?: boolean, error?: string}>}
 */
export const processImageGeneration = async (userPrompt, options = {}) => {
  const wasTranslated = hasArabicText(userPrompt);

  try {
    let finalPrompt = wasTranslated
      ? await translateArabicToEnglish(userPrompt)
      : userPrompt;

    finalPrompt = enhanceImagePrompt(finalPrompt);

    if (!shouldUseBackendFunctions()) {
      return directImageResult(finalPrompt, userPrompt, wasTranslated, options.seed);
    }

    const response = await fetch(APP_CONFIG.endpoints.image, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: finalPrompt,
        model: normalizeImageModelId(options.model),
        width: options.width || APP_CONFIG.images.width,
        height: options.height || APP_CONFIG.images.height,
        seed: options.seed,
        keys: getApiKeys(),
      }),
    });

    // Backend function missing: keyless direct URL.
    if (response.status === 404 || response.status === 405) {
      return directImageResult(finalPrompt, userPrompt, wasTranslated, options.seed);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Image request failed (${response.status})`);
    }

    return {
      success: true,
      imageUrl: data.url,
      persistable: data.persistable !== false,
      provider: data.provider,
      model: data.model,
      fallback: !!data.fallback,
      originalPrompt: userPrompt,
      processedPrompt: finalPrompt,
      wasTranslated,
    };
  } catch (error) {
    console.error('Image generation error:', error);
    return {
      success: false,
      error: error.message,
      originalPrompt: userPrompt,
    };
  }
};

/**
 * Validates image prompt
 */
export const validateImagePrompt = (prompt) => {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: 'Prompt cannot be empty' };
  }
  
  if (prompt.trim().length < 3) {
    return { valid: false, error: 'Prompt is too short' };
  }
  
  if (prompt.length > 1000) {
    return { valid: false, error: 'Prompt is too long (max 1000 characters)' };
  }
  
  return { valid: true };
};

/**
 * Suggests improvements for image prompts
 */
export const suggestPromptImprovements = (prompt) => {
  const suggestions = [];
  
  if (prompt.split(' ').length < 5) {
    suggestions.push('Add more descriptive details for better results');
  }
  
  if (!/\b(color|colour)\b/i.test(prompt)) {
    suggestions.push('Consider adding color descriptions');
  }
  
  if (!/\b(style|art)\b/i.test(prompt)) {
    suggestions.push('Specify an artistic style (realistic, cartoon, etc.)');
  }
  
  return suggestions;
};
