// ============================================================================
// X Studio - Model catalog
// ----------------------------------------------------------------------------
// Discovers the models the backend can serve, caches them locally so the
// selector opens instantly, and revalidates in the background.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAvailableModels } from '../services/aiClient';
import { FALLBACK_MODELS, PROVIDER_ORDER, DEFAULT_MODEL, normalizeModelId } from '../config/api';

const CACHE_KEY = 'x_studio_model_catalog';
const CACHE_TTL_MS = 30 * 60 * 1000;

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.models?.length || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.models;
  } catch {
    return null;
  }
};

const writeCache = (models) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), models }));
  } catch {
    /* storage full - not critical */
  }
};

export const useModelCatalog = () => {
  const [models, setModels] = useState(() => readCache() || FALLBACK_MODELS);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);

  const load = useCallback(async ({ refresh = false } = {}) => {
    setLoading(true);
    try {
      const result = await fetchAvailableModels({ refresh });
      setModels(result.models);
      setLive(!!result.live);
      if (result.live) writeCache(result.models);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Models grouped by provider, in a stable display order */
  const grouped = useMemo(() => {
    const byProvider = new Map();
    models.forEach((model) => {
      if (!byProvider.has(model.provider)) byProvider.set(model.provider, []);
      byProvider.get(model.provider).push(model);
    });

    return PROVIDER_ORDER.filter((id) => byProvider.has(id)).map((id) => ({
      provider: id,
      label: byProvider.get(id)[0].providerLabel,
      icon: byProvider.get(id)[0].icon,
      color: byProvider.get(id)[0].color,
      keyless: byProvider.get(id)[0].keyless,
      models: byProvider.get(id).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [models]);

  /** Resolve a stored id to a model that actually exists */
  const resolveSelected = useCallback(
    (modelId) => {
      const normalized = normalizeModelId(modelId);
      return (
        models.find((m) => m.id === normalized) ||
        models.find((m) => m.id === DEFAULT_MODEL) ||
        models[0] ||
        FALLBACK_MODELS[0]
      );
    },
    [models]
  );

  return { models, grouped, loading, live, reload: load, resolveSelected };
};
