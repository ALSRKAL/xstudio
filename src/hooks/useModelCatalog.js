// ============================================================================
// X Studio - Model catalog
// ----------------------------------------------------------------------------
// Discovers the text and image models the backend can serve, caches them
// locally so the picker opens instantly, and revalidates in the background.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAvailableModels } from '../services/aiClient';
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_MODEL,
  DIRECT_FALLBACK_MODELS,
  FALLBACK_IMAGE_MODELS,
  IMAGE_PROVIDER_ORDER,
  PROVIDER_ORDER,
  buildImageModelMeta,
  normalizeImageModelId,
  normalizeModelId,
  shouldUseBackendFunctions,
} from '../config/api';

const CACHE_KEY = 'x_studio_model_catalog';
const CACHE_TTL_MS = 30 * 60 * 1000;

const fallbackImageMeta = FALLBACK_IMAGE_MODELS.map(buildImageModelMeta);

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.models?.length || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return { models: parsed.models, imageModels: parsed.imageModels || fallbackImageMeta };
  } catch {
    return null;
  }
};

const writeCache = (models, imageModels) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), models, imageModels }));
  } catch {
    /* storage full - not critical */
  }
};

/** Group a flat model list by provider, in a stable display order */
const groupByProvider = (models, order) => {
  const byProvider = new Map();
  models.forEach((model) => {
    if (!byProvider.has(model.provider)) byProvider.set(model.provider, []);
    byProvider.get(model.provider).push(model);
  });

  return order
    .filter((id) => byProvider.has(id))
    .map((id) => ({
      provider: id,
      label: byProvider.get(id)[0].providerLabel,
      color: byProvider.get(id)[0].color,
      keyless: byProvider.get(id)[0].keyless,
      models: byProvider.get(id).slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));
};

export const useModelCatalog = () => {
  const [catalog, setCatalog] = useState(() => {
    if (!shouldUseBackendFunctions()) {
      return { models: DIRECT_FALLBACK_MODELS, imageModels: fallbackImageMeta };
    }
    const cached = readCache();
    return {
      models: cached?.models || DIRECT_FALLBACK_MODELS,
      imageModels: cached?.imageModels || fallbackImageMeta,
    };
  });
  const { models, imageModels } = catalog;
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);

  const load = useCallback(async ({ refresh = false } = {}) => {
    setLoading(true);
    try {
      const result = await fetchAvailableModels({ refresh });
      const nextImageModels = result.imageModels?.length ? result.imageModels : fallbackImageMeta;
      setCatalog({ models: result.models, imageModels: nextImageModels });
      setLive(!!result.live);
      if (result.live) writeCache(result.models, result.imageModels);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => groupByProvider(models, PROVIDER_ORDER), [models]);
  const imageGrouped = useMemo(
    () => groupByProvider(imageModels, IMAGE_PROVIDER_ORDER),
    [imageModels]
  );

  /** Resolve a stored text model id to one that actually exists */
  const resolveSelected = useCallback(
    (modelId) => {
      const normalized = normalizeModelId(modelId);
      return (
        models.find((m) => m.id === normalized) ||
        models.find((m) => m.id === DEFAULT_MODEL) ||
        models[0] ||
        DIRECT_FALLBACK_MODELS[0]
      );
    },
    [models]
  );

  const resolveSelectedImage = useCallback(
    (modelId) => {
      const normalized = normalizeImageModelId(modelId);
      return (
        imageModels.find((m) => m.id === normalized) ||
        imageModels.find((m) => m.id === DEFAULT_IMAGE_MODEL) ||
        imageModels[0] ||
        fallbackImageMeta[0]
      );
    },
    [imageModels]
  );

  return {
    models,
    imageModels,
    grouped,
    imageGrouped,
    loading,
    live,
    reload: load,
    resolveSelected,
    resolveSelectedImage,
  };
};
