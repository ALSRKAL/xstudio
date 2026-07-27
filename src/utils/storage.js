// Local Storage utilities for chat history with performance optimization
import {
  compressMessages,
  decompressMessages,
  optimizeMessagesForStorage,
  checkStorageHealth
} from './contextCompression';
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_MODEL,
  normalizeImageModelId,
  normalizeModelId,
} from '../config/api';

export const STORAGE_KEYS = {
  CHAT_HISTORY: 'x_studio_chat_history',
  CURRENT_CHAT_ID: 'x_studio_current_chat_id',
  CHAT_PREFIX: 'x_studio_chat_', // Individual chat storage
};

// Cache for better performance
let chatHistoryCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5000; // 5 seconds

// Debounce timer for saving
let saveTimer = null;

// In-memory cache for current chat to reduce localStorage reads
let currentChatCache = null;
let currentChatCacheId = null;

/**
 * Inline base64 images are hundreds of KB each and would exhaust the ~5 MB
 * localStorage budget in a handful of messages. They are dropped on save and
 * marked so the UI can offer a regenerate instead of a broken image.
 */
const stripInlineImages = (messages) =>
  messages.map((message) => {
    const isInline =
      message.type === 'image' &&
      typeof message.content === 'string' &&
      (message.persistable === false || message.content.startsWith('data:'));

    if (!isInline) return message;
    return { ...message, content: '', expired: true };
  });

export const saveChat = (chatId, messages, mode) => {
  try {
    // Check storage health before saving
    const storageHealth = checkStorageHealth();

    // Optimize messages based on storage health
    let optimizedMessages = stripInlineImages(messages);
    if (storageHealth.usagePercent > 70) {
      // If storage is getting full, optimize more aggressively
      optimizedMessages = optimizeMessagesForStorage(optimizedMessages, 300);
    } else if (messages.length > 100) {
      // For long conversations, always optimize
      optimizedMessages = optimizeMessagesForStorage(optimizedMessages, 500);
    }
    
    // Compress messages for storage
    const compressed = compressMessages(optimizedMessages);
    
    // Save individual chat separately for better performance
    const chatData = {
      id: chatId,
      messages: compressed,
      mode,
      timestamp: new Date().toISOString(),
      title: generateChatTitle(messages, mode),
      messageCount: messages.length,
      compressed: true, // Flag to indicate compression
    };

    // Save individual chat
    localStorage.setItem(`${STORAGE_KEYS.CHAT_PREFIX}${chatId}`, JSON.stringify(chatData));
    
    // Update in-memory cache
    currentChatCache = { ...chatData, messages: optimizedMessages };
    currentChatCacheId = chatId;

    // Update history index (without full messages)
    const history = getChatHistory();
    const existingIndex = history.findIndex(chat => chat.id === chatId);
    
    const historyEntry = {
      id: chatId,
      mode,
      timestamp: chatData.timestamp,
      title: chatData.title,
      messageCount: chatData.messageCount,
    };

    if (existingIndex >= 0) {
      history[existingIndex] = historyEntry;
    } else {
      history.unshift(historyEntry);
    }

    // Keep only last 50 chats
    const limitedHistory = history.slice(0, 50);
    
    // Clean up old chats beyond limit
    if (history.length > 50) {
      history.slice(50).forEach(chat => {
        localStorage.removeItem(`${STORAGE_KEYS.CHAT_PREFIX}${chat.id}`);
      });
    }

    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(limitedHistory));
    localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT_ID, chatId);
    
    // Invalidate cache
    chatHistoryCache = null;
    
    // If storage is critically full, trigger cleanup
    if (storageHealth.needsCleanup) {
      console.warn('Storage is critically full, triggering cleanup...');
      cleanupOldChats();
    }
  } catch (error) {
    console.error('Error saving chat:', error);
    // If storage is full, try to clean up old chats
    if (error.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded, cleaning up...');
      cleanupOldChats();
      // Try again with more aggressive optimization
      try {
        const veryOptimized = optimizeMessagesForStorage(stripInlineImages(messages), 200);
        const compressed = compressMessages(veryOptimized);
        const chatData = {
          id: chatId,
          messages: compressed,
          mode,
          timestamp: new Date().toISOString(),
          title: generateChatTitle(messages, mode),
          messageCount: messages.length,
          compressed: true,
        };
        localStorage.setItem(`${STORAGE_KEYS.CHAT_PREFIX}${chatId}`, JSON.stringify(chatData));
      } catch (retryError) {
        // Surfaced to the user through the storage meter in Settings.
        console.error('Storage still full after cleanup:', retryError);
      }
    }
  }
};

