import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { SessionState } from './engine';
import { db, auth, ensureAnonymousAuth, handleFirestoreError, OperationType } from './firebase';

const STORAGE_KEY = 'mentora.session.v1';

let inMemoryFallback: SessionState | null = null;

// Synchronous local save (offline fallback & cache)
export function saveLocalSession(session: SessionState): void {
  try {
    const serialized = JSON.stringify(session);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    inMemoryFallback = session;
  }
}

// Synchronous local load
export function loadLocalSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return inMemoryFallback;
    }
    return JSON.parse(raw) as SessionState;
  } catch {
    return inMemoryFallback;
  }
}

// Clear local storage
export function clearLocalSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  inMemoryFallback = null;
}

// Save to both LocalStorage and Firestore
export async function saveSessionAsync(session: SessionState): Promise<void> {
  // 1. Save to localStorage immediately as offline fallback
  saveLocalSession(session);

  // 2. Persist to Firestore under sessions/{uid}/{sessionId}
  try {
    const user = await ensureAnonymousAuth();
    if (!user) return;

    const sessionDocRef = doc(db, 'sessions', user.uid, session.id);
    const path = `sessions/${user.uid}/${session.id}`;

    // Clean payload for Firestore (no undefined values)
    const payload = JSON.parse(
      JSON.stringify({
        ...session,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      })
    );

    await setDoc(sessionDocRef, payload, { merge: true });
  } catch (error) {
    // If offline or permission issue, log warning and let offline fallback take over
    console.warn('Firestore sync failed, local fallback maintained:', error);
  }
}

// Synchronous wrapper used by synchronous call sites
export function saveSession(session: SessionState): void {
  saveLocalSession(session);
  // Asynchronously trigger Firestore write
  saveSessionAsync(session).catch(() => {});
}

// Synchronous load wrapper (returns local cache first)
export function loadSession(): SessionState | null {
  return loadLocalSession();
}

// Clear session both locally and in Firestore
export function clearSession(sessionId?: string): void {
  clearLocalSession();
  if (sessionId && auth.currentUser) {
    const uid = auth.currentUser.uid;
    const path = `sessions/${uid}/${sessionId}`;
    deleteDoc(doc(db, 'sessions', uid, sessionId)).catch((err) => {
      console.warn('Firestore delete failed:', err);
    });
  }
}

// Load remote session from Firestore if available
export async function loadRemoteSession(sessionId?: string): Promise<SessionState | null> {
  try {
    const user = await ensureAnonymousAuth();
    if (!user) return loadLocalSession();

    // If specific sessionId provided
    if (sessionId) {
      const snap = await getDoc(doc(db, 'sessions', user.uid, sessionId));
      if (snap.exists()) {
        const data = snap.data() as SessionState;
        saveLocalSession(data);
        return data;
      }
    }

    // Try finding the last session from local cache ID
    const local = loadLocalSession();
    if (local?.id) {
      const snap = await getDoc(doc(db, 'sessions', user.uid, local.id));
      if (snap.exists()) {
        const data = snap.data() as SessionState;
        saveLocalSession(data);
        return data;
      }
    }

    return local;
  } catch {
    return loadLocalSession();
  }
}
