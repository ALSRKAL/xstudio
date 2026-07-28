import { memo, useMemo, useState } from 'react';
import {
  Clock,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { APP_CONFIG } from '../config/api';
import { useTranslation } from '../utils/translations';

const Sidebar = memo(({
  sidebarOpen,
  onNewChat,
  chatHistory,
  currentChatId,
  onLoadChat,
  onDeleteChat,
  onShowSettings,
  language = 'ar'
}) => {
  const { t } = useTranslation(language);
  const [search, setSearch] = useState('');

  const filteredHistory = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return chatHistory;
    return chatHistory.filter((chat) => (chat.title || '').toLowerCase().includes(needle));
  }, [chatHistory, search]);

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label={APP_CONFIG.name}>
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon-wrapper">
            <Sparkles className="logo-icon" />
          </div>
          <div>
            <h1>{APP_CONFIG.name}</h1>
            <p className="logo-subtitle">AI</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="new-chat-button"
        onClick={onNewChat}
        title={t('shortcutNewChat')}
      >
        <Plus size={20} />
        <span>{t('newChat')}</span>
      </button>

      {/* Chat History */}
      <div className="model-selector-section">
        <div className="chat-history-section">
          <div className="history-header">
            <Clock size={16} />
            <span>{t('chatHistory')}</span>
          </div>

          {chatHistory.length > 4 && (
            <div className="history-search">
              <Search size={14} aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('chatHistory')}
                aria-label={t('chatHistory')}
              />
            </div>
          )}

          <div className="history-list">
            {filteredHistory.length === 0 ? (
              <div className="no-history">
                <p>{search ? t('noModelsFound') : t('noHistory')}</p>
              </div>
            ) : (
              filteredHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={`history-item ${currentChatId === chat.id ? 'active' : ''}`}
                  onClick={() => onLoadChat(chat.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onLoadChat(chat.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-current={currentChatId === chat.id}
                >
                  <div className="history-icon">
                    {chat.mode === 'text' ? <MessageSquare size={16} /> : <ImageIcon size={16} />}
                  </div>
                  <div className="history-content">
                    <p className="history-title">{chat.title}</p>
                    <span className="history-time">
                      {new Date(chat.timestamp).toLocaleDateString(
                        language === 'ar' ? 'ar-EG' : 'en-US'
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="history-delete"
                    onClick={(e) => onDeleteChat(chat.id, e)}
                    title={t('confirmDeleteChat')}
                    aria-label={t('confirmDeleteChat')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <button type="button" className="settings-button" onClick={onShowSettings}>
          <Settings size={16} aria-hidden="true" />
          <span>{t('settings')}</span>
        </button>
        <a
          href={APP_CONFIG.contactUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="api-badge"
        >
          <Sparkles size={12} />
          <span>{t('poweredBy')} ALSRKAL</span>
        </a>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
