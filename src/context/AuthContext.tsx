import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, ensureAnonymousAuth } from '../lib/firebase';
import {
  UserProfile,
  fetchUserProfile,
  syncUserProfile,
} from '../lib/auth';
import { syncLocalHistoryToCloud } from '../lib/history';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAnonymous: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup';
  isProfileModalOpen: boolean;
  isHistoryModalOpen: boolean;
  openAuthModal: (mode?: 'signin' | 'signup') => void;
  openProfileModal: () => void;
  openHistoryModal: () => void;
  closeModals: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAnonymous: true,
  isAuthModalOpen: false,
  authModalMode: 'signin',
  isProfileModalOpen: false,
  isHistoryModalOpen: false,
  openAuthModal: () => {},
  openProfileModal: () => {},
  openHistoryModal: () => {},
  closeModals: () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      const p = await fetchUserProfile(auth.currentUser.uid);
      setProfile(p);
    } else {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && !currentUser.isAnonymous) {
        // Sync profile & sync local history
        const p = await syncUserProfile(currentUser);
        setProfile(p);
        syncLocalHistoryToCloud(currentUser.uid).catch(() => {});
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Ensure initial anonymous auth if not logged in
    ensureAnonymousAuth().catch(() => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openAuthModal = useCallback((mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setIsProfileModalOpen(false);
    setIsHistoryModalOpen(false);
    setIsAuthModalOpen(true);
  }, []);

  const openProfileModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setIsHistoryModalOpen(false);
    setIsProfileModalOpen(true);
  }, []);

  const openHistoryModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setIsProfileModalOpen(false);
    setIsHistoryModalOpen(true);
  }, []);

  const closeModals = useCallback(() => {
    setIsAuthModalOpen(false);
    setIsProfileModalOpen(false);
    setIsHistoryModalOpen(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAnonymous: !user || user.isAnonymous,
        isAuthModalOpen,
        authModalMode,
        isProfileModalOpen,
        isHistoryModalOpen,
        openAuthModal,
        openProfileModal,
        openHistoryModal,
        closeModals,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
