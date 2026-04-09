import { getDb } from "./db";
import { MONTHS, calcMonthStats, calcYearTotals } from "./calendar";

/**
 * Получить полную статистику переработок за год.
 * Использует те же формулы что и calcMonthStats в calendar.js.
 */
export function getOTMetrics(userId, year) {
  const db = getDb();
  const settings = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(userId);
  if (!settings) return null;

  // Загрузить все overtime (month — индекс 0-11, год не хранится в БД)
  const otRows = db.prepare("SELECT month, day, hours FROM overtime WHERE user_id = ?").all(userId);
  const overtime = {};
  otRows.forEach((r) => { overtime[`${r.month}-${r.day}`] = r.hours; });

  // Загрузить пропуски
  const absRows = db.prepare("SELECT month, day FROM absences WHERE user_id = ?").all(userId);
  const absences = {};
  absRows.forEach((r) => { absences[`${r.month}-${r.day}`] = true; });

  const monthStats = calcMonthStats(overtime, absences, settings.oklad, settings.ot_rate);

  return monthStats.map((s, m) => ({
    month: m,
    monthName: MONTHS[m],
    hours: s.effectiveOT,
    payment: Math.round(s.otPay * 100) / 100,
    rate: settings.ot_rate,
    absentCount: s.absentCount,
    deduction: Math.round(s.deduction * 100) / 100,
    total: Math.round(s.total * 100) / 100,
  }));
}

/**
 * Подробная разбивка по дням для конкретного месяца.
 */
export function getMonthlyBreakdown(userId, month) {
  const db = getDb();
  const days = db
    .prepare("SELECT day, hours FROM overtime WHERE user_id = ? AND month = ? ORDER BY day")
    .all(userId, month);
  const totalHours = days.reduce((sum, d) => sum + d.hours, 0);
  return { month, monthName: MONTHS[month], totalHours, dayCount: days.length, days };
}

/**
 * Сводная статистика за год.
 */
export function getSummaryStats(userId) {
  const db = getDb();
  const settings = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(userId);
  if (!settings) return null;

  const otRows = db.prepare("SELECT month, day, hours FROM overtime WHERE user_id = ?").all(userId);
  const overtime = {};
  otRows.forEach((r) => { overtime[`${r.month}-${r.day}`] = r.hours; });

  const absRows = db.prepare("SELECT month, day FROM absences WHERE user_id = ?").all(userId);
  const absences = {};
  absRows.forEach((r) => { absences[`${r.month}-${r.day}`] = true; });

  const monthStats = calcMonthStats(overtime, absences, settings.oklad, settings.ot_rate);
  const totals = calcYearTotals(monthStats);

  return {
    totalHours: totals.otHours,
    totalPayment: Math.round(totals.otPay * 100) / 100,
    totalDeduction: Math.round(totals.deduction * 100) / 100,
    grandTotal: Math.round(totals.total * 100) / 100,
    avgPerMonth: Math.round((totals.otHours / 12) * 100) / 100,
    otRate: settings.ot_rate,
  };
}
