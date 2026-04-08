'use client';

import { useEffect, useState } from 'react';
import { useInstallPrompt } from '@/lib/pwa';
import styles from '../styles/glassmorphism.module.css';

/**
 * PWA Install Prompt Banner
 * Shows install button when PWA can be installed
 */
export default function PWAInstallPrompt() {
  const { installPrompt, isInstalled, triggerInstall } = useInstallPrompt();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Show prompt after 3 seconds if installable
    if (installPrompt && !isInstalled) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [installPrompt, isInstalled]);

  const handleInstall = async () => {
    const success = await triggerInstall();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || !installPrompt) {
    return null;
  }

  return (
    <div style={styles.pwaBanner}>
      <div style={styles.pwaBannerContent}>
        <div>
          <h3 style={styles.pwaBannerTitle}>Install App</h3>
          <p style={styles.pwaBannerText}>
            Install Production Calendar for offline access and home screen shortcut
          </p>
        </div>
        <div style={styles.pwaBannerButtons}>
          <button
            className={styles.btnPrimary}
            onClick={handleInstall}
            style={{ marginRight: '8px' }}
          >
            Install
          </button>
          <button
            className={styles.btnSecondary}
            onClick={handleDismiss}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
