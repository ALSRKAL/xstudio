// ============================================================================
// X Studio - Message sending pipeline
// ----------------------------------------------------------------------------
// One code path for sending, regenerating and stopping - text or image.
// Keeps App.js declarative and prevents the send/regenerate logic from drifting.
// ============================================================================

import { useCallback, useRef, useState } from 'react';
import { streamChat, ERROR_CODES } from '../services/aiClient';
import { processImageGeneration } from '../utils/imageGenerator';
import { buildSystemPrompt } from '../config/prompts';
import {
  DEVICE_TOTAL_LIMIT,
  getLimitsForModel,
  getModelInfo,
  isKeylessModel,
  USAGE_LIMITS,
} from '../config/api';
import {
  getDaysUntilReset,
  hasReachedDeviceLimit,
  hasReachedModelLimit,
  incrementDeviceUsage,
} from '../utils/usageTracker';
import { extractSmartContext, enhanceImagePromptWithContext } from '../utils/contextManager';

const ERROR_KEYS = {
  [ERROR_CODES.OFFLINE]: 'errOffline',
  [ERROR_CODES.RATE_LIMITED]: 'errRateLimited',
  [ERROR_CODES.NO_PROVIDER]: 'errNoProvider',
  [ERROR_CODES.TIMEOUT]: 'errTimeout',
  [ERROR_CODES.EMPTY]: 'errEmpty',
};

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const hasArabic = (text) => /[\u0600-\u06FF]/.test(text || '');

