import { memo, useMemo, useState } from 'react';
import { WORKSPACE_ICONS } from '../../config/icons';
import { compilePreview } from '../../services/previewCompiler';
import { useTranslation } from '../../utils/translations';

const {
  workspace: WorkspaceIcon,
  preview: PreviewIcon,
  file: FileIcon,
  reload: ReloadIcon,
  desktop: DesktopIcon,
  tablet: TabletIcon,
  mobile: MobileIcon,
  close: CloseIcon,
} = WORKSPACE_ICONS;

const DEVICES = [
  { id: 'desktop', icon: DesktopIcon },
  { id: 'tablet', icon: TabletIcon },
  { id: 'mobile', icon: MobileIcon },
];

const ArtifactWorkspace = memo(({
  project,
  isOpen,
  loading,
  tab,
  selectedPath,
  previewRevision,
  onTabChange,
  onSelectFile,
  onUpdateFile,
  onReload,
  onClose,
  language = 'ar',
}) => {
  const { t } = useTranslation(language);
  const [device, setDevice] = useState('desktop');
  const compiled = useMemo(
    () => (project ? compilePreview(project) : { srcDoc: '' }),
    [project]
  );
  const selectedFile = project?.files?.find((file) => file.path === selectedPath)
    || project?.files?.[0];

  if (!isOpen) return null;

  return (
    <aside className="artifact-workspace" aria-label={t('workspaceTitle')}>
      <header className="workspace-header">
        <div className="workspace-heading">
          <span className="workspace-mark"><WorkspaceIcon size={16} /></span>
          <div>
            <h2>{project?.title || t('workspaceTitle')}</h2>
            <span>{project ? `${project.files.length} ${t('files')} · v${project.version}` : t('preparingProject')}</span>
          </div>
        </div>
        <div className="workspace-header-actions">
          <button type="button" onClick={onReload} title={t('reloadPreview')} aria-label={t('reloadPreview')} disabled={!project}>
            <ReloadIcon size={16} />
          </button>
          <button type="button" onClick={onClose} title={t('closeWorkspace')} aria-label={t('closeWorkspace')}>
            <CloseIcon size={17} />
          </button>
        </div>
      </header>

      <div className="workspace-toolbar">
        <div className="workspace-tabs" role="tablist" aria-label={t('workspaceTitle')}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'preview'}
            className={tab === 'preview' ? 'active' : ''}
            onClick={() => onTabChange('preview')}
          >
            <PreviewIcon size={15} /> {t('preview')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'files'}
            className={tab === 'files' ? 'active' : ''}
            onClick={() => onTabChange('files')}
          >
            <FileIcon size={15} /> {t('files')}
          </button>
        </div>

        {tab === 'preview' && (
          <div className="device-switcher" aria-label={t('previewSize')}>
            {DEVICES.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={device === id ? 'active' : ''}
                onClick={() => setDevice(id)}
                title={t(id)}
                aria-label={t(id)}
                aria-pressed={device === id}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="workspace-body">
        {loading || !project ? (
          <div className="workspace-state">
            <span className="workspace-spinner" />
            <p>{t('preparingProject')}</p>
          </div>
        ) : tab === 'files' ? (
          <div className="workspace-files-view">
            <nav className="artifact-file-tree" aria-label={t('projectFiles')}>
              {project.files.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  className={selectedFile?.path === file.path ? 'active' : ''}
                  onClick={() => onSelectFile(file.path)}
                  title={file.path}
                >
                  <FileIcon size={14} />
                  <span>{file.path}</span>
                </button>
              ))}
            </nav>
            <div className="artifact-editor">
              <div className="editor-file-name">{selectedFile?.path}</div>
              <textarea
                value={selectedFile?.content || ''}
                onChange={(event) => selectedFile && onUpdateFile(selectedFile.path, event.target.value)}
                spellCheck="false"
                aria-label={`${t('editFile')} ${selectedFile?.path || ''}`}
              />
            </div>
          </div>
        ) : compiled.error ? (
          <div className="workspace-state workspace-error">
            <p>{t('previewFailed')}</p>
            <span>{compiled.error}</span>
          </div>
        ) : (
          <div className={`artifact-preview-frame device-${device}`}>
            <iframe
              key={`${project.id}-${previewRevision}`}
              title={project.title || t('preview')}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              srcDoc={compiled.srcDoc}
            />
          </div>
        )}
      </div>
    </aside>
  );
});

ArtifactWorkspace.displayName = 'ArtifactWorkspace';
export default ArtifactWorkspace;