import { useState, useEffect, useRef, useCallback } from 'react';
import {
  saveChat,
  getChatHistory,
  getChat,
  deleteChat,
  generateChatId,
  getCurrentChatId,
  invalidateCache,
} from '../utils/storage';

export const useChatLogic = () => {
  const [messages, setMessages] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [mode, setMode] = useState('text');
  
  // Use ref to track if we're loading to prevent unnecessary saves
  const isLoadingRef = useRef(false);
  const saveTimeoutRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    isLoadingRef.current = true;
    
    const history = getChatHistory();
    setChatHistory(history);

    const savedChatId = getCurrentChatId();
    if (savedChatId) {
      const savedChat = getChat(savedChatId);
      if (savedChat) {
        setCurrentChatId(savedChatId);
        setMessages(savedChat.messages || []);
        setMode(savedChat.mode || 'text');
      }
    }
    
    // Small delay to ensure loading is complete
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, []);

  // Optimized save with debouncing
  useEffect(() => {
    // Don't save during initial load
    if (isLoadingRef.current) return;
    
    if (messages.length > 0 && currentChatId) {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Debounce save to avoid too frequent writes
      saveTimeoutRef.current = setTimeout(() => {
        saveChat(currentChatId, messages, mode);
        // Update history less frequently
        const history = getChatHistory();
        setChatHistory(history);
      }, 300); // Wait 300ms before saving
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, currentChatId, mode]);

  const startNewChat = useCallback(() => {
    isLoadingRef.current = true;
    setMessages([]);
    setCurrentChatId(null);
    setMode('text');
    invalidateCache();
    setChatHistory(getChatHistory());
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, []);

  const loadChat = useCallback((chatId) => {
    isLoadingRef.current = true;
    const chat = getChat(chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages || []);
      setMode(chat.mode || 'text');
    }
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, []);

  const handleDeleteChat = useCallback((chatId, e, t) => {
    e.stopPropagation();
    const confirmMessage = t ? t('confirmDeleteChat') : 'Delete this chat?';
    if (window.confirm(confirmMessage)) {
      deleteChat(chatId);
      invalidateCache();
      setChatHistory(getChatHistory());
      if (currentChatId === chatId) {
        startNewChat();
      }
    }
  }, [currentChatId, startNewChat]);

  const createNewChatIfNeeded = useCallback(() => {
    if (!currentChatId) {
      const newChatId = generateChatId();
      setCurrentChatId(newChatId);
      return newChatId;
    }
    return currentChatId;
  }, [currentChatId]);

  const refreshChatHistory = useCallback(() => {
    invalidateCache();
    setChatHistory(getChatHistory());
  }, []);

  return {
    messages,
    setMessages,
    currentChatId,
    chatHistory,
    mode,
    setMode,
    startNewChat,
    loadChat,
    handleDeleteChat,
    createNewChatIfNeeded,
    refreshChatHistory
  };
};