// Debounced save for better performance
export const saveChatDebounced = (chatId, messages, mode) => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveChat(chatId, messages, mode);
  }, 500); // Wait 500ms before saving
};

export const getChatHistory = () => {
  try {
    // Use cache if available and fresh
    const now = Date.now();
    if (chatHistoryCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return chatHistoryCache;
    }

    const history = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    const parsed = history ? JSON.parse(history) : [];
    
    // Update cache
    chatHistoryCache = parsed;
    cacheTimestamp = now;
    
    return parsed;
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
};

export const getChat = (chatId) => {
  try {
    // Check in-memory cache first
    if (currentChatCacheId === chatId && currentChatCache) {
      return currentChatCache;
    }
    
    // Load individual chat from separate storage
    const chatData = localStorage.getItem(`${STORAGE_KEYS.CHAT_PREFIX}${chatId}`);
    if (!chatData) return null;
    
    const parsed = JSON.parse(chatData);
    
    // Decompress messages if they were compressed
    if (parsed.compressed && parsed.messages) {
      parsed.messages = decompressMessages(parsed.messages);
    }
    
    // Update cache
    currentChatCache = parsed;
    currentChatCacheId = chatId;
    
    return parsed;
  } catch (error) {
    console.error('Error getting chat:', error);
    return null;
  }
};

// Invalidate cache manually
export const invalidateCache = () => {
  chatHistoryCache = null;
  cacheTimestamp = 0;
  currentChatCache = null;
  currentChatCacheId = null;
};

// Get storage statistics
export const getStorageStats = () => {
  const health = checkStorageHealth();
  const history = getChatHistory();
  
  return {
    ...health,
    totalChats: history.length,
    recommendation: health.needsCleanup 
      ? 'Delete old chats to free space'
      : health.usagePercent > 70
      ? 'Consider deleting some old chats'
      : 'Storage is healthy',
  };
};

export const deleteChat = (chatId) => {
  try {
    // Delete individual chat
    localStorage.removeItem(`${STORAGE_KEYS.CHAT_PREFIX}${chatId}`);
    
    // Update history index
    const history = getChatHistory();
    const filtered = history.filter(chat => chat.id !== chatId);
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(filtered));
    
    const currentChatId = localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT_ID);
    if (currentChatId === chatId) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_CHAT_ID);
    }
    
    // Invalidate cache
    invalidateCache();
  } catch (error) {
    console.error('Error deleting chat:', error);
  }
};

// Clean up old chats to free space
const cleanupOldChats = () => {
  try {
    const history = getChatHistory();
    // Keep only last 30 chats when cleaning up
    const toKeep = history.slice(0, 30);
    const toDelete = history.slice(30);
    
    toDelete.forEach(chat => {
      localStorage.removeItem(`${STORAGE_KEYS.CHAT_PREFIX}${chat.id}`);
    });
    
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(toKeep));
    invalidateCache();
    
    console.log(`Cleaned up ${toDelete.length} old chats`);
  } catch (error) {
    console.error('Error cleaning up chats:', error);
  }
};

export const getCurrentChatId = () => {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT_ID);
};

export const generateChatId = () => {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

export const clearAllChats = () => {
  try {
    // Get all chat IDs and delete individual chats
    const history = getChatHistory();
    history.forEach(chat => {
      localStorage.removeItem(`${STORAGE_KEYS.CHAT_PREFIX}${chat.id}`);
    });
    
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CHAT_ID);
    
    // Invalidate all caches
    invalidateCache();
    
    console.log('All chats cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing chats:', error);
    return false;
  }
};

// Settings storage
export const SETTINGS_KEY = 'x_studio_settings';

export const DEFAULT_SETTINGS = {
  language: 'ar',
  theme: 'light',
  model: DEFAULT_MODEL,
  imageModel: DEFAULT_IMAGE_MODEL,
};

export const getSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // migrate legacy model ids (e.g. "base", "pollinations:flux")
      model: normalizeModelId(parsed.model || DEFAULT_SETTINGS.model),
      imageModel: normalizeImageModelId(parsed.imageModel || DEFAULT_SETTINGS.imageModel),
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

const generateChatTitle = (messages, mode) => {
  if (messages.length === 0) {
    return mode === 'text' ? 'New Text Chat' : 'New Image Generation';
  }

  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content;
    const maxLength = 40;
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;
  }

  return mode === 'text' ? 'Text Chat' : 'Image Generation';
};
