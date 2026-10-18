import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

export interface UserProfile {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  createdAt: string;
  lastActiveAt: string;
  mathSolvedCount: number;
  sessionsCompletedCount: number;
}

const googleProvider = new GoogleAuthProvider();

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function syncUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const now = new Date().toISOString();
  try {
    const docRef = doc(db, 'users', user.uid);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const existing = snap.data() as UserProfile;
      const updated: Partial<UserProfile> = {
        lastActiveAt: now,
        email: user.email || existing.email,
        displayName: user.displayName || existing.displayName,
        photoURL: user.photoURL || existing.photoURL,
      };
      await updateDoc(docRef, updated);
      return { ...existing, ...updated };
    } else {
      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || user.email?.split('@')[0] || 'Student',
        photoURL: user.photoURL || null,
        createdAt: now,
        lastActiveAt: now,
        mathSolvedCount: 0,
        sessionsCompletedCount: 0,
      };
      await setDoc(docRef, newProfile);
      return newProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    // Fallback profile if Firestore is offline
    return {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || 'Student',
      photoURL: user.photoURL || null,
      createdAt: now,
      lastActiveAt: now,
      mathSolvedCount: 0,
      sessionsCompletedCount: 0,
    };
  }
}

export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName?.trim()) {
    try {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    } catch {
      // ignore
    }
  }
  await syncUserProfile(cred.user);
  return cred.user;
}

export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  await syncUserProfile(cred.user);
  return cred.user;
}

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  await syncUserProfile(cred.user);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function incrementUserMathCount(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      mathSolvedCount: increment(1),
      lastActiveAt: new Date().toISOString(),
    });
  } catch (err) {
    // Non-blocking error
    console.warn('Could not increment user math count:', err);
  }
}

export async function incrementUserSessionCount(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      sessionsCompletedCount: increment(1),
      lastActiveAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not increment user session count:', err);
  }
}
