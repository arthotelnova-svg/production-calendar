"use client";
import GlassCard from "./GlassCard";
import styles from "../styles/glassmorphism.module.css";
import { MONTHS_SHORT, fmt, YEAR } from "../../../lib/calendar";

export default function AnalyticsDash({ monthStats, yearTotals, onMonthClick }) {
  if (!monthStats || !yearTotals) return null;

  const currentMonth = new Date().getMonth();
  const cmStats = monthStats[currentMonth];

  return (
    <div className={styles.analyticsDash}>
      <h2 style={{ color: "#f5f3ff", marginBottom: 16 }}>Аналитика {YEAR}</h2>

      {/* Итоги года */}
      <GlassCard style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#b0aed0", marginBottom: 8 }}>Итого за год</div>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Переработка (ч)</div>
            <div className={styles.metricValue} style={{ color: "#10b981" }}>
              {fmt(yearTotals.otHours)}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Доход от ОТ (₽)</div>
            <div className={styles.metricValue} style={{ color: "#a78bfa" }}>
              {fmt(Math.round(yearTotals.otPay))}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Итого за год (₽)</div>
            <div className={styles.metricValue}>
              {fmt(Math.round(yearTotals.total))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Текущий месяц */}
      <GlassCard style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#b0aed0", marginBottom: 8 }}>
          {MONTHS_SHORT[currentMonth]} — текущий месяц
        </div>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Переработка (ч)</div>
            <div className={styles.metricValue} style={{ color: "#10b981" }}>
              {fmt(cmStats.effectiveOT)}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Пропуски (дн)</div>
            <div className={styles.metricValue} style={{ color: cmStats.absentCount > 0 ? "#ef4444" : "#6b7280" }}>
              {cmStats.absentCount}
            </div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Итого (₽)</div>
            <div className={styles.metricValue}>
              {fmt(Math.round(cmStats.total))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Таблица по месяцам */}
      <GlassCard>
        <div style={{ fontSize: 12, color: "#b0aed0", marginBottom: 12 }}>Разбивка по месяцам</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: "#b0aed0", textAlign: "left" }}>
              <th style={{ padding: "4px 8px" }}>Месяц</th>
              <th style={{ padding: "4px 8px", textAlign: "right" }}>ОТ (ч)</th>
              <th style={{ padding: "4px 8px", textAlign: "right" }}>Вычет</th>
              <th style={{ padding: "4px 8px", textAlign: "right" }}>Итого (₽)</th>
            </tr>
          </thead>
          <tbody>
            {monthStats.map((s, i) => (
              <tr
                key={i}
                onClick={() => onMonthClick && onMonthClick(i)}
                style={{
                  cursor: onMonthClick ? "pointer" : "default",
                  color: i === currentMonth ? "#a78bfa" : "#f5f3ff",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <td style={{ padding: "5px 8px" }}>{MONTHS_SHORT[i]}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: s.effectiveOT > 0 ? "#10b981" : "#6b7280" }}>
                  {s.effectiveOT || "—"}
                </td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: s.deduction > 0 ? "#ef4444" : "#6b7280" }}>
                  {s.deduction > 0 ? `−${fmt(Math.round(s.deduction))}` : "—"}
                </td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>
                  {fmt(Math.round(s.total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
