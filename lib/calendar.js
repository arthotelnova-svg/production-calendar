// lib/calendar.js

export const YEAR = 2026;

export const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
export const MONTHS_SHORT = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];
export const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Официальный производственный календарь 2026
export const HOLIDAYS = new Set([
  "0-1", "0-2", "0-3", "0-4", "0-5", "0-6", "0-7", "0-8", "0-9",
  "1-23", "2-8", "2-9", "4-1", "4-2", "4-3", "4-9", "4-10", "4-11",
  "5-12", "5-13", "5-14", "10-4", "11-31",
]);
export const PRE_HOLIDAY = new Set(["3-30", "4-8", "5-11", "10-3"]);

// Рабочие дни по месяцам (официальный производственный календарь 2026)
export const MONTHLY_WORK_DAYS = [15, 19, 21, 22, 19, 21, 23, 21, 22, 22, 20, 22];

export function daysInMonth(m) {
  return new Date(YEAR, m + 1, 0).getDate();
}

export function firstDow(m) {
  const d = new Date(YEAR, m, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export function dow(m, day) {
  const d = new Date(YEAR, m, day).getDay();
  return d === 0 ? 6 : d - 1;
}

export function isSaturday(m, d) {
  return new Date(YEAR, m, d).getDay() === 6;
}

export function getDayType(month, day) {
  const key = `${month}-${day}`;
  if (HOLIDAYS.has(key)) return "holiday";
  if (PRE_HOLIDAY.has(key)) return "preholiday";
  const d = new Date(YEAR, month, day).getDay();
  if (d === 0 || d === 6) return "weekend";
  return "workday";
}

export function countWorkDays(m, from, to) {
  let count = 0;
  for (let d = from; d <= to; d++) {
    const t = getDayType(m, d);
    if (t === "workday" || t === "preholiday") count++;
  }
  return count;
}

export function sumOTHours(overtime, m, from, to) {
  let hours = 0;
  for (let d = from; d <= to; d++) hours += overtime[`${m}-${d}`] || 0;
  return hours;
}

export function fmt(n) {
  return n === 0 ? "0" : n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

/**
 * Рассчитать статистику по всем 12 месяцам.
 * @param {Object} overtime - { "m-d": hours }
 * @param {Object} absences - { "m-d": true }
 * @param {number} oklad - базовый оклад
 * @param {number} otRate - ставка переработки ₽/час
 * @returns {Array} 12 объектов со статистикой
 */
export function calcMonthStats(overtime, absences, oklad, otRate) {
  return MONTHS.map((_, m) => {
    let otHours = 0;
    let absentCount = 0;
    for (let d = 1; d <= daysInMonth(m); d++) {
      const key = `${m}-${d}`;
      if (overtime[key]) otHours += overtime[key];
      if (absences[key]) absentCount++;
    }
    const workDays = MONTHLY_WORK_DAYS[m];
    const debtHours = absentCount * 8;
    const effectiveOT = Math.max(0, otHours - debtHours);
    const uncoveredHours = Math.max(0, debtHours - otHours);
    const deduction = workDays > 0 ? (uncoveredHours / 8) * (oklad / workDays) : 0;
    const adjustedOklad = oklad - deduction;
    const otPay = effectiveOT * otRate;
    const total = adjustedOklad + otPay;
    return {
      workDays, otHours, absentCount, debtHours,
      effectiveOT, deduction, adjustedOklad, otPay, oklad, total,
    };
  });
}

/**
 * Рассчитать годовые итоги из массива monthStats.
 */
export function calcYearTotals(monthStats) {
  let otHours = 0, otPay = 0, deduction = 0, oklad = 0;
  monthStats.forEach((s) => {
    otHours += s.effectiveOT;
    otPay += s.otPay;
    deduction += s.deduction;
    oklad += s.adjustedOklad;
  });
  return { otHours, otPay, deduction, oklad, total: oklad + otPay };
}
