import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Check,
  Code2,
  Eye,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useTranslation } from '../utils/translations';
import { getLimitsForModel } from '../config/api';
import { getProviderIcon } from '../config/icons';
import { getModelUsageStats } from '../utils/usageTracker';
import './ModelSelector.css';

const SPEED_KEY = { 'very-fast': 'veryFast', fast: 'fast', medium: 'medium' };

const formatContext = (tokens) => {
  if (!tokens) return null;
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(tokens % 1000000 ? 1 : 0)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return String(tokens);
};

const ModelSelector = memo(
  ({
    groups = [],
    imageGroups = [],
    selectedModel,
    selectedImageModel,
    onSelectModel,
    onSelectImageModel,
    onClose,
    onRefresh,
    loading,
    live,
    language = 'ar',
    initialKind = 'text',
  }) => {
    const { t } = useTranslation(language);
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState(initialKind);
    const searchRef = useRef(null);
    const panelRef = useRef(null);

    const isImageKind = kind === 'image';
    const activeGroups = isImageKind ? imageGroups : groups;
    const activeSelection = isImageKind ? selectedImageModel : selectedModel;
    const handleSelect = isImageKind ? onSelectImageModel : onSelectModel;

    useEffect(() => {
      const timer = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }, []);

    const filteredGroups = useMemo(() => {
      const needle = query.trim().toLowerCase();
      if (!needle) return activeGroups;

      return activeGroups
        .map((group) => ({
          ...group,
          models: group.models.filter(
            (model) =>
              model.name.toLowerCase().includes(needle) ||
              model.rawId.toLowerCase().includes(needle) ||
              group.label.toLowerCase().includes(needle)
          ),
        }))
        .filter((group) => group.models.length > 0);
    }, [activeGroups, query]);

    const totalCount = filteredGroups.reduce((sum, group) => sum + group.models.length, 0);

    const renderUsage = (model) => {
      if (model.kind === 'image') return null;
      if (model.keyless) {
        return (
          <div className="unlimited-badge">
            <Zap size={13} />
            <span>{t('unlimited')}</span>
          </div>
        );
      }

      const { dailyLimit, totalLimit } = getLimitsForModel(model.id);
      if (totalLimit === Infinity) return null;

      let stats;
      try {
        stats = getModelUsageStats(model.id, dailyLimit, totalLimit);
      } catch {
        return null;
      }

      const percent = Math.min(100, (stats.totalUsage / totalLimit) * 100);

      return (
        <div className="usage-bar-container">
          <div className="usage-text">
            <span>
              {stats.totalRemaining} {t('remaining')}
            </span>
            <span className="usage-total">/ {totalLimit}</span>
          </div>
          <div className="usage-bar">
            <div
              className="usage-bar-fill"
              style={{ width: `${percent}%`, backgroundColor: model.color }}
            />
          </div>
        </div>
      );
    };

    return (
      <div
        className="model-selector-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={t('selectModelTitle')}
        onClick={(event) => {
          if (!panelRef.current?.contains(event.target)) onClose();
        }}
      >
        <div className="model-selector-panel" ref={panelRef}>
          <div className="model-selector-header">
            <div className="model-selector-title">
              <h3>{t('selectModelTitle')}</h3>
              <span className={`catalog-status ${live ? 'live' : 'offline'}`}>
                {loading ? t('loadingModels') : live ? t('liveModels') : t('offlineModels')}
              </span>
            </div>
            <div className="model-selector-header-actions">
              <button
                type="button"
                className="icon-button"
                onClick={onRefresh}
                title={t('refreshModels')}
                aria-label={t('refreshModels')}
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? 'spinning' : ''} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={onClose}
                aria-label={t('close')}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="model-kind-tabs" role="tablist" aria-label={t('selectModelTitle')}>
            <button
              type="button"
              role="tab"
              aria-selected={!isImageKind}
              className={`model-kind-tab ${!isImageKind ? 'active' : ''}`}
              onClick={() => setKind('text')}
            >
              <MessageSquare size={14} aria-hidden="true" />
              {t('textModels')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isImageKind}
              className={`model-kind-tab ${isImageKind ? 'active' : ''}`}
              onClick={() => setKind('image')}
            >
              <ImageIcon size={14} aria-hidden="true" />
              {t('imageModels')}
            </button>
          </div>

          <div className="model-search">
            <Search size={16} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchModels')}
              aria-label={t('searchModels')}
            />
            <span className="model-search-count">
              {totalCount} {t('modelCount')}
            </span>
          </div>

          <div className="model-groups">
            {totalCount === 0 && !loading && (
              <p className="no-models">{t('noModelsFound')}</p>
            )}

            {filteredGroups.map((group) => {
              const GroupIcon = getProviderIcon(group.provider);

              return (
              <section key={group.provider} className="model-group">
                <header className="model-group-header">
                  <span className="model-group-icon" style={{ color: group.color }}>
                    <GroupIcon size={15} aria-hidden="true" />
                  </span>
                  <h4>{group.label}</h4>
                  {group.keyless && (
                    <span className="pill pill-free">
                      <Sparkles size={11} /> {t('noKeyNeeded')}
                    </span>
                  )}
                  <span className="model-group-count">{group.models.length}</span>
                </header>

                <div className="models-grid">
                  {group.models.map((model) => {
                    const isSelected = activeSelection === model.id;
                    const contextLabel = formatContext(model.contextWindow);

                    return (
                      <button
                        type="button"
                        key={model.id}
                        className={`model-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelect(model.id)}
                        aria-pressed={isSelected}
                      >
                        <div className="model-card-top">
                          <span className="model-heading">
                            <span className="model-name">{model.name}</span>
                            {model.vendor && (
                              <span className="model-vendor">{model.vendor}</span>
                            )}
                          </span>
                          {isSelected && (
                            <span className="selected-badge" aria-hidden="true">
                              <Check size={14} />
                            </span>
                          )}
                        </div>

                        {model.description && (
                          <p className="model-description" title={model.description}>
                            {model.description}
                          </p>
                        )}

                        <code className="model-raw-id">{model.rawId}</code>

                        <div className="model-meta">
                          {model.speed && (
                            <span className={`speed-badge speed-${model.speed}`}>
                              <Zap size={11} />
                              {t(SPEED_KEY[model.speed] || 'medium')}
                            </span>
                          )}
                          {model.size && <span className="pill">{model.size}</span>}
                          {contextLabel && (
                            <span className="pill" title={`${t('contextLabel')}: ${contextLabel} ${t('tokens')}`}>
                              <Layers size={11} /> {contextLabel}
                            </span>
                          )}
                          {model.vision && (
                            <span className="pill pill-vision">
                              <Eye size={11} /> {t('visionBadge')}
                            </span>
                          )}
                          {model.tags?.includes('code') && (
                            <span className="pill pill-code">
                              <Code2 size={11} /> {t('codeBadge')}
                            </span>
                          )}
                          {model.tags?.includes('reasoning') && (
                            <span className="pill pill-reasoning">
                              <Brain size={11} /> {t('reasoningBadge')}
                            </span>
                          )}
                        </div>

                        <div className="usage-info">{renderUsage(model)}</div>
                      </button>
                    );
                  })}
                </div>
              </section>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

ModelSelector.displayName = 'ModelSelector';

export default ModelSelector;
