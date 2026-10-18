import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { incrementUserMathCount } from './auth';

export interface MathHistoryStep {
  stepNumber: number;
  title: string;
  latex: string;
  explanation: string;
  pitfall?: string;
}

export interface MathHistoryItem {
  id: string;
  userId: string;
  problemText: string;
  problemLatex: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  mode: 'full_solution' | 'step_by_step_tutor' | 'check_student_attempt';
  finalAnswerPlain: string;
  finalAnswerLatex: string;
  steps: MathHistoryStep[];
  concepts: string[];
  createdAt: string;
}

const LOCAL_STORAGE_HISTORY_KEY = 'mentora.math_history.v1';

// Synchronous local storage operations
export function getLocalMathHistory(): MathHistoryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MathHistoryItem[];
  } catch {
    return [];
  }
}

export function saveLocalMathHistory(items: MathHistoryItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(items.slice(0, 100)));
  } catch (err) {
    console.warn('Failed saving local math history:', err);
  }
}

// Save math problem solution to Firestore and localStorage
export async function saveMathSolution(
  solutionData: {
    problemText: string;
    problemLatex: string;
    topic: string;
    subtopic: string;
    difficulty: string;
    mode: 'full_solution' | 'step_by_step_tutor' | 'check_student_attempt';
    finalAnswerPlain: string;
    finalAnswerLatex: string;
    steps: MathHistoryStep[];
    concepts: string[];
  },
  customUserId?: string
): Promise<MathHistoryItem> {
  const currentUid = customUserId || auth.currentUser?.uid || 'guest_user';
  const id = `sol_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const newItem: MathHistoryItem = {
    id,
    userId: currentUid,
    ...solutionData,
    createdAt: now,
  };

  // 1. Save locally immediately
  const localList = getLocalMathHistory();
  saveLocalMathHistory([newItem, ...localList.filter((item) => item.id !== id)]);

  // 2. Persist to Firestore if user is authenticated
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    const uid = auth.currentUser.uid;
    const path = `users/${uid}/mathHistory/${id}`;
    try {
      const docRef = doc(db, 'users', uid, 'mathHistory', id);
      await setDoc(docRef, newItem);
      // Increment user solved count
      incrementUserMathCount(uid).catch(() => {});
    } catch (error) {
      console.warn('Could not save to Firestore, local copy kept:', error);
    }
  }

  return newItem;
}

// Fetch math solving history from Firestore (or local fallback)
export async function fetchMathHistory(uid?: string): Promise<MathHistoryItem[]> {
  const targetUid = uid || auth.currentUser?.uid;
  const localList = getLocalMathHistory();

  if (!targetUid || (auth.currentUser && auth.currentUser.isAnonymous)) {
    return localList;
  }

  const path = `users/${targetUid}/mathHistory`;
  try {
    const collRef = collection(db, 'users', targetUid, 'mathHistory');
    const q = query(collRef, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);

    const remoteItems: MathHistoryItem[] = [];
    snap.forEach((d) => {
      remoteItems.push(d.data() as MathHistoryItem);
    });

    // Merge remote with any un-synced local items
    const mergedMap = new Map<string, MathHistoryItem>();
    remoteItems.forEach((item) => mergedMap.set(item.id, item));
    localList.forEach((item) => {
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, item);
      }
    });

    const merged = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Update local cache
    saveLocalMathHistory(merged);
    return merged;
  } catch (error) {
    console.warn('Failed fetching remote math history, using local:', error);
    return localList;
  }
}

// Delete item from history
export async function deleteMathHistoryItem(id: string): Promise<void> {
  // Remove from local storage
  const localList = getLocalMathHistory().filter((item) => item.id !== id);
  saveLocalMathHistory(localList);

  // Remove from Firestore if logged in
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    const uid = auth.currentUser.uid;
    const path = `users/${uid}/mathHistory/${id}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'mathHistory', id));
    } catch (error) {
      console.warn('Failed to delete history item from Firestore:', error);
    }
  }
}

// Sync unsynced local items up to user profile on login
export async function syncLocalHistoryToCloud(uid: string): Promise<void> {
  const localItems = getLocalMathHistory();
  if (localItems.length === 0) return;

  try {
    for (const item of localItems) {
      if (item.userId !== uid) {
        const updatedItem = { ...item, userId: uid };
        const docRef = doc(db, 'users', uid, 'mathHistory', item.id);
        await setDoc(docRef, updatedItem, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Background history sync to cloud failed:', err);
  }
}
