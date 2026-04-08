'use client';

import { useEffect } from 'react';
import {
  registerServiceWorker,
  setupIndexedDB,
  setupServiceWorkerMessaging,
} from '@/lib/pwa';

/**
 * PWA Initialization Component
 * Registers service worker, sets up IndexedDB, and handles messaging
 * Place in root layout
 */
export default function PWAInit() {
  useEffect(() => {
    // Initialize PWA features
    const initPWA = async () => {
      try {
        // 1. Register service worker
        await registerServiceWorker();

        // 2. Setup IndexedDB for offline notes
        await setupIndexedDB();

        // 3. Setup messaging with service worker
        setupServiceWorkerMessaging();

        // 4. Listen for sync completion
        window.addEventListener('pwa-sync-complete', (e) => {
          console.log('[PWA] Notes synced:', e.detail);
        });

        console.log('[PWA] All features initialized');
      } catch (error) {
        console.error('[PWA] Initialization error:', error);
      }
    };

    initPWA();

    return () => {
      window.removeEventListener('pwa-sync-complete', () => {});
    };
  }, []);

  return null; // This component doesn't render anything
}
