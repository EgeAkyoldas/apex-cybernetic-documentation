export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface DocVersion {
  docType: string;
  content: string;
  timestamp: number;
  source: "generated" | "edited" | "harmonized";
}

export interface Session {
  id: string;
  name: string;
  instructionKey: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  documents: Record<string, string>;
  documentHistory: DocVersion[];
}

// ---------------------------------------------------------------------------
// IndexedDB via `idb` — replaces localStorage
// ---------------------------------------------------------------------------

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "prdbot";
const DB_VERSION = 1;
const STORE = "sessions";

// Legacy keys for migration
const LEGACY_BLOB_KEY = "prdbot_sessions";
const LEGACY_PREFIX = "prdbot_s_";
const LEGACY_INDEX_KEY = "prdbot_index";

let _dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
        }
      },
    });
  }
  return _dbPromise;
}

// ---------------------------------------------------------------------------
// One-time migration from localStorage → IndexedDB
// ---------------------------------------------------------------------------

let _migrated = false;

async function migrateFromLocalStorage(): Promise<void> {
  if (_migrated || typeof window === "undefined") return;
  _migrated = true;

  const sessions: Session[] = [];

  // 1. Try legacy single-blob format (prdbot_sessions)
  try {
    const blob = localStorage.getItem(LEGACY_BLOB_KEY);
    if (blob) {
      const parsed: Session[] = JSON.parse(blob);
      sessions.push(...parsed);
      localStorage.removeItem(LEGACY_BLOB_KEY);
    }
  } catch { /* ignore corrupt */ }

  // 2. Try per-session keys (prdbot_s_*)
  try {
    const indexRaw = localStorage.getItem(LEGACY_INDEX_KEY);
    if (indexRaw) {
      const index: Array<{ id: string }> = JSON.parse(indexRaw);
      for (const meta of index) {
        // Skip if already imported from blob
        if (sessions.some((s) => s.id === meta.id)) continue;
        const raw = localStorage.getItem(LEGACY_PREFIX + meta.id);
        if (raw) {
          try {
            sessions.push(JSON.parse(raw));
          } catch { /* skip corrupt */ }
        }
      }
      // Clean up per-session keys
      for (const meta of index) {
        localStorage.removeItem(LEGACY_PREFIX + meta.id);
      }
      localStorage.removeItem(LEGACY_INDEX_KEY);
    }
  } catch { /* ignore */ }

  if (sessions.length === 0) return;

  // Write all migrated sessions to IndexedDB
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  for (const session of sessions) {
    // Ensure documentHistory exists
    if (!session.documentHistory) session.documentHistory = [];
    await tx.store.put(session);
  }
  await tx.done;
}

// ---------------------------------------------------------------------------
// Public API — all async
// ---------------------------------------------------------------------------

export async function getSessions(): Promise<Session[]> {
  if (typeof window === "undefined") return [];
  await migrateFromLocalStorage();
  const db = await getDB();
  const all = await db.getAll(STORE);
  // Sort by updatedAt descending (most recent first)
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getSession(id: string): Promise<Session | null> {
  if (typeof window === "undefined") return null;
  await migrateFromLocalStorage();
  const db = await getDB();
  const session = await db.get(STORE, id);
  return session ?? null;
}

export async function saveSession(session: Session): Promise<void> {
  if (typeof window === "undefined") return;
  const trimmed = trimSession(session);
  const db = await getDB();
  await db.put(STORE, trimmed);
}

export async function deleteSession(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await getDB();
  await db.delete(STORE, id);
}

export function createSession(name: string, instructionKey: string): Session {
  return {
    id: crypto.randomUUID(),
    name,
    instructionKey,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    documents: {},
    documentHistory: [],
  };
}

export function generateId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Debounced save — coalesces rapid writes
// ---------------------------------------------------------------------------

let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingSession: Session | null = null;

export function debouncedSaveSession(session: Session, delayMs = 300): void {
  _pendingSession = session;
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    if (_pendingSession) {
      void saveSession(_pendingSession);
      _pendingSession = null;
    }
    _debounceTimer = null;
  }, delayMs);
}

export function flushPendingSave(): void {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  if (_pendingSession) {
    void saveSession(_pendingSession);
    _pendingSession = null;
  }
  _debounceTimer = null;
}

// ---------------------------------------------------------------------------
// Trimming — keeps session payload manageable
// ---------------------------------------------------------------------------

const MAX_VERSIONS_PER_DOC = 3;
const MAX_MESSAGES = 200;

function trimSession(session: Session): Session {
  const trimmed = { ...session };

  if (trimmed.messages.length > MAX_MESSAGES) {
    trimmed.messages = trimmed.messages.slice(-MAX_MESSAGES);
  }

  if (trimmed.documentHistory && trimmed.documentHistory.length > 0) {
    const byDocType: Record<string, DocVersion[]> = {};
    for (const v of trimmed.documentHistory) {
      (byDocType[v.docType] ??= []).push(v);
    }
    const kept: DocVersion[] = [];
    for (const versions of Object.values(byDocType)) {
      versions.sort((a, b) => b.timestamp - a.timestamp);
      kept.push(...versions.slice(0, MAX_VERSIONS_PER_DOC));
    }
    trimmed.documentHistory = kept.sort((a, b) => a.timestamp - b.timestamp);
  }

  return trimmed;
}
