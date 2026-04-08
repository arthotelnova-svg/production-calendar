'use client';

import styles from '../styles/glassmorphism.module.css';

/**
 * Mobile Bottom Tab Navigation
 * Phase 4 PWA feature
 */
export default function TabNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'notes', label: 'Notes', icon: '📝' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className={styles.tabNav}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onTabChange(tab.id)}
          title={tab.label}
        >
          <span className={styles.tabIcon}>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
