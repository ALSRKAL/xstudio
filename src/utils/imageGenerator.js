// Image Generation utilities with Arabic translation support

import { translateToEnglish } from '../services/aiClient';
import { APP_CONFIG } from '../config/api';

/**
 * Detects if text contains Arabic characters
 */
export const hasArabicText = (text) => {
  return /[\u0600-\u06FF]/.test(text);
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

/**
 * Generates optimized image URL with enhanced parameters
 */
export const generateImageUrl = (prompt, seed = null) => {
  const { baseUrl, width, height, model, nologo, enhance } = APP_CONFIG.images;
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model,
    seed: String(seed || Date.now()),
    nologo: String(nologo),
    enhance: String(enhance),
  });

  return `${baseUrl}/${encodeURIComponent(prompt)}?${params.toString()}`;
};

/**
 * Main function to process and generate image
 * Handles Arabic translation silently
 */
export const processImageGeneration = async (userPrompt) => {
  try {
    let finalPrompt = userPrompt;
    
    // Step 1: Translate if Arabic (silent)
    if (hasArabicText(userPrompt)) {
      finalPrompt = await translateArabicToEnglish(userPrompt);
    }
    
    // Step 2: Enhance prompt with quality descriptors
    finalPrompt = enhanceImagePrompt(finalPrompt);
    
    // Step 3: Generate image URL
    const imageUrl = generateImageUrl(finalPrompt);
    
    return {
      success: true,
      imageUrl,
      originalPrompt: userPrompt,
      processedPrompt: finalPrompt,
      wasTranslated: hasArabicText(userPrompt),
    };
  } catch (error) {
    console.error('❌ Image generation error:', error);
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
