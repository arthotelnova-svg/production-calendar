'use client';

import GlassCard from './GlassCard';
import styles from '../styles/glassmorphism.module.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Month Selector Grid - 12 month navigation
 * @param {Object} props
 * @param {number} props.selectedMonth - Currently selected month (0-11)
 * @param {object} props.data - OT and absence data by month index
 * @param {function} props.onSelect - Callback when month clicked
 */
export default function MonthSelector({ selectedMonth = 0, data = {}, onSelect }) {
  return (
    <div className={styles.monthSelectorGrid}>
      {MONTHS.map((month, index) => {
        const monthData = data[index] || { ot: 0, absent: 0 };
        return (
          <GlassCard
            key={month}
            isActive={selectedMonth === index}
            onClick={() => onSelect?.(index)}
            data-month={index}
            className={styles.monthCard}
            title={`${month} 2026`}
          >
            <div className={styles.monthCardTitle}>{month}</div>
            <div className={styles.monthCardYear}>2026</div>
            <div className={styles.monthCardStats}>
              <div className={styles.monthCardStatItem}>
                <span>OT:</span>
                <span className={styles.monthCardStatValue}>
                  {monthData.ot}h
                </span>
              </div>
              <div className={styles.monthCardStatItem}>
                <span>Absent:</span>
                <span className={styles.monthCardStatValue}>
                  {monthData.absent}
                </span>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
