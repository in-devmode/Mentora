/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { HistoryModal } from './components/HistoryModal';
import { HomeScreen } from './components/HomeScreen';
import { CheckScreen } from './components/CheckScreen';
import { MapScreen } from './components/MapScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { SolveScreen } from './components/SolveScreen';
import {
  SessionState,
  createInitialSession,
  serveOneMoreCheck,
  startLimitsBridge,
} from './lib/engine';
import { loadSession, saveSession, clearSession, loadRemoteSession } from './lib/storage';
import { ensureAnonymousAuth } from './lib/firebase';
import { MathHistoryItem } from './lib/history';

function MainApp() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const p = window.location.pathname;
    if (p === '/solve' || p === '/check' || p === '/map' || p === '/results') {
      return p;
    }
    return '/';
  });

  const [session, setSession] = useState<SessionState | null>(() => {
    return loadSession();
  });

  const [loadedHistoryItem, setLoadedHistoryItem] = useState<MathHistoryItem | null>(null);

  // Initialize anonymous Firebase Auth and sync with remote session if available
  useEffect(() => {
    ensureAnonymousAuth()
      .then(async () => {
        const remote = await loadRemoteSession();
        if (remote) {
          setSession((prev) => {
            if (!prev || (remote.events && remote.events.length >= prev.events.length)) {
              return remote;
            }
            return prev;
          });
        }
      })
      .catch((err) => {
        console.warn('Anonymous auth initialization deferred, using local fallback:', err);
      });
  }, []);

  // Keep route in sync with window history
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p === '/solve' || p === '/check' || p === '/map' || p === '/results') {
        setCurrentPath(p);
      } else {
        setCurrentPath('/');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Update session and persist to storage
  const handleUpdateSession = useCallback((updated: SessionState) => {
    setSession(updated);
    saveSession(updated);
  }, []);

  // Start fresh check
  const handleStartCheck = useCallback(() => {
    const newSession = createInitialSession();
    handleUpdateSession(newSession);
    navigateTo('/check');
  }, [handleUpdateSession, navigateTo]);

  // Resume unfinished check
  const handleResumeCheck = useCallback(() => {
    if (!session) {
      handleStartCheck();
    } else {
      navigateTo('/check');
    }
  }, [session, handleStartCheck, navigateTo]);

  // Reset check
  const handleReset = useCallback(() => {
    clearSession(session?.id);
    const newSession = createInitialSession();
    setSession(newSession);
    navigateTo('/');
  }, [session?.id, navigateTo]);

  // "One more check" action from results or verify
  const handleOneMoreCheck = useCallback(() => {
    const active = session || createInitialSession();
    const updated = serveOneMoreCheck(active);
    handleUpdateSession(updated);
    navigateTo('/check');
  }, [session, handleUpdateSession, navigateTo]);

  // "Try the limits bridge" action from results
  const handleStartLimitsBridge = useCallback(() => {
    const active = session || createInitialSession();
    const updated = startLimitsBridge(active);
    handleUpdateSession(updated);
    navigateTo('/check');
  }, [session, handleUpdateSession, navigateTo]);

  // Select problem from History modal to load into SolveScreen
  const handleSelectHistoryProblem = useCallback(
    (item: MathHistoryItem) => {
      setLoadedHistoryItem(item);
      navigateTo('/solve');
    },
    [navigateTo]
  );

  const activeSession = session || createInitialSession();

  const renderCurrentView = () => {
    if (currentPath === '/solve') {
      return (
        <SolveScreen
          onNavigate={navigateTo}
          loadedHistoryItem={loadedHistoryItem}
        />
      );
    }

    if (currentPath === '/map') {
      return (
        <MapScreen
          session={activeSession}
          onNavigate={navigateTo}
          onReset={handleReset}
        />
      );
    }

    if (currentPath === '/results') {
      return (
        <ResultsScreen
          session={activeSession}
          onNavigate={navigateTo}
          onOneMoreCheck={handleOneMoreCheck}
          onStartLimitsBridge={handleStartLimitsBridge}
          onReset={handleReset}
        />
      );
    }

    if (currentPath === '/check') {
      return (
        <CheckScreen
          session={activeSession}
          onUpdateSession={handleUpdateSession}
          onNavigate={navigateTo}
          onNavigateHome={() => navigateTo('/')}
          onReset={handleReset}
        />
      );
    }

    return (
      <HomeScreen
        session={session}
        onNavigate={navigateTo}
        onStart={handleStartCheck}
        onResume={handleResumeCheck}
        onReset={handleReset}
      />
    );
  };

  return (
    <>
      {renderCurrentView()}
      {/* Global Modals */}
      <AuthModal />
      <ProfileModal />
      <HistoryModal onSelectProblem={handleSelectHistoryProblem} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
