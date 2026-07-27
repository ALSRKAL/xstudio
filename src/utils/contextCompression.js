// Context Compression - Compress conversation context for better performance

/**
 * Compress messages for storage to save space
 * @param {Array} messages - Array of message objects
 * @returns {Array} - Compressed messages
 */
export const compressMessages = (messages) => {
  if (!messages || messages.length === 0) return [];
  
  return messages.map(msg => ({
    r: msg.role === 'user' ? 'u' : 'a', // role: u=user, a=assistant
    c: msg.content, // content
    t: msg.type === 'text' ? 't' : 'i', // type: t=text, i=image
    ts: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(), // timestamp as number
    ...(msg.prompt && { p: msg.prompt }), // prompt for images
    ...(msg.modelUsed && { m: msg.modelUsed }), // model used
  }));
};

/**
 * Decompress messages from storage
 * @param {Array} compressed - Compressed messages
 * @returns {Array} - Original message format
 */
export const decompressMessages = (compressed) => {
  if (!compressed || compressed.length === 0) return [];
  
  return compressed.map(msg => ({
    role: msg.r === 'u' ? 'user' : 'assistant',
    content: msg.c,
    type: msg.t === 't' ? 'text' : 'image',
    timestamp: new Date(msg.ts).toISOString(),
    ...(msg.p && { prompt: msg.p }),
    ...(msg.m && { modelUsed: msg.m }),
  }));
};

/**
 * Summarize old messages to save space while keeping context
 * @param {Array} messages - Array of messages
 * @param {number} keepRecent - Number of recent messages to keep full
 * @returns {Array} - Messages with old ones summarized
 */
export const summarizeOldMessages = (messages, keepRecent = 20) => {
  if (!messages || messages.length <= keepRecent) return messages;
  
  const recentMessages = messages.slice(-keepRecent);
  const oldMessages = messages.slice(0, -keepRecent);
  
  // Summarize old messages - keep only essential info
  const summarized = oldMessages.map((msg, index) => {
    // Keep every 5th message full, summarize others
    if (index % 5 === 0) {
      return msg;
    }
    
    // Summarize text messages
    if (msg.type === 'text' && msg.content.length > 100) {
      return {
        ...msg,
        content: msg.content.substring(0, 100) + '...',
        summarized: true,
      };
    }
    
    return msg;
  });
  
  return [...summarized, ...recentMessages];
};

/**
 * Calculate storage size of messages in bytes
 * @param {Array} messages - Array of messages
 * @returns {number} - Size in bytes
 */
export const calculateStorageSize = (messages) => {
  if (!messages || messages.length === 0) return 0;
  
  const jsonString = JSON.stringify(messages);
  return new Blob([jsonString]).size;
};

/**
 * Optimize messages for storage based on size
 * @param {Array} messages - Array of messages
 * @param {number} maxSizeKB - Maximum size in KB (default 500KB)
 * @returns {Array} - Optimized messages
 */
export const optimizeMessagesForStorage = (messages, maxSizeKB = 500) => {
  if (!messages || messages.length === 0) return [];
  
  const maxSizeBytes = maxSizeKB * 1024;
  let currentSize = calculateStorageSize(messages);
  
  // If size is acceptable, return as is
  if (currentSize <= maxSizeBytes) {
    return messages;
  }
  
  // Try compression first
  const compressed = compressMessages(messages);
  currentSize = calculateStorageSize(compressed);
  
  if (currentSize <= maxSizeBytes) {
    return compressed;
  }
  
  // If still too large, summarize old messages
  let optimized = summarizeOldMessages(messages, 30);
  currentSize = calculateStorageSize(optimized);
  
  if (currentSize <= maxSizeBytes) {
    return optimized;
  }
  
  // Last resort: keep only recent messages
  let keepCount = messages.length;
  while (currentSize > maxSizeBytes && keepCount > 10) {
    keepCount = Math.floor(keepCount * 0.8);
    optimized = messages.slice(-keepCount);
    currentSize = calculateStorageSize(optimized);
  }
  
  return optimized;
};

/**
 * Smart context extraction for API calls
 * Extract only relevant context without full message history
 * @param {Array} messages - All messages
 * @param {number} maxMessages - Maximum messages to include
 * @returns {Array} - Context messages
 */
export const extractSmartContext = (messages, maxMessages = 10) => {
  if (!messages || messages.length === 0) return [];
  
  // Always include recent messages
  const recentMessages = messages.slice(-maxMessages);
  
  // If we have more messages, try to include important ones
  if (messages.length > maxMessages) {
    const olderMessages = messages.slice(0, -maxMessages);
    
    // Find important messages (questions, errors, key information)
    const importantMessages = olderMessages.filter((msg, index) => {
      // Keep first message (usually sets context)
      if (index === 0) return true;
      
      // Keep messages with questions
      if (msg.content && (msg.content.includes('?') || msg.content.includes('؟'))) return true;
      
      // Keep error messages
      if (msg.content && (msg.content.includes('error') || msg.content.includes('خطأ'))) return true;
      
      // Keep short messages (likely important)
      if (msg.content && msg.content.length < 50) return true;
      
      return false;
    });
    
    // Combine important old messages with recent ones
    return [...importantMessages.slice(-3), ...recentMessages];
  }
  
  return recentMessages;
};

/**
 * Check if storage is getting full
 * @returns {Object} - Storage info
 */
export const checkStorageHealth = () => {
  try {
    // Estimate localStorage usage
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    
    // Most browsers allow ~5-10MB for localStorage
    const maxSize = 5 * 1024 * 1024; // 5MB
    const usagePercent = (totalSize / maxSize) * 100;
    
    return {
      totalSize,
      totalSizeKB: Math.round(totalSize / 1024),
      maxSize,
      maxSizeKB: Math.round(maxSize / 1024),
      usagePercent: Math.round(usagePercent),
      isHealthy: usagePercent < 80,
      needsCleanup: usagePercent > 90,
    };
  } catch (error) {
    console.error('Error checking storage health:', error);
    return {
      totalSize: 0,
      usagePercent: 0,
      isHealthy: true,
      needsCleanup: false,
    };
  }
};
