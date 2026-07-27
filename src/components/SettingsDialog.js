import { useEffect, useState } from 'react';
import {
  X,
  Globe,
  Trash2,
  Moon,
  Sun,
  HardDrive,
  KeyRound,
  ExternalLink,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { useTranslation } from '../utils/translations';
import { getStorageStats } from '../utils/storage';
import { APP_CONFIG, PROVIDERS, PROVIDER_ORDER } from '../config/api';
import { fetchAvailableModels } from '../services/aiClient';
import { getApiKeys, setApiKey } from '../utils/apiKeys';
import './SettingsDialog.css';

const SettingsDialog = ({
  onClose,
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  onClearAllChats,
  appVersion = APP_CONFIG.version,
}) => {
  const { t } = useTranslation(language);
  const [storageStats, setStorageStats] = useState(null);
  const [activeProviders, setActiveProviders] = useState([]);
  const [keys, setKeys] = useState(getApiKeys);
  const [drafts, setDrafts] = useState({});
  const [savedProvider, setSavedProvider] = useState(null);

  const refreshProviders = () =>
    fetchAvailableModels({ refresh: true }).then((result) => {
      setActiveProviders([...new Set(result.models.map((model) => model.provider))]);
    });

  useEffect(() => {
    setStorageStats(getStorageStats());

    let cancelled = false;
    fetchAvailableModels().then((result) => {
      if (cancelled) return;
      setActiveProviders([...new Set(result.models.map((model) => model.provider))]);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveKey = async (provider) => {
    const draft = drafts[provider] ?? '';
    setKeys(setApiKey(provider, draft));
    setDrafts((prev) => ({ ...prev, [provider]: '' }));
    setSavedProvider(provider);
    setTimeout(() => setSavedProvider(null), 2500);
    await refreshProviders();
  };

  const handleRemoveKey = async (provider) => {
    setKeys(setApiKey(provider, ''));
    await refreshProviders();
  };

  const handleClearChats = () => {
    if (window.confirm(t('confirmClearChats'))) {
      onClearAllChats();
      setStorageStats(getStorageStats());
    }
  };
  
  const getStorageColor = () => {
    if (!storageStats) return '#10b981';
    if (storageStats.usagePercent > 90) return '#dc2626';
    if (storageStats.usagePercent > 70) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>⚙️ {t('settingsTitle')}</h3>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="settings-content">
          {/* Language Setting */}
          <div className="setting-item">
            <div className="setting-label">
              <Globe size={20} />
              <span>{t('language')}</span>
            </div>
            <div className="setting-options">
              <button
                className={`option-button ${language === 'ar' ? 'active' : ''}`}
                onClick={() => onLanguageChange('ar')}
              >
                {t('arabic')}
              </button>
              <button
                className={`option-button ${language === 'en' ? 'active' : ''}`}
                onClick={() => onLanguageChange('en')}
              >
                {t('english')}
              </button>
            </div>
          </div>

          {/* Theme Setting */}
          <div className="setting-item">
            <div className="setting-label">
              {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
              <span>{t('theme')}</span>
            </div>
            <div className="setting-options">
              <button
                className={`option-button ${theme === 'light' ? 'active' : ''}`}
                onClick={() => onThemeChange('light')}
              >
                <Sun size={16} /> {t('light')}
              </button>
              <button
                className={`option-button ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => onThemeChange('dark')}
              >
                <Moon size={16} /> {t('dark')}
              </button>
            </div>
          </div>

          {/* Storage Info */}
          {storageStats && (
            <div className="setting-item">
              <div className="setting-label">
                <HardDrive size={20} />
                <span>{language === 'ar' ? 'التخزين' : 'Storage'}</span>
              </div>
              <div className="storage-info">
                <div className="storage-bar-container">
                  <div 
                    className="storage-bar" 
                    style={{ 
                      width: `${storageStats.usagePercent}%`,
                      backgroundColor: getStorageColor()
                    }}
                  />
                </div>
                <div className="storage-details">
                  <span>{storageStats.totalSizeKB} KB / {storageStats.maxSizeKB} KB</span>
                  <span className="storage-percent" style={{ color: getStorageColor() }}>
                    {storageStats.usagePercent}%
                  </span>
                </div>
                <div className="storage-stats">
                  <span>📊 {language === 'ar' ? 'عدد المحادثات' : 'Total Chats'}: {storageStats.totalChats}</span>
                  {storageStats.usagePercent > 70 && (
                    <span className="storage-warning">
                      ⚠️ {language === 'ar' ? storageStats.recommendation : storageStats.recommendation}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Free model providers */}
          <div className="setting-item">
            <div className="setting-label">
              <KeyRound size={20} />
              <span>{t('providersTitle')}</span>
            </div>
            <p className="setting-hint">{t('providersHint')}</p>
            <p className="setting-hint key-warning">
              <ShieldAlert size={14} aria-hidden="true" /> {t('keyStorageWarning')}
            </p>

            <ul className="provider-list">
              {PROVIDER_ORDER.map((id) => {
                const provider = PROVIDERS[id];
                const hasUserKey = !!keys[id];
                const isActive = activeProviders.includes(id);

                return (
                  <li key={id} className="provider-row">
                    <div className="provider-main">
                      <span className="provider-icon" aria-hidden="true">
                        {provider.icon}
                      </span>
                      <div className="provider-info">
                        <span className="provider-name">{provider.label}</span>
                        <span className="provider-note">
                          {provider.freeTier[language] || provider.freeTier.en}
                        </span>
                      </div>
                      <span className={`provider-status ${isActive ? 'on' : 'off'}`}>
                        {isActive ? t('active') : t('notConfigured')}
                      </span>
                      <a
                        className="provider-link"
                        href={provider.signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t('getFreeKey')}
                        aria-label={`${t('getFreeKey')} - ${provider.label}`}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    {provider.envKey && (
                      <div className="provider-key-row">
                        <input
                          type="password"
                          className="provider-key-input"
                          value={drafts[id] ?? ''}
                          placeholder={hasUserKey ? t('keySaved') : t('pasteKey')}
                          onChange={(event) =>
                            setDrafts((prev) => ({ ...prev, [id]: event.target.value }))
                          }
                          autoComplete="off"
                          spellCheck="false"
                          aria-label={`${t('pasteKey')} - ${provider.label}`}
                        />
                        <button
                          type="button"
                          className="key-button"
                          onClick={() => handleSaveKey(id)}
                          disabled={!(drafts[id] ?? '').trim()}
                        >
                          {savedProvider === id ? <Check size={14} /> : t('save')}
                        </button>
                        {hasUserKey && (
                          <button
                            type="button"
                            className="key-button danger"
                            onClick={() => handleRemoveKey(id)}
                            aria-label={`${t('removeKey')} - ${provider.label}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <code className="provider-env">{provider.envKey}</code>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Clear Chats */}
          <div className="setting-item">
            <div className="setting-label">
              <Trash2 size={20} />
              <span>{t('clearData')}</span>
            </div>
            <button type="button" className="danger-button" onClick={handleClearChats}>
              <Trash2 size={18} />
              <span>{t('clearAllChats')}</span>
            </button>
          </div>

          <p className="settings-version">
            {APP_CONFIG.name} · {t('version')} {appVersion}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
