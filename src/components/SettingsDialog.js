import { useEffect, useState } from 'react';
import {
  X,
  Globe,
  Trash2,
  Moon,
  Sun,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from '../utils/translations';
import { getStorageStats } from '../utils/storage';
import { APP_CONFIG } from '../config/api';
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

  useEffect(() => {
    setStorageStats(getStorageStats());
  }, []);

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
          <h3>{t('settingsTitle')}</h3>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label={t('close')}
          >
            <X size={20} />
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
                  <span>
                    {language === 'ar' ? 'عدد المحادثات' : 'Total chats'}: {storageStats.totalChats}
                  </span>
                  {storageStats.usagePercent > 70 && (
                    <span className="storage-warning">
                      <AlertTriangle size={13} aria-hidden="true" /> {storageStats.recommendation}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

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
