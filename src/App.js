import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

import {
  APP_CONFIG,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_MODEL,
  normalizeImageModelId,
  normalizeModelId,
} from './config/api';
import { getAssistantIcon } from './config/icons';
import { useChatLogic } from './hooks/useChatLogic';
import { useLanguageDetection } from './hooks/useLanguageDetection';
import { useMessageSender } from './hooks/useMessageSender';
import { useModelCatalog } from './hooks/useModelCatalog';
import { useToast } from './hooks/useToast';
import { getSettings, saveSettings, clearAllChats } from './utils/storage';
import { copyToClipboard } from './utils/clipboard';
import { useTranslation } from './utils/translations';

import Sidebar from './components/Sidebar';
import WelcomeScreen from './components/WelcomeScreen';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import ModelSelector from './components/ModelSelector';
import SettingsDialog from './components/SettingsDialog';
import ToastStack from './components/Toast';
import './App.css';

const PAGE_SIZE = 40;

function App() {
  const [prompt, setPrompt] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState({});
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [settings, setSettings] = useState(getSettings);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pinnedToBottomRef = useRef(true);

  const { t } = useTranslation(settings.language);
  const { toasts, notify, dismiss } = useToast();
  const { detectLanguage } = useLanguageDetection();
  const {
    grouped,
    imageGrouped,
    loading: modelsLoading,
    live: modelsLive,
    reload: reloadModels,
    resolveSelected,
    resolveSelectedImage,
  } = useModelCatalog();

  const {
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
    refreshChatHistory,
  } = useChatLogic();

  const selectedModel = normalizeModelId(settings.model || DEFAULT_MODEL);
  const selectedModelInfo = resolveSelected(selectedModel);
  const selectedImageModel = normalizeImageModelId(settings.imageModel || DEFAULT_IMAGE_MODEL);
  const selectedImageModelInfo = resolveSelectedImage(selectedImageModel);
  const activeModelInfo = mode === 'image' ? selectedImageModelInfo : selectedModelInfo;

  // ---- settings ----------------------------------------------------------
  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('lang', settings.language);
    document.documentElement.setAttribute('dir', settings.language === 'ar' ? 'rtl' : 'ltr');
  }, [settings.theme, settings.language]);

  // ---- scrolling ---------------------------------------------------------
  const scrollToBottom = useCallback((behavior = 'smooth', force = false) => {
    if (!messagesEndRef.current) return;
    if (!force && !pinnedToBottomRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return undefined;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      pinnedToBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;

      if (scrollTop < 120) {
        setVisibleCount((prev) => (prev < messages.length ? prev + PAGE_SIZE : prev));
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    pinnedToBottomRef.current = true;
  }, [currentChatId]);

  // ---- textarea autosize -------------------------------------------------
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [prompt]);

  // ---- connectivity feedback --------------------------------------------
  useEffect(() => {
    const onOffline = () => notify(t('errOffline'), { type: 'offline', duration: 0 });
    const onOnline = () => notify(t('backOnline'), { type: 'success' });

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [notify, t]);

  // ---- sending -----------------------------------------------------------
  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleActivity = useCallback(() => scrollToBottom('smooth'), [scrollToBottom]);

  const { loading, isStreaming, send, regenerate, stop } = useMessageSender({
    messages,
    setMessages,
    mode,
    selectedModel,
    selectedImageModel,
    language: settings.language,
    t,
    notify,
    onActivity: handleActivity,
    createNewChatIfNeeded,
  });

  const handleGenerate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    setPrompt('');
    pinnedToBottomRef.current = true;
    focusInput();
    await send(text);
    scrollToBottom('smooth', true);
    focusInput();
  }, [focusInput, loading, prompt, scrollToBottom, send]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate]
  );

  // ---- global shortcuts --------------------------------------------------
  const handleNewChat = useCallback(() => {
    startNewChat();
    setSidebarOpen(false);
    setPrompt('');
    focusInput();
  }, [focusInput, startNewChat]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowModelSelector(false);
        setShowSettings(false);
        setSidebarOpen(false);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        handleNewChat();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNewChat]);

  // ---- message actions ---------------------------------------------------
  const handleCopy = useCallback(
    async (text, index) => {
      const ok = await copyToClipboard(text);
      if (!ok) {
        notify(t('copyFailed'), { type: 'error' });
        return;
      }
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    },
    [notify, t]
  );

  const downloadImage = useCallback(
    async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `x-studio-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
        notify(t('downloadStarted'), { type: 'success', duration: 2500 });
      } catch (error) {
        console.error('Download failed:', error);
        notify(t('downloadFailed'), { type: 'error' });
      }
    },
    [notify, t]
  );

  const handleImageLoad = useCallback(
    (index) => {
      setImageLoading((prev) => ({ ...prev, [index]: false }));
      scrollToBottom('smooth');
    },
    [scrollToBottom]
  );

  /**
   * Image endpoints occasionally answer 500 under load. Retry once with a fresh
   * seed before telling the user anything went wrong.
   */
  const handleImageError = useCallback(
    (index) => {
      let retrying = false;

      setMessages((prev) =>
        prev.map((message, i) => {
          if (i !== index || message.type !== 'image') return message;
          if (message.retriedAt || !String(message.content).startsWith('http')) return message;

          try {
            const url = new URL(message.content);
            url.searchParams.set('seed', String(Date.now()));
            retrying = true;
            return { ...message, content: url.toString(), retriedAt: Date.now() };
          } catch {
            return message;
          }
        })
      );

      if (retrying) {
        setImageLoading((prev) => ({ ...prev, [index]: true }));
        return;
      }

      setImageLoading((prev) => ({ ...prev, [index]: false }));
      notify(t('errImageLoad'), { type: 'error' });
    },
    [notify, setMessages, t]
  );

  const handleLoadChat = useCallback(
    (chatId) => {
      loadChat(chatId);
      setSidebarOpen(false);
      requestAnimationFrame(() => scrollToBottom('auto', true));
    },
    [loadChat, scrollToBottom]
  );

  const handleDeleteChatWithLabel = useCallback(
    (chatId, event) => handleDeleteChat(chatId, event, t),
    [handleDeleteChat, t]
  );

  const handleSelectModel = useCallback(
    (modelId) => {
      updateSettings({ model: modelId });
      setShowModelSelector(false);
      notify(`${t('modelSwitched')}: ${resolveSelected(modelId).name}`, {
        type: 'success',
        duration: 2500,
      });
    },
    [notify, resolveSelected, t, updateSettings]
  );

  const handleSelectImageModel = useCallback(
    (modelId) => {
      updateSettings({ imageModel: modelId });
      setShowModelSelector(false);
      notify(`${t('modelSwitched')}: ${resolveSelectedImage(modelId).name}`, {
        type: 'success',
        duration: 2500,
      });
    },
    [notify, resolveSelectedImage, t, updateSettings]
  );

  const handleClearAllChats = useCallback(() => {
    if (!clearAllChats()) {
      notify(t('errGeneric'), { type: 'error' });
      return;
    }
    startNewChat();
    refreshChatHistory();
    setSidebarOpen(false);
    setShowSettings(false);
    notify(t('chatsCleared'), { type: 'success' });
  }, [notify, refreshChatHistory, startNewChat, t]);

  // ---- render data -------------------------------------------------------
  const visibleMessages = useMemo(() => {
    const start = Math.max(0, messages.length - visibleCount);
    return messages.slice(start).map((message, i) => ({ message, index: start + i }));
  }, [messages, visibleCount]);

  const hiddenCount = messages.length - visibleMessages.length;
  const LoadingAvatarIcon = getAssistantIcon(activeModelInfo.provider);

  return (
    <div className="app" data-language={settings.language}>
      <button
        type="button"
        className={`mobile-menu-button ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={sidebarOpen ? t('close') : t('openMenu')}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <Sidebar
        sidebarOpen={sidebarOpen}
        onNewChat={handleNewChat}
        selectedModel={activeModelInfo.id}
        selectedModelInfo={activeModelInfo}
        onShowModelSelector={() => setShowModelSelector(true)}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onLoadChat={handleLoadChat}
        onDeleteChat={handleDeleteChatWithLabel}
        onShowSettings={() => setShowSettings(true)}
        language={settings.language}
      />

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          role="presentation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="main-content">
        <div className="chat-container">
          {messages.length === 0 ? (
            <WelcomeScreen mode={mode} onPromptClick={setPrompt} language={settings.language} />
          ) : (
            <div className="messages" ref={messagesContainerRef}>
              {hiddenCount > 0 && (
                <div className="load-more-indicator">
                  <button
                    type="button"
                    className="load-more-button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  >
                    {t('loadOlderMessages')} ({hiddenCount})
                  </button>
                </div>
              )}

              {visibleMessages.map(({ message, index }) => (
                <ChatMessage
                  key={message.id || `${message.timestamp}-${index}`}
                  message={message}
                  index={index}
                  copiedIndex={copiedIndex}
                  imageLoading={imageLoading}
                  onCopy={handleCopy}
                  onRegenerate={regenerate}
                  onDownloadImage={downloadImage}
                  onImageLoad={handleImageLoad}
                  onImageError={handleImageError}
                  detectLanguage={detectLanguage}
                  selectedModel={selectedModel}
                  language={settings.language}
                />
              ))}

              {loading && !isStreaming && (
                <div className="message assistant">
                  <div className="message-wrapper">
                    <div className="message-avatar">
                      <div className="avatar-icon">
                        <LoadingAvatarIcon size={16} aria-hidden="true" />
                      </div>
                    </div>
                    <div className="message-content-wrapper">
                      <div className="message-content loading-message">
                        <div className="typing-indicator" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </div>
                        <span className="loading-text">
                          {mode === 'text' ? t('thinking') : t('generatingImage')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput
          mode={mode}
          prompt={prompt}
          loading={loading}
          isStreaming={isStreaming}
          textareaRef={textareaRef}
          inputRef={inputRef}
          onPromptChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          onGenerate={handleGenerate}
          onStop={stop}
          onModeChange={setMode}
          language={settings.language}
          modelName={activeModelInfo.name}
        />
      </div>

      {showModelSelector && (
        <ModelSelector
          groups={grouped}
          imageGroups={imageGrouped}
          loading={modelsLoading}
          live={modelsLive}
          onRefresh={() => reloadModels({ refresh: true })}
          selectedModel={selectedModel}
          selectedImageModel={selectedImageModel}
          onSelectModel={handleSelectModel}
          onSelectImageModel={handleSelectImageModel}
          onClose={() => setShowModelSelector(false)}
          language={settings.language}
          initialKind={mode === 'image' ? 'image' : 'text'}
        />
      )}

      {showSettings && (
        <SettingsDialog
          onClose={() => setShowSettings(false)}
          language={settings.language}
          onLanguageChange={(lang) => updateSettings({ language: lang })}
          theme={settings.theme}
          onThemeChange={(theme) => updateSettings({ theme })}
          onClearAllChats={handleClearAllChats}
          appVersion={APP_CONFIG.version}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

export default App;
