import { memo, useCallback } from 'react';
import { AlertCircle, Check, Copy, Download, ImageOff, Loader2, Play, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getModelInfo } from '../config/api';
import { getAssistantIcon, USER_ICON, WORKSPACE_ICONS } from '../config/icons';
import { useTranslation } from '../utils/translations';

const hasArabic = (text) => /[\u0600-\u06FF]/.test(text || '');

const ChatMessage = memo(
  ({
    message,
    index,
    copiedIndex,
    imageLoading,
    onCopy,
    onRegenerate,
    onDownloadImage,
    onImageLoad,
    onImageError,
    onOpenArtifact,
    onRunCode,
    detectLanguage,
    selectedModel,
    language = 'ar',
  }) => {
    const { t } = useTranslation(language);
    const WorkspaceIcon = WORKSPACE_ICONS.workspace;

    const isUser = message.role === 'user';
    const modelMeta = getModelInfo(message.modelUsed || selectedModel);
    const AvatarIcon = isUser ? USER_ICON : getAssistantIcon(modelMeta.provider);
    const isImageResult = message.type === 'image' && !isUser && message.content !== undefined;
    const imageReady = imageLoading[index] === false;
    const direction = hasArabic(message.content) ? 'rtl' : 'ltr';

    const handleCopyCode = useCallback(
      (code) => onCopy(code, `${index}-code`),
      [index, onCopy]
    );

    const renderCode = useCallback(
      ({ className, children }) => {
        const match = /language-([\w-]+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');
        const isBlock = Boolean(match) || codeString.includes('\n');

        if (!isBlock) {
          return (
            <code className="inline-code">
              {children}
            </code>
          );
        }

        const codeLanguage = match ? match[1].toLowerCase() : detectLanguage(codeString);
        const canRun = ['html', 'htm'].includes(codeLanguage) && typeof onRunCode === 'function';

        return (
          <div className="code-block">
            <div className="code-header">
              <span className="language-badge">{codeLanguage}</span>
              <div className="code-header-actions">
                {canRun && (
                  <button
                    type="button"
                    className="copy-button run-code-button"
                    onClick={() => onRunCode(message.content)}
                    aria-label={t('runCode')}
                  >
                    <Play size={13} fill="currentColor" /> {t('runCode')}
                  </button>
                )}
                <button
                  type="button"
                  className="copy-button"
                  onClick={() => handleCopyCode(codeString)}
                  aria-label={t('copyCode')}
                >
                  {copiedIndex === `${index}-code` ? (
                    <>
                      <Check size={14} /> {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> {t('copy')}
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre><code className={`language-${codeLanguage}`}>{codeString}</code></pre>
          </div>
        );
      },
      [copiedIndex, detectLanguage, handleCopyCode, index, message.content, onRunCode, t]
    );

    return (
      <div className={`message ${message.role}`}>
        <div className="message-wrapper">
          <div className="message-avatar">
            <div className="avatar-icon" title={isUser ? t('you') : modelMeta.name}>
              <AvatarIcon size={16} aria-hidden="true" />
            </div>
          </div>

          <div className="message-content-wrapper">
            <div className={`message-content ${message.isError ? 'message-error' : ''}`}>
              {isImageResult && message.expired ? (
                <div className="image-expired">
                  <ImageOff size={18} aria-hidden="true" />
                  <div className="image-expired-body">
                    <p>{t('imageExpired')}</p>
                    {(message.originalPrompt || message.prompt) && (
                      <span className="image-expired-prompt">
                        {message.originalPrompt || message.prompt}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="image-action-button"
                    onClick={() => onRegenerate(index)}
                  >
                    <RefreshCw size={15} />
                    <span>{t('regenerate')}</span>
                  </button>
                </div>
              ) : isImageResult ? (
                <>
                  <div className="image-result">
                    {!imageReady && (
                      <div className="image-loading">
                        <Loader2 className="spinner" size={32} />
                        <p>{t('loadingImage')}</p>
                      </div>
                    )}
                    <img
                      src={message.content}
                      alt={message.originalPrompt || message.prompt || t('prompt')}
                      loading="lazy"
                      onLoad={() => onImageLoad(index)}
                      onError={() => onImageError(index)}
                      style={{ display: imageReady ? 'block' : 'none' }}
                    />
                    {imageReady && (message.originalPrompt || message.prompt) && (
                      <div className="image-prompt-overlay">
                        <p>
                          <strong>{t('prompt')}:</strong>{' '}
                          {message.originalPrompt || message.prompt}
                        </p>
                      </div>
                    )}
                  </div>

                  {imageReady && (
                    <div className="image-actions">
                      <button
                        type="button"
                        className="image-action-button"
                        onClick={() => onDownloadImage(message.content, message.prompt)}
                      >
                        <Download size={18} />
                        <span>{t('download')}</span>
                      </button>
                      <button
                        type="button"
                        className="image-action-button"
                        onClick={() => onCopy(message.content, index)}
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check size={18} /> <span>{t('copied')}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={18} /> <span>{t('copyUrl')}</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="image-action-button"
                        onClick={() => onRegenerate(index)}
                      >
                        <RefreshCw size={18} />
                        <span>{t('regenerate')}</span>
                      </button>
                    </div>
                  )}
                </>
              ) : isUser ? (
                <p className="user-text" dir={direction}>
                  {message.content}
                </p>
              ) : (
                <div className="markdown-content" dir={direction}>
                  {message.isError && <AlertCircle size={16} className="error-icon" />}
                  {message.streaming ? (
                    <div className="streaming-plain-text">
                      {message.content}
                      <span className="streaming-cursor" aria-hidden="true" />
                    </div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ children }) => <>{children}</>,
                        a: ({ children, ...props }) => (
                          <a {...props} target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                        code: renderCode,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
              )}

              {!isUser && (message.artifactBuilding || message.artifactId || message.artifactError) && (
                message.artifactId ? (
                  <button
                    type="button"
                    className="artifact-message-card"
                    onClick={() => onOpenArtifact?.(message.artifactId)}
                  >
                    <span className="artifact-card-icon"><WorkspaceIcon size={17} /></span>
                    <span className="artifact-card-copy">
                      <strong>{message.artifactTitle || t('workspaceTitle')}</strong>
                      <small>{t('openWorkspace')}</small>
                    </span>
                    <span className="artifact-card-action">{t('preview')}</span>
                  </button>
                ) : (
                  <div className={`artifact-message-status ${message.artifactError ? 'error' : ''}`}>
                    <span className={message.artifactBuilding ? 'workspace-spinner' : ''}>
                      {!message.artifactBuilding && <WorkspaceIcon size={16} />}
                    </span>
                    {message.artifactError ? t('artifactInvalid') : t('artifactBuilding')}
                  </div>
                )
              )}
            </div>

            {!isUser && message.type === 'text' && !message.streaming && (
              <div className="message-actions">
                <button
                  type="button"
                  className="message-action-button"
                  onClick={() => onCopy(message.content, index)}
                  title={t('copyMessage')}
                  aria-label={t('copyMessage')}
                >
                  {copiedIndex === index ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  type="button"
                  className="message-action-button"
                  onClick={() => onRegenerate(index)}
                  title={t('regenerate')}
                  aria-label={t('regenerate')}
                >
                  <RefreshCw size={16} />
                  <span className="button-text">{t('regenerate')}</span>
                </button>
                {message.modelUsed && (
                  <span className="message-model-tag">{modelMeta.name}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
