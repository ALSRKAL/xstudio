// Persistent project storage. Browser builds use IndexedDB; tests/private modes
// gracefully fall back to an in-memory store.
import { APP_CONFIG } from '../config/api';

const DB_NAME = 'x-studio-artifacts';
const STORE_NAME = 'projects';
const DB_VERSION = 1;
const memory = new Map();
let databasePromise = null;

const clone = (value) => JSON.parse(JSON.stringify(value));
const makeId = () =>
  (typeof window !== 'undefined' && window.crypto?.randomUUID?.()) ||
  `artifact_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const openDatabase = () => {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('chatId', 'chatId', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return databasePromise;
};

const requestResult = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async (mode, operation) => {
  const db = await openDatabase();
  if (!db) return null;
  const transaction = db.transaction(STORE_NAME, mode);
  return operation(transaction.objectStore(STORE_NAME));
};

const normalizeFiles = (files) =>
  (Array.isArray(files) ? files : []).map((file) => ({
    path: String(file.path),
    content: String(file.content ?? ''),
  }));

export const createArtifact = async (project, { chatId, title } = {}) => {
  const now = new Date().toISOString();
  const artifact = {
    id: makeId(),
    chatId: chatId || null,
    title: String(project.title || title || 'Untitled project').slice(0, 120),
    runtime: 'static',
    entry: project.entry,
    files: normalizeFiles(project.files),
    version: 1,
    versions: [],
    createdAt: now,
    updatedAt: now,
  };
  await saveArtifact(artifact, { snapshot: false });
  return artifact;
};

export const saveArtifact = async (project, { snapshot = true } = {}) => {
  if (!project?.id) throw new Error('Artifact id is required.');
  const existing = await getArtifact(project.id);
  const versions = Array.isArray(project.versions) ? project.versions : existing?.versions || [];

  if (snapshot && existing) {
    versions.push({
      version: existing.version,
      entry: existing.entry,
      files: existing.files,
      savedAt: existing.updatedAt,
    });
  }

  const saved = {
    ...clone(project),
    files: normalizeFiles(project.files),
    versions: versions.slice(-APP_CONFIG.artifacts.maxVersions),
    version: existing ? Math.max(existing.version + 1, project.version || 1) : project.version || 1,
    updatedAt: new Date().toISOString(),
  };

  memory.set(saved.id, clone(saved));
  try {
    await withStore('readwrite', (store) => requestResult(store.put(saved)));
  } catch {
    // Memory remains authoritative for this session when storage is unavailable.
  }
  return saved;
};

export const getArtifact = async (id) => {
  if (!id) return null;
  if (memory.has(id)) return clone(memory.get(id));
  try {
    const value = await withStore('readonly', (store) => requestResult(store.get(id)));
    if (value) memory.set(id, clone(value));
    return value ? clone(value) : null;
  } catch {
    return null;
  }
};

export const getArtifactsForChat = async (chatId) => {
  const memoryMatches = [...memory.values()].filter((item) => item.chatId === chatId);
  try {
    const stored = await withStore('readonly', (store) =>
      requestResult(store.index('chatId').getAll(chatId))
    );
    const combined = new Map(memoryMatches.map((item) => [item.id, item]));
    (stored || []).forEach((item) => combined.set(item.id, item));
    return [...combined.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return memoryMatches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
};

export const getLatestArtifactForChat = async (chatId) =>
  (await getArtifactsForChat(chatId))[0] || null;

export const deleteArtifactsForChat = async (chatId) => {
  const projects = await getArtifactsForChat(chatId);
  projects.forEach((project) => memory.delete(project.id));
  const db = await openDatabase();
  if (!db) return;
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  projects.forEach((project) => store.delete(project.id));
};

export const clearArtifacts = async () => {
  memory.clear();
  try {
    await withStore('readwrite', (store) => requestResult(store.clear()));
  } catch {
    // Nothing else to clear when persistent storage is unavailable.
  }
};