// Context Manager - Smart conversation context handling

/**
 * Analyzes if a message is a continuation or modification of previous context
 * @param {string} currentMessage - The current user message
 * @param {Array} previousMessages - Array of previous messages
 * @returns {Object} - Analysis result with isContextual and contextType
 */
export const analyzeMessageContext = (currentMessage, previousMessages) => {
  if (!currentMessage || !previousMessages || previousMessages.length === 0) {
    return { isContextual: false, contextType: 'new' };
  }

  const lowerMessage = currentMessage.toLowerCase();
  
  // Keywords that indicate continuation or reference to previous context
  const continuationKeywords = {
    ar: [
      'نفس', 'ذلك', 'هذا', 'السابق', 'الأخير', 'أيضا', 'كذلك', 'بالإضافة',
      'و', 'ثم', 'بعد', 'قبل', 'مثل', 'شبيه', 'مشابه'
    ],
    en: [
      'same', 'that', 'this', 'previous', 'last', 'also', 'too', 'additionally',
      'and', 'then', 'after', 'before', 'like', 'similar', 'as well'
    ]
  };

  // Keywords that indicate modification requests
  const modificationKeywords = {
    ar: [
      'غير', 'عدل', 'بدل', 'اجعل', 'أضف', 'احذف', 'أزل', 'حسن', 'طور',
      'مختلف', 'آخر', 'جديد', 'بدون', 'مع', 'أكثر', 'أقل'
    ],
    en: [
      'change', 'modify', 'alter', 'make', 'add', 'remove', 'delete', 'improve', 'enhance',
      'different', 'another', 'new', 'without', 'with', 'more', 'less', 'instead'
    ]
  };

  // Question words that might reference previous context
  const questionKeywords = {
    ar: ['ماذا', 'كيف', 'لماذا', 'متى', 'أين', 'من', 'هل', 'ما'],
    en: ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would']
  };

  // Check for continuation indicators
  const hasContinuation = [
    ...continuationKeywords.ar,
    ...continuationKeywords.en
  ].some(keyword => lowerMessage.includes(keyword));

  // Check for modification indicators
  const hasModification = [
    ...modificationKeywords.ar,
    ...modificationKeywords.en
  ].some(keyword => lowerMessage.includes(keyword));

  // Check for question that might reference context
  const hasQuestion = [
    ...questionKeywords.ar,
    ...questionKeywords.en
  ].some(keyword => lowerMessage.startsWith(keyword) || lowerMessage.includes(` ${keyword} `));

  // Short messages are often contextual
  const isShort = currentMessage.split(' ').length <= 5;

  // Determine context type
  if (hasModification) {
    return { isContextual: true, contextType: 'modification' };
  } else if (hasContinuation || (hasQuestion && isShort)) {
    return { isContextual: true, contextType: 'continuation' };
  } else if (isShort && previousMessages.length > 0) {
    return { isContextual: true, contextType: 'possible_continuation' };
  }

  return { isContextual: false, contextType: 'new' };
};

/**
 * Enhances an image prompt with context from previous images
 * @param {string} currentPrompt - Current image generation prompt
 * @param {Array} imageMessages - Previous image-related messages
 * @returns {string} - Enhanced prompt with context
 */
export const enhanceImagePromptWithContext = (currentPrompt, imageMessages) => {
  if (!imageMessages || imageMessages.length === 0) {
    return currentPrompt;
  }

  const contextAnalysis = analyzeMessageContext(currentPrompt, imageMessages);

  if (!contextAnalysis.isContextual) {
    return currentPrompt;
  }

  // Find the most recent user image prompt
  for (let i = imageMessages.length - 1; i >= 0; i--) {
    if (imageMessages[i].role === 'user' && imageMessages[i].type === 'image') {
      const previousPrompt = imageMessages[i].content;

      if (contextAnalysis.contextType === 'modification') {
        // Combine previous context with modification
        return `${previousPrompt}, ${currentPrompt}`;
      } else if (contextAnalysis.contextType === 'continuation') {
        // Add as continuation
        return `${previousPrompt} and ${currentPrompt}`;
      }
    }
  }

  return currentPrompt;
};

// Re-export from contextCompression for convenience
export { extractSmartContext } from './contextCompression';
