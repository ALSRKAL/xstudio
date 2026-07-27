import { useCallback, useEffect, useRef, useState } from 'react';
import { APP_CONFIG } from '../config/api';
import {
  clearArtifacts,
  createArtifact,
  deleteArtifactsForChat,
  getArtifact,
  getLatestArtifactForChat,
  saveArtifact,
} from '../services/artifactStore';

const projectTitle = (prompt) => {
  const clean = String(prompt || '').replace(/\s+/g, ' ').trim();
  return clean.length > 70 ? `${clean.slice(0, 67)}...` : clean || 'Web project';
};

export const useArtifactWorkspace = ({ currentChatId, notify, t }) => {
  const [project, setProject] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('preview');
  const [selectedPath, setSelectedPath] = useState(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const saveTimerRef = useRef(null);
  const activeProjectRef = useRef(null);

  useEffect(() => {
    activeProjectRef.current = project;
  }, [project]);

  useEffect(() => {
    let cancelled = false;
    if (!currentChatId) {
      activeProjectRef.current = null;
      setProject(null);
      setIsOpen(false);
      return undefined;
    }
    getLatestArtifactForChat(currentChatId).then((latest) => {
      if (cancelled || activeProjectRef.current?.chatId === currentChatId) return;
      activeProjectRef.current = latest;
      setProject(latest);
      setSelectedPath(latest?.entry || latest?.files?.[0]?.path || null);
      setIsOpen(false);
    });
    return () => {
      cancelled = true;
    };
  }, [currentChatId]);

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  const acceptGeneratedProject = useCallback(async (generated, context = {}) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    try {
      const created = await createArtifact(generated, {
        chatId: context.chatId || currentChatId,
        title: projectTitle(context.prompt),
      });
      activeProjectRef.current = created;
      setProject(created);
      setSelectedPath(created.entry || created.files[0]?.path || null);
      setTab('preview');
      setIsOpen(true);
      setPreviewRevision((value) => value + 1);
      return created;
    } catch (error) {
      console.error('Artifact storage failed:', error);
      notify?.(t('artifactSaveFailed'), { type: 'error' });
      return null;
    }
  }, [currentChatId, notify, t]);

  const openArtifact = useCallback(async (artifactId) => {
    setLoading(true);
    setIsOpen(true);
    try {
      const loaded = await getArtifact(artifactId);
      if (!loaded) {
        notify?.(t('artifactNotFound'), { type: 'error' });
        setIsOpen(false);
        return;
      }
      activeProjectRef.current = loaded;
      setProject(loaded);
      setSelectedPath(loaded.entry || loaded.files[0]?.path || null);
      setTab('preview');
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  const updateFile = useCallback((path, content) => {
    setProject((current) => {
      if (!current) return current;
      const next = {
        ...current,
        files: current.files.map((file) =>
          file.path === path ? { ...file, content } : file
        ),
      };
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        saveTimerRef.current = null;
        try {
          const saved = await saveArtifact(next);
          setProject((latest) => (latest?.id === saved.id ? { ...latest, ...saved } : latest));
          setPreviewRevision((value) => value + 1);
        } catch (error) {
          console.error('Artifact autosave failed:', error);
          notify?.(t('artifactSaveFailed'), { type: 'error' });
        }
      }, APP_CONFIG.artifacts.saveDelayMs);
      return next;
    });
  }, [notify, t]);

  const closeWorkspace = useCallback(() => setIsOpen(false), []);
  const reloadPreview = useCallback(() => setPreviewRevision((value) => value + 1), []);

  const removeChatArtifacts = useCallback(async (chatId) => {
    const removingActiveProject = activeProjectRef.current?.chatId === chatId;
    if (removingActiveProject) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      activeProjectRef.current = null;
    }
    await deleteArtifactsForChat(chatId);
    if (removingActiveProject) {
      setProject(null);
      setIsOpen(false);
    }
  }, []);

  const removeAllArtifacts = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    activeProjectRef.current = null;
    await clearArtifacts();
    setProject(null);
    setIsOpen(false);
  }, []);

  return {
    project,
    isOpen,
    loading,
    tab,
    selectedPath,
    previewRevision,
    setTab,
    setSelectedPath,
    acceptGeneratedProject,
    openArtifact,
    updateFile,
    closeWorkspace,
    reloadPreview,
    removeChatArtifacts,
    removeAllArtifacts,
  };
};