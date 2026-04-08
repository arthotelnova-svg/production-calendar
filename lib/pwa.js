/**
 * PWA utilities for service worker registration and install prompts
 */

import React from 'react';

export async function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });
    console.log('[PWA] Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
  }
}

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = React.useState(null);
  const [isInstalled, setIsInstalled] = React.useState(false);

  React.useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (!installPrompt) return false;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
      return true;
    }

    return false;
  };

  return { installPrompt, isInstalled, triggerInstall };
}

/**
 * Setup IndexedDB for offline notes sync
 */
export function setupIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('CalendarDB', 1);

    req.onerror = () => {
      console.error('[PWA] IndexedDB error:', req.error);
      reject(req.error);
    };

    req.onsuccess = () => {
      console.log('[PWA] IndexedDB opened');
      resolve(req.result);
    };

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create notes object store
      if (!db.objectStoreNames.contains('notes')) {
        const store = db.createObjectStore('notes', { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
    };
  });
}

/**
 * Save note to IndexedDB for offline support
 */
export async function saveNoteOffline(db, note) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    const req = store.put({
      ...note,
      synced: false,
      savedAt: new Date().toISOString(),
    });

    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve(req.result);
  });
}

/**
 * Handle service worker messages
 */
export function setupServiceWorkerMessaging() {
  if (typeof window === 'undefined') return;

  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.controller?.postMessage({
    type: 'HELLO',
  });

  navigator.serviceWorker.onmessage = (event) => {
    const { type, data } = event.data;

    if (type === 'SYNC_COMPLETE') {
      console.log('[PWA] Sync complete:', data);
      // Emit event for UI to handle
      window.dispatchEvent(
        new CustomEvent('pwa-sync-complete', { detail: data })
      );
    }
  };
}

/**
 * Check if online
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Request background sync for notes
 */
export async function requestSyncNotes() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('[PWA] Background Sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-notes');
    console.log('[PWA] Background sync registered');
    return true;
  } catch (error) {
    console.error('[PWA] Background sync failed:', error);
    return false;
  }
}
