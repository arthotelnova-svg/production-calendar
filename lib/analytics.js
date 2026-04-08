import { getDb } from "./db";

/**
 * Calculate monthly OT metrics for a user
 * @param {string} userId - User ID
 * @param {number} year - Year to calculate
 */
export function getOTMetrics(userId, year) {
  const db = getDb();

  // Get user settings
  const settings = db
    .prepare("SELECT * FROM settings WHERE user_id = ?")
    .get(userId);

  if (!settings) {
    return null; // User not configured
  }

  const metrics = [];

  for (let month = 0; month < 12; month++) {
    // Get OT hours for month
    const otData = db
      .prepare(
        `SELECT COALESCE(SUM(hours), 0) as total FROM overtime
         WHERE user_id = ? AND month = ?`
      )
      .get(userId, month);

    const totalHours = otData.total || 0;

    // Calculate payment (formula: ot_rate * (weekday_hours * ot_weekday + saturday_hours * ot_saturday))
    // For simplified calculation: totalHours * rate per hour
    const hourlyRate = settings.oklad / 160; // Standard 8-hour, 20 work days per month = 160 hours
    const payment = totalHours * hourlyRate * (settings.ot_rate / 100);

    metrics.push({
      month,
      monthName: new Intl.DateTimeFormat("en-US", { month: "short" }).format(
        new Date(year, month, 1)
      ),
      hours: totalHours,
      payment: Math.round(payment * 100) / 100,
      rate: settings.ot_rate,
    });
  }

  return metrics;
}

/**
 * Get detailed breakdown by month
 */
export function getMonthlyBreakdown(userId, year) {
  const db = getDb();

  const months = [];

  for (let month = 0; month < 12; month++) {
    const days = db
      .prepare(
        `SELECT day, hours FROM overtime
         WHERE user_id = ? AND month = ?
         ORDER BY day`
      )
      .all(userId, month);

    const totalHours = days.reduce((sum, d) => sum + d.hours, 0);

    months.push({
      month,
      year,
      monthName: new Intl.DateTimeFormat("en-US", { month: "long" }).format(
        new Date(year, month, 1)
      ),
      totalHours,
      dayCount: days.length,
      days,
    });
  }

  return months;
}

/**
 * Get year-over-year comparison
 */
export function getYearlyComparison(userId, currentYear) {
  const db = getDb();

  const comparison = [];
  const previousYear = currentYear - 1;

  for (let year of [previousYear, currentYear]) {
    const data = db
      .prepare(
        `SELECT COALESCE(SUM(hours), 0) as total FROM overtime
         WHERE user_id = ? AND month >= 0 AND month < 12
         GROUP BY CAST(SUBSTR(month, 1, 1) AS INTEGER)`
      )
      .all(userId);

    const totalHours = db
      .prepare(
        `SELECT COALESCE(SUM(hours), 0) as total FROM overtime
         WHERE user_id = ?
         AND strftime('%Y', DATE('2000-01-01', '+' || month || ' months')) = ?`
      )
      .get(userId, year.toString());

    comparison.push({
      year,
      totalHours: totalHours?.total || 0,
    });
  }

  return comparison;
}

/**
 * Get summary statistics
 */
export function getSummaryStats(userId, year) {
  const db = getDb();

  const totalOT = db
    .prepare(
      `SELECT COALESCE(SUM(hours), 0) as total FROM overtime
       WHERE user_id = ? AND strftime('%Y', DATE('2000-01-01', '+' || month || ' months')) = ?`
    )
    .get(userId, year.toString());

  const settings = db
    .prepare("SELECT * FROM settings WHERE user_id = ?")
    .get(userId);

  const hourlyRate = settings
    ? settings.oklad / 160
    : 0;
  const totalPayment = (totalOT?.total || 0) * hourlyRate * (settings?.ot_rate / 100 || 0);

  const avgPerMonth = totalOT && totalOT.total > 0 ? totalOT.total / 12 : 0;

  return {
    year,
    totalHours: totalOT?.total || 0,
    totalPayment: Math.round(totalPayment * 100) / 100,
    avgPerMonth: Math.round(avgPerMonth * 100) / 100,
    otRate: settings?.ot_rate || 0,
  };
}
