import { memo, useCallback } from 'react';
import { ChevronDown, Image as ImageIcon, Send, Loader2, Square } from 'lucide-react';
import { getProviderIcon } from '../config/icons';
import { useTranslation } from '../utils/translations';

const MAX_LENGTH = 8000;

const ChatInput = memo(({
  prompt,
  loading,
  isStreaming,
  textareaRef,
  inputRef,
  modelButtonRef,
  modelSelector,
  modelSelectorOpen,
  imageMode,
  onToggleImageMode,
  onPromptChange,
  onKeyDown,
  onGenerate,
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
      if (event.target.closest('button, [data-composer-popover]')) return;
      if (!loading) focusInput();
    },
    [focusInput, loading]
  );

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
          placeholder={imageMode ? t('imagePlaceholder') : t('messagePlaceholder')}
          value={prompt}
          onChange={onPromptChange}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={MAX_LENGTH}
          disabled={loading && !isStreaming}
          aria-label={t('messagePlaceholder')}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />

        <div className="input-actions-row">
          <div className="composer-controls">
            <div className="composer-model-anchor">
              <button
                ref={modelButtonRef}
                type="button"
                className="composer-model-button"
                onClick={onShowModelSelector}
                disabled={loading}
                title={t('selectModelFromComposer')}
                aria-label={`${t('selectModelFromComposer')}: ${modelInfo?.name || ''}`}
                aria-haspopup="true"
                aria-expanded={modelSelectorOpen}
                aria-controls={modelSelectorOpen ? 'model-selector-popover' : undefined}
              >
                <span className="composer-model-icon" style={{ color: modelInfo?.color }}>
                  <ModelIcon size={15} aria-hidden="true" />
                </span>
                <span className="composer-model-name">{modelInfo?.name}</span>
                <ChevronDown
                  size={13}
                  className={modelSelectorOpen ? 'model-chevron open' : 'model-chevron'}
                  aria-hidden="true"
                />
              </button>
              {modelSelector}
            </div>

            <button
              type="button"
              className={`composer-mode-button ${imageMode ? 'active' : ''}`}
              onClick={onToggleImageMode}
              disabled={loading}
              title={imageMode ? t('imageModeOn') : t('imageModeOff')}
              aria-label={imageMode ? t('imageModeOn') : t('imageModeOff')}
              aria-pressed={!!imageMode}
            >
              <ImageIcon size={15} aria-hidden="true" />
              <span className="composer-mode-label">{t('imageModeShort')}</span>
            </button>
          </div>

          <button
            type="button"
            className={`send-button ${isStreaming ? 'stop' : ''}`}
            onClick={isStreaming ? onStop : onGenerate}
            disabled={!isStreaming && !canSend}
            title={isStreaming ? t('stopGenerating') : t('sendMessage')}
            aria-label={isStreaming ? t('stopGenerating') : t('sendMessage')}
          >
            {isStreaming ? (
              <Square size={18} fill="currentColor" />
            ) : loading ? (
              <Loader2 className="spinner" size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>

      <div className="input-footer">
        <p className="input-hint">{imageMode ? t('imageModeHint') : t('sendHint')}</p>
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
