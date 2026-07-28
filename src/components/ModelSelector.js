import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Check,
  Code2,
  Eye,
  Image as ImageIcon,
  MessageSquare,
  RefreshCw,
  Search,
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

/**
 * Usage is advisory, never blocking: a missing/corrupt tracker entry must not
 * take the whole picker down.
 */
const readUsage = (model) => {
  if (model.kind === 'image' || model.keyless) return null;

  const { dailyLimit, totalLimit } = getLimitsForModel(model.id);
  if (!Number.isFinite(totalLimit)) return null;

  try {
    const stats = getModelUsageStats(model.id, dailyLimit, totalLimit);
    return {
      remaining: stats.totalRemaining,
      total: totalLimit,
      percent: Math.min(100, Math.max(0, (stats.totalUsage / totalLimit) * 100)),
      exhausted: stats.totalRemaining <= 0,
    };
  } catch {
    return null;
  }
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
    const [activeIndex, setActiveIndex] = useState(-1);
    const searchRef = useRef(null);
    const listRef = useRef(null);
    const panelRef = useRef(null);

    const isImageKind = kind === 'image';
    const activeGroups = isImageKind ? imageGroups : groups;
    const activeSelection = isImageKind ? selectedImageModel : selectedModel;
    const handleSelect = isImageKind ? onSelectImageModel : onSelectModel;

    // Follow the composer: switching to image mode should land on image models.
    useEffect(() => {
      setKind(initialKind);
    }, [initialKind]);

    useEffect(() => {
      const timer = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
      const handlePointerDown = (event) => {
        const anchor = panelRef.current?.parentElement;
        if (anchor && !anchor.contains(event.target)) onClose();
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [onClose]);

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

    // Flat order drives keyboard navigation; grouping is purely visual.
    const options = useMemo(
      () => filteredGroups.flatMap((group) => group.models),
      [filteredGroups]
    );
    const totalCount = options.length;

    // Land on the current model so Enter is a no-op instead of a surprise.
    useEffect(() => {
      const index = options.findIndex((model) => model.id === activeSelection);
      setActiveIndex(index);
    }, [options, activeSelection]);

    useEffect(() => {
      if (activeIndex < 0) return;
      const node = listRef.current?.querySelector('[data-active="true"]');
      node?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const move = useCallback(
      (delta) => {
        if (!options.length) return;
        setActiveIndex((prev) => {
          const next = prev + delta;
          if (next < 0) return options.length - 1;
          if (next >= options.length) return 0;
          return next;
        });
      },
      [options.length]
    );

    const handleKeyDown = useCallback(
      (event) => {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            move(1);
            break;
          case 'ArrowUp':
            event.preventDefault();
            move(-1);
            break;
          case 'Home':
            event.preventDefault();
            setActiveIndex(0);
            break;
          case 'End':
            event.preventDefault();
            setActiveIndex(options.length - 1);
            break;
          case 'Enter': {
            event.preventDefault();
            const model = options[activeIndex];
            if (model) handleSelect?.(model.id);
            break;
          }
          case 'Tab':
            onClose();
            break;
          default:
            break;
        }
      },
      [activeIndex, handleSelect, move, onClose, options]
    );

    const activeOptionId = activeIndex >= 0 && options[activeIndex]
      ? `model-option-${options[activeIndex].id}`
      : undefined;

    return (
      <div
        id="model-selector-popover"
        className="model-menu"
        data-composer-popover
      >
        <div className="model-menu-panel" ref={panelRef} onKeyDown={handleKeyDown}>
          <div className="model-menu-kinds" role="tablist" aria-label={t('selectModelTitle')}>
            <button
              type="button"
              role="tab"
              aria-selected={!isImageKind}
              className={`model-menu-kind ${!isImageKind ? 'active' : ''}`}
              onClick={() => setKind('text')}
            >
              <MessageSquare size={14} aria-hidden="true" />
              {t('textModels')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isImageKind}
              className={`model-menu-kind ${isImageKind ? 'active' : ''}`}
              onClick={() => setKind('image')}
            >
              <ImageIcon size={14} aria-hidden="true" />
              {t('imageModels')}
            </button>
          </div>

          <div className="model-menu-search">
            <Search size={15} aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchModels')}
              aria-label={t('searchModels')}
              aria-expanded="true"
              aria-controls="model-menu-list"
              aria-autocomplete="list"
              aria-activedescendant={activeOptionId}
              autoComplete="off"
            />
            {totalCount > 0 && (
              <span className="model-menu-count">
                {totalCount} {t('modelCount')}
              </span>
            )}
          </div>

          <div className="model-menu-list" id="model-menu-list" role="listbox" ref={listRef}>
            {totalCount === 0 && (
              <p className="model-menu-empty">
                {loading ? t('loadingModels') : t('noModelsFound')}
              </p>
            )}

            {filteredGroups.map((group) => {
              const GroupIcon = getProviderIcon(group.provider);

              return (
                <div key={group.provider} className="model-menu-group" role="group" aria-label={group.label}>
                  <div className="model-menu-group-label">
                    <GroupIcon size={12} aria-hidden="true" style={{ color: group.color }} />
                    <span>{group.label}</span>
                    {group.keyless && <span className="model-menu-free">{t('noKeyNeeded')}</span>}
                  </div>

                  {group.models.map((model) => {
                    const isSelected = activeSelection === model.id;
                    const flatIndex = options.indexOf(model);
                    const isActive = flatIndex === activeIndex;
                    const contextLabel = formatContext(model.contextWindow);
                    const usage = readUsage(model);

                    return (
                      <button
                        type="button"
                        key={model.id}
                        id={`model-option-${model.id}`}
                        role="option"
                        aria-selected={isSelected}
                        data-active={isActive || undefined}
                        className={`model-option ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelect?.(model.id)}
                        onMouseMove={() => setActiveIndex(flatIndex)}
                        tabIndex={-1}
                      >
                        <span className="model-option-check" aria-hidden="true">
                          {isSelected && <Check size={15} />}
                        </span>

                        <span className="model-option-body">
                          <span className="model-option-title">
                            <span className="model-option-name">{model.name}</span>
                            {model.speed && (
                              <span className={`model-flag speed-${model.speed}`}>
                                <Zap size={10} aria-hidden="true" />
                                {t(SPEED_KEY[model.speed] || 'medium')}
                              </span>
                            )}
                            {model.vision && (
                              <span className="model-flag" title={t('visionBadge')}>
                                <Eye size={10} aria-hidden="true" />
                                {t('visionBadge')}
                              </span>
                            )}
                            {model.tags?.includes('reasoning') && (
                              <span className="model-flag" title={t('reasoningBadge')}>
                                <Brain size={10} aria-hidden="true" />
                                {t('reasoningBadge')}
                              </span>
                            )}
                            {model.tags?.includes('code') && (
                              <span className="model-flag" title={t('codeBadge')}>
                                <Code2 size={10} aria-hidden="true" />
                                {t('codeBadge')}
                              </span>
                            )}
                          </span>

                          <span className="model-option-meta">
                            {model.vendor && (
                              <span className="model-option-vendor">{model.vendor}</span>
                            )}
                            <span className="model-option-desc">
                              {model.description || model.rawId}
                            </span>
                          </span>
                        </span>

                        <span className="model-option-side">
                          {contextLabel && (
                            <span className="model-option-context" title={`${t('contextLabel')}: ${contextLabel} ${t('tokens')}`}>
                              {contextLabel}
                            </span>
                          )}
                          {usage ? (
                            <span className={`model-option-usage ${usage.exhausted ? 'exhausted' : ''}`}>
                              <span className="model-option-usage-text">
                                {usage.remaining}/{usage.total}
                              </span>
                              <span className="model-option-usage-bar">
                                <span style={{ width: `${usage.percent}%` }} />
                              </span>
                            </span>
                          ) : (
                            model.keyless && (
                              <span className="model-option-context free">{t('unlimited')}</span>
                            )
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="model-menu-footer">
            <span className={`model-menu-status ${live ? 'live' : 'offline'}`}>
              {loading ? t('loadingModels') : live ? t('liveModels') : t('offlineModels')}
            </span>
            <button
              type="button"
              className="model-menu-refresh"
              onClick={onRefresh}
              disabled={loading}
              title={t('refreshModels')}
            >
              <RefreshCw size={13} className={loading ? 'spinning' : ''} aria-hidden="true" />
              <span>{t('refreshModels')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);

ModelSelector.displayName = 'ModelSelector';

export default ModelSelector;