export const useMessageSender = ({
  messages,
  setMessages,
  mode,
  selectedModel,
  language,
  t,
  notify,
  onActivity,
  createNewChatIfNeeded,
}) => {
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortRef = useRef(null);
  const frameRef = useRef(null);
  const pendingRef = useRef(null);

  // ---- streaming render throttle (one DOM update per animation frame) ----
  const flushPending = useCallback(
    (messageId) => {
      frameRef.current = null;
      const content = pendingRef.current;
      if (content === null) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content } : m))
      );
      onActivity?.();
    },
    [setMessages, onActivity]
  );

  const scheduleUpdate = useCallback(
    (messageId, content) => {
      pendingRef.current = content;
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => flushPending(messageId));
    },
    [flushPending]
  );

  const cancelPending = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pendingRef.current = null;
  }, []);

  // ---- usage limits ------------------------------------------------------
  const checkLimits = useCallback(() => {
    if (!USAGE_LIMITS.enabled || isKeylessModel(selectedModel)) return null;

    const days = getDaysUntilReset() ?? USAGE_LIMITS.cycleDays;

    if (hasReachedDeviceLimit(DEVICE_TOTAL_LIMIT)) {
      return `${t('limitDeviceReached')}\n${t('resetIn')} ${days} ${t('days')}`;
    }

    const { dailyLimit, totalLimit } = getLimitsForModel(selectedModel);
    if (hasReachedModelLimit(selectedModel, dailyLimit, totalLimit)) {
      const name = getModelInfo(selectedModel).name;
      return `${t('limitModelReached')} (${name})\n${t('resetIn')} ${days} ${t('days')}`;
    }
    return null;
  }, [selectedModel, t]);

  // ---- text ---------------------------------------------------------------
  const runText = useCallback(
    async (promptText, history) => {
      const limitError = checkLimits();
      if (limitError) {
        notify(limitError, { type: 'warning', duration: 7000 });
        return;
      }

      const messageId = newId();
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: 'assistant',
          content: '',
          type: 'text',
          timestamp: new Date().toISOString(),
          modelUsed: selectedModel,
          streaming: true,
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);

      const contextMessages = extractSmartContext(
        history.filter((m) => m.type === 'text' && !m.isError),
        20
      ).map((m) => ({ role: m.role, content: m.content }));

      try {
        const result = await streamChat({
          model: selectedModel,
          systemPrompt: buildSystemPrompt({
            language,
            isArabicPrompt: hasArabic(promptText),
          }),
          messages: [...contextMessages, { role: 'user', content: promptText }],
          signal: controller.signal,
          onToken: (full) => scheduleUpdate(messageId, full),
        });

        cancelPending();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  content: result.content,
                  streaming: false,
                  provider: result.provider,
                  modelUsed: result.fallback ? `${result.provider}:${result.model}` : selectedModel,
                }
              : m
          )
        );

        if (!isKeylessModel(selectedModel)) incrementDeviceUsage(selectedModel);
        if (result.fallback) notify(t('fallbackUsed'), { type: 'warning' });
      } catch (error) {
        cancelPending();

        if (error.code === ERROR_CODES.ABORTED) {
          // Keep whatever was already streamed - it is still useful.
          setMessages((prev) =>
            prev
              .map((m) => (m.id === messageId ? { ...m, streaming: false, stopped: true } : m))
              .filter((m) => m.id !== messageId || m.content.trim())
          );
          return;
        }

        const key = ERROR_KEYS[error.code] || 'errGeneric';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, content: t(key), streaming: false, isError: true }
              : m
          )
        );
        notify(t(key), { type: error.code === ERROR_CODES.OFFLINE ? 'offline' : 'error' });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [
      checkLimits,
      language,
      notify,
      scheduleUpdate,
      cancelPending,
      selectedModel,
      setMessages,
      t,
    ]
  );

  // ---- image --------------------------------------------------------------
  const runImage = useCallback(
    async (promptText, history) => {
      try {
        const enhanced = enhanceImagePromptWithContext(
          promptText,
          history.filter((m) => m.type === 'image')
        );
        const result = await processImageGeneration(enhanced);
        if (!result.success) throw new Error(result.error);

        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'assistant',
            content: result.imageUrl,
            type: 'image',
            prompt: result.processedPrompt,
            originalPrompt: promptText,
            timestamp: new Date().toISOString(),
            modelUsed: 'pollinations:flux',
          },
        ]);
        onActivity?.();
      } catch (error) {
        console.error('Image generation failed:', error);
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: 'assistant',
            content: t('errGeneratingImage'),
            type: 'text',
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ]);
        notify(t('errGeneratingImage'), { type: 'error' });
      }
    },
    [notify, onActivity, setMessages, t]
  );

  // ---- public API ---------------------------------------------------------
  const send = useCallback(
    async (promptText) => {
      const text = (promptText || '').trim();
      if (!text || loading) return;

      createNewChatIfNeeded?.();
      const history = messages;

      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'user',
          content: text,
          type: mode,
          timestamp: new Date().toISOString(),
        },
      ]);
      setLoading(true);
      onActivity?.();

      try {
        if (mode === 'image') await runImage(text, history);
        else await runText(text, history);
      } finally {
        setLoading(false);
      }
    },
    [createNewChatIfNeeded, loading, messages, mode, onActivity, runImage, runText, setMessages]
  );

  /** Re-run the user message that produced `messageIndex` */
  const regenerate = useCallback(
    async (messageIndex) => {
      if (loading) return;

      const target = messages[messageIndex];
      if (!target || target.role !== 'assistant') {
        notify(t('errRegenerateTarget'), { type: 'warning' });
        return;
      }

      let userMessage = null;
      for (let i = messageIndex - 1; i >= 0; i -= 1) {
        if (messages[i].role === 'user') {
          userMessage = messages[i];
          break;
        }
      }

      if (!userMessage) {
        notify(t('errRegenerateTarget'), { type: 'warning' });
        return;
      }

      const history = messages.slice(0, messageIndex);
      setMessages(history);
      setLoading(true);
      onActivity?.();

      try {
        const isImage = userMessage.type === 'image';
        const priorHistory = history.slice(0, -1);
        if (isImage) await runImage(userMessage.content, priorHistory);
        else await runText(userMessage.content, priorHistory);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, notify, onActivity, runImage, runText, setMessages, t]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cancelPending();
    setIsStreaming(false);
    setLoading(false);
    setMessages((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)));
  }, [cancelPending, setMessages]);

  return { loading, isStreaming, send, regenerate, stop };
};
