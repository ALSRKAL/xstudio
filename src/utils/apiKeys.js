// ============================================================================
// X Studio - Bring-your-own-key storage
// ----------------------------------------------------------------------------
// Keys stay in this browser's localStorage and are only forwarded to our own
// backend function, which uses them for a single upstream request and never
// stores or logs them. Server-side keys (Netlify env vars) remain the
// recommended setup for a shared deployment.
// ============================================================================

import { PROVIDERS } from '../config/api';

const STORAGE_KEY = 'x_studio_api_keys';

export const getApiKeys = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // Drop anything that is not a known provider or not a usable string.
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([provider, key]) => PROVIDERS[provider] && typeof key === 'string' && key.trim()
      )
    );
  } catch (error) {
    console.error('Could not read API keys:', error);
    return {};
  }
};

export const setApiKey = (provider, key) => {
  if (!PROVIDERS[provider]) return getApiKeys();

  const keys = getApiKeys();
  const trimmed = (key || '').trim();

  if (trimmed) keys[provider] = trimmed;
  else delete keys[provider];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (error) {
    console.error('Could not save API key:', error);
  }
  return keys;
};


