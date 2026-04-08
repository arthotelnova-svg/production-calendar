'use client';

import GlassCard from './GlassCard';
import styles from '../styles/glassmorphism.module.css';

/**
 * Analytics Dashboard - Charts, metrics, statistics
 * Phase 3 feature with Recharts integration
 */
export default function AnalyticsDash({ overtimeData, year }) {
  return (
    <GlassCard className={styles.analyticsDash}>
      <h2>Analytics — {year}</h2>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total OT</div>
          <div className={styles.metricValue}>— h</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Avg/Month</div>
          <div className={styles.metricValue}>— h</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Peak Month</div>
          <div className={styles.metricValue}>—</div>
        </div>
      </div>
      {/* Charts will be added with Recharts in Phase 3 */}
      <div className={styles.chartPlaceholder}>Charts coming in Phase 3</div>
    </GlassCard>
  );
}
