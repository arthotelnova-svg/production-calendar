// lib/calendar.test.js
import { describe, it, expect } from 'vitest';
import {
  YEAR,
  MONTHS,
  MONTHLY_WORK_DAYS,
  daysInMonth,
  getDayType,
  firstDow,
  dow,
  isSaturday,
  countWorkDays,
  sumOTHours,
  fmt,
  calcMonthStats,
  calcYearTotals,
} from './calendar.js';

describe('YEAR', () => {
  it('is 2026', () => expect(YEAR).toBe(2026));
});

describe('MONTHS', () => {
  it('has 12 entries starting with Январь', () => {
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS[0]).toBe('Январь');
    expect(MONTHS[11]).toBe('Декабрь');
  });
});

describe('MONTHLY_WORK_DAYS', () => {
  it('January 2026 has 15 work days', () => expect(MONTHLY_WORK_DAYS[0]).toBe(15));
  it('July 2026 has 23 work days', () => expect(MONTHLY_WORK_DAYS[6]).toBe(23));
  it('sums to 247 total work days', () => {
    const total = MONTHLY_WORK_DAYS.reduce((a, b) => a + b, 0);
    expect(total).toBe(247);
  });
});

describe('daysInMonth', () => {
  it('January has 31 days', () => expect(daysInMonth(0)).toBe(31));
  it('February 2026 has 28 days (not leap year)', () => expect(daysInMonth(1)).toBe(28));
  it('April has 30 days', () => expect(daysInMonth(3)).toBe(30));
});

describe('getDayType', () => {
  it('Jan 1 is holiday (New Year)', () => expect(getDayType(0, 1)).toBe('holiday'));
  it('Feb 23 is holiday (Defender of Fatherland)', () => expect(getDayType(1, 23)).toBe('holiday'));
  it('Mar 8 is holiday (International Women Day)', () => expect(getDayType(2, 8)).toBe('holiday'));
  it('Apr 30 is preholiday', () => expect(getDayType(3, 30)).toBe('preholiday'));
  it('Jan 17 is Saturday (weekend)', () => expect(getDayType(0, 17)).toBe('weekend'));
  it('Jan 18 is Sunday (weekend)', () => expect(getDayType(0, 18)).toBe('weekend'));
  it('Jan 12 is workday (Monday)', () => expect(getDayType(0, 12)).toBe('workday'));
});

describe('isSaturday', () => {
  it('Jan 17 2026 is Saturday', () => expect(isSaturday(0, 17)).toBe(true));
  it('Jan 18 2026 is not Saturday (Sunday)', () => expect(isSaturday(0, 18)).toBe(false));
  it('Jan 19 2026 is not Saturday (Monday)', () => expect(isSaturday(0, 19)).toBe(false));
});

describe('countWorkDays', () => {
  it('first 15 days of February has 10 work days', () => {
    // Feb 2026: 1(Su), 7(Sa), 8(Su), 14(Sa), 15(Su) are weekends — excluded
    // workdays: 2,3,4,5,6,9,10,11,12,13 = 10
    expect(countWorkDays(1, 1, 15)).toBe(10);
  });
});

describe('sumOTHours', () => {
  it('sums OT hours for a range', () => {
    const ot = { '0-1': 2, '0-5': 3, '0-10': 1.5 };
    expect(sumOTHours(ot, 0, 1, 10)).toBe(6.5);
  });
  it('returns 0 when no OT', () => {
    expect(sumOTHours({}, 0, 1, 31)).toBe(0);
  });
});

describe('fmt', () => {
  it('formats 0 as "0"', () => expect(fmt(0)).toBe('0'));
  it('formats decimal', () => expect(fmt(1.5)).toBe('1,5'));
});

describe('calcMonthStats', () => {
  it('returns 12 months', () => {
    const stats = calcMonthStats({}, {}, 135000, 164);
    expect(stats).toHaveLength(12);
  });

  it('no OT, no absences: total = oklad', () => {
    const stats = calcMonthStats({}, {}, 135000, 164);
    stats.forEach(s => expect(s.total).toBe(135000));
  });

  it('OT hours add otRate per hour to total', () => {
    const ot = { '0-12': 10 }; // Jan 12 = workday
    const stats = calcMonthStats(ot, {}, 135000, 164);
    expect(stats[0].effectiveOT).toBe(10);
    expect(stats[0].otPay).toBe(10 * 164);
    expect(stats[0].total).toBe(135000 + 10 * 164);
  });

  it('1 absence with no OT: deduction applied', () => {
    const absences = { '0-12': true }; // 1 absent day in January (15 work days)
    const stats = calcMonthStats({}, absences, 135000, 164);
    // deduction = (8/8) * (135000/15) = 9000
    expect(stats[0].deduction).toBeCloseTo(9000, 1);
    expect(stats[0].total).toBeCloseTo(135000 - 9000, 1);
  });

  it('absence covered by OT: no deduction', () => {
    const ot = { '0-13': 8 };
    const absences = { '0-12': true };
    const stats = calcMonthStats(ot, absences, 135000, 164);
    expect(stats[0].effectiveOT).toBe(0);
    expect(stats[0].deduction).toBe(0);
    expect(stats[0].total).toBe(135000);
  });
});

describe('calcYearTotals', () => {
  it('sums all months', () => {
    const stats = calcMonthStats({ '0-12': 5, '6-15': 10 }, {}, 100000, 200);
    const totals = calcYearTotals(stats);
    expect(totals.otHours).toBe(15);
    expect(totals.otPay).toBe(15 * 200);
    expect(totals.total).toBe(12 * 100000 + 15 * 200);
  });
});
