import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Eye, Code2, Brain, RefreshCw, Search, Sparkles, X, Zap } from 'lucide-react';
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
  ({ groups = [], selectedModel, onSelectModel, onClose, onRefresh, loading, live, language = 'ar' }) => {
    const { t } = useTranslation(language);
    const [query, setQuery] = useState('');
    const searchRef = useRef(null);
    const panelRef = useRef(null);

    useEffect(() => {
      const timer = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }, []);

    const filteredGroups = useMemo(() => {
      const needle = query.trim().toLowerCase();
      if (!needle) return groups;

      return groups
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
    }, [groups, query]);

    const totalCount = filteredGroups.reduce((sum, group) => sum + group.models.length, 0);

    const renderUsage = (model) => {
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
                    const isSelected = selectedModel === model.id;
                    const contextLabel = formatContext(model.contextWindow);

                    return (
                      <button
                        type="button"
                        key={model.id}
                        className={`model-card ${isSelected ? 'selected' : ''}`}
                        style={{ borderColor: isSelected ? model.color : undefined }}
                        onClick={() => onSelectModel(model.id)}
                        aria-pressed={isSelected}
                      >
                        <div className="model-card-top">
                          <h5 className="model-name">{model.name}</h5>
                          {isSelected && (
                            <span className="selected-badge" aria-hidden="true">
                              <Check size={14} />
                            </span>
                          )}
                        </div>

                        <code className="model-raw-id">{model.rawId}</code>

                        <div className="model-meta">
                          <span className={`speed-badge speed-${model.speed}`}>
                            <Zap size={11} />
                            {t(SPEED_KEY[model.speed] || 'medium')}
                          </span>
                          {model.size && <span className="pill">{model.size}</span>}
                          {contextLabel && (
                            <span className="pill" title={t('contextLabel')}>
                              {contextLabel}
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
