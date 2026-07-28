import { memo, useCallback } from 'react';
import { ChevronDown, Send, Loader2, MessageSquare, Image as ImageIcon, Square } from 'lucide-react';
import { getProviderIcon } from '../config/icons';
import { useTranslation } from '../utils/translations';

const MAX_LENGTH = 8000;

const ChatInput = memo(({
  mode,
  prompt,
  loading,
  isStreaming,
  textareaRef,
  inputRef,
  onPromptChange,
  onKeyDown,
  onGenerate,
  onModeChange,
  onStop,
  onShowModelSelector,
  language = 'ar',
  modelInfo,
}) => {
  const { t } = useTranslation(language);

  const focusInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [inputRef]);

  const handleWrapperClick = useCallback(
    (event) => {
      if (event.target.closest('button')) return;
      if (!loading) focusInput();
    },
    [focusInput, loading]
  );

  const handleModeChange = useCallback(
    (newMode) => {
      if (newMode === mode) return;
      onModeChange(newMode);
      requestAnimationFrame(focusInput);
    },
    [focusInput, mode, onModeChange]
  );

  const isTextMode = mode === 'text';
  const nearLimit = prompt.length > MAX_LENGTH * 0.9;
  const canSend = prompt.trim().length > 0 && !loading;
  const ModelIcon = getProviderIcon(modelInfo?.provider);

  return (
    <div className="input-container">
      <div className="input-wrapper" onClick={handleWrapperClick} role="presentation">
        <textarea
          ref={(el) => {
            textareaRef.current = el;
            inputRef.current = el;
          }}
          className="input-field"
          placeholder={isTextMode ? t('messagePlaceholder') : t('imagePlaceholder')}
          value={prompt}
          onChange={onPromptChange}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={MAX_LENGTH}
          disabled={loading && !isStreaming}
          aria-label={isTextMode ? t('messagePlaceholder') : t('imagePlaceholder')}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />

        <div className="input-actions-row">
          <div className="composer-controls">
            <button
              type="button"
              className="composer-model-button"
              onClick={onShowModelSelector}
              disabled={loading}
              title={t('selectModelFromComposer')}
              aria-label={`${t('selectModelFromComposer')}: ${modelInfo?.name || ''}`}
            >
              <span className="composer-model-icon" style={{ color: modelInfo?.color }}>
                <ModelIcon size={15} aria-hidden="true" />
              </span>
              <span className="composer-model-name">{modelInfo?.name}</span>
              <ChevronDown size={13} aria-hidden="true" />
            </button>

            <div className="input-mode-selector" role="tablist" aria-label={t('textChat')}>
              <button
                type="button"
                role="tab"
                aria-selected={isTextMode}
                className={`input-mode-button ${isTextMode ? 'active' : ''}`}
                onClick={() => handleModeChange('text')}
                title={t('textChat')}
              >
                <MessageSquare size={15} />
                <span>{t('textChat')}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isTextMode}
                className={`input-mode-button ${!isTextMode ? 'active' : ''}`}
                onClick={() => handleModeChange('image')}
                title={t('imageGenerator')}
              >
                <ImageIcon size={15} />
                <span>{t('imageGenerator')}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            className={`send-button ${isStreaming ? 'stop' : ''}`}
            onClick={isStreaming ? onStop : onGenerate}
            disabled={!isStreaming && !canSend}
            title={isStreaming ? t('stopGenerating') : isTextMode ? t('sendMessage') : t('generateImage')}
            aria-label={
              isStreaming ? t('stopGenerating') : isTextMode ? t('sendMessage') : t('generateImage')
            }
          >
            {isStreaming ? (
              <Square size={18} fill="currentColor" />
            ) : loading ? (
              <Loader2 className="spinner" size={20} />
            ) : isTextMode ? (
              <Send size={20} />
            ) : (
              <ImageIcon size={20} />
            )}
          </button>
        </div>
      </div>

      <div className="input-footer">
        <p className="input-hint">{isTextMode ? t('sendHint') : t('generateHint')}</p>
        {nearLimit && (
          <span className="char-counter" aria-live="polite">
            {prompt.length}/{MAX_LENGTH}
          </span>
        )}
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;
