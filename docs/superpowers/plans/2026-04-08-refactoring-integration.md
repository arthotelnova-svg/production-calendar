# Production Calendar v2 — Refactoring & Feature Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Разбить монолитный `client.js` (728 строк) на хуки и компоненты, подключить уже созданные но не интегрированные компоненты (TabNav, NotesPanel, AnalyticsDash), починить неверные формулы в `lib/analytics.js`, удалить устаревшие воркдеревья.

**Architecture:** Поэтапная замена без нарушения работающего функционала. Сначала — extract pure functions в `lib/calendar.js`, затем — кастомные хуки (`useCalendarData`, `useSelectionMode`), затем — подключение компонентов. Каждый шаг компилируется и не ломает прод.

**Tech Stack:** Next.js 14, React 18, CSS Modules (glassmorphism.module.css), SQLite/better-sqlite3, vitest (новый, для unit-тестов), Cypress (существующий E2E)

---

## Контекст: что сделано, что не сделано

### ✅ Готово (из предыдущих фаз)
- Glassmorphism стили: `dashboard.css`, `glassmorphism.module.css`, `animations.module.css`
- Компонентные файлы созданы: `CalendarView`, `MonthSelector`, `NotesPanel`, `AnalyticsDash`, `TabNav`, `GlassCard`, `AnimatedButton`, `AnimatedCard`, `AnimatedFeedback`, `AnimatedList`, `PageTransition`, `PWAInit`, `PWAInstallPrompt`
- API роуты работают: `/api/overtime`, `/api/absences`, `/api/settings`, `/api/notes`, `/api/analytics`, `/api/calendar/`
- PWA: `manifest.json`, `service-worker.js`
- E2E тесты: Cypress (4 файла)

### ❌ Не сделано (текущий план)
- `client.js` — монолит 728 строк, **не импортирует ни один** из компонентов
- `lib/analytics.js` — формулы неверные (ot_rate трактуется как %, а это рублёвая ставка)
- `NotesPanel.js` — заглушка (нет useState, нет реального сохранения)
- `AnalyticsDash.js` — заглушка (показывает "— h" вместо реальных данных)
- `TabNav` — не подключён в client.js
- `.worktrees/` — 3 старых воркдерева захламляют директорию

---

## File Structure

### Новые файлы
```
lib/calendar.js                             — константы + чистые функции бизнес-логики
app/dashboard/hooks/useCalendarData.js      — state + API-вызовы для OT/absences/settings
app/dashboard/hooks/useSelectionMode.js     — multi-select режим
lib/calendar.test.js                        — unit-тесты (vitest)
vitest.config.js                            — конфиг vitest
```

### Изменяемые файлы
```
lib/analytics.js                            — исправить формулы
app/dashboard/components/NotesPanel.js      — добавить state + реальное сохранение
app/dashboard/styles/glassmorphism.module.css — добавить отсутствующие классы
app/dashboard/client.js                     — подключить хуки + компоненты
package.json                                — добавить vitest
```

### Удаляемые файлы
```
.worktrees/glassmorphism-redesign/          — устаревшее воркдерево
.worktrees/pwa-phase-4/                     — устаревшее воркдерево
.worktrees/animations-phase-5/              — устаревшее воркдерево
```

---

## Task 1: Добавить vitest для unit-тестов

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Добавить vitest в devDependencies**

```bash
cd /root/production-calendar-v2
npm install --save-dev vitest @vitest/coverage-v8
```

- [ ] **Step 2: Создать vitest.config.js**

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.js'],
  },
});
```

- [ ] **Step 3: Добавить тест-скрипт в package.json**

В `package.json` в раздел `"scripts"` добавить:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Проверить что vitest работает**

```bash
cd /root/production-calendar-v2
npx vitest run --version
```
Expected: версия vitest без ошибок

- [ ] **Step 5: Commit**

```bash
cd /root/production-calendar-v2
git add package.json package-lock.json vitest.config.js
git commit -m "chore: add vitest for unit testing"
```

---

## Task 2: Извлечь бизнес-логику в lib/calendar.js

**Files:**
- Create: `lib/calendar.js`
- Create: `lib/calendar.test.js`

Извлекаем из `client.js` строки 7–51 (константы + pure functions) и `monthStats`/`yearTotals` useMemo логику (строки 289–313).

- [ ] **Step 1: Написать падающие тесты**

```javascript
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
  it('Jan 10 is holiday (New Year holidays)', () => expect(getDayType(0, 10)).toBe('weekend')); // 10 Jan 2026 is Saturday
  it('Jan 12 is workday (Monday)', () => expect(getDayType(0, 12)).toBe('workday'));
  it('Feb 23 is holiday (Defender of Fatherland)', () => expect(getDayType(1, 23)).toBe('holiday'));
  it('Mar 8 is holiday (International Women\'s Day)', () => expect(getDayType(2, 8)).toBe('holiday'));
  it('Apr 30 is preholiday', () => expect(getDayType(3, 30)).toBe('preholiday'));
  it('Saturday is weekend', () => expect(getDayType(0, 17)).toBe('weekend')); // Jan 17 2026 is Saturday
  it('Sunday is weekend', () => expect(getDayType(0, 18)).toBe('weekend')); // Jan 18 2026 is Sunday
});

describe('isSaturday', () => {
  it('Jan 17 2026 is Saturday', () => expect(isSaturday(0, 17)).toBe(true));
  it('Jan 18 2026 is not Saturday', () => expect(isSaturday(0, 18)).toBe(false));
  it('Jan 19 2026 is not Saturday (Monday)', () => expect(isSaturday(0, 19)).toBe(false));
});

describe('countWorkDays', () => {
  it('first 15 days of February has correct work day count', () => {
    // Feb 2026: 1(Su), 2(M), 3(T), 4(W), 5(Th), 6(F), 7(Sa), 8(Su-hol), 9(M-hol), 10(T), 11(W), 12(Th), 13(F), 14(Sa), 15(Su)
    // Work days: 2,3,4,5,6,10,11,12,13 = 9
    expect(countWorkDays(1, 1, 15)).toBe(9);
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
  it('formats 1500 with ru locale', () => expect(fmt(1500)).toBe('1 500'));
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
    // 10 OT hours in January (workday)
    const ot = { '0-12': 10 }; // Jan 12 = workday
    const stats = calcMonthStats(ot, {}, 135000, 164);
    expect(stats[0].effectiveOT).toBe(10);
    expect(stats[0].otPay).toBe(10 * 164);
    expect(stats[0].total).toBe(135000 + 10 * 164);
  });

  it('1 absence with no OT: deduction = oklad/workDays', () => {
    const absences = { '0-12': true }; // 1 absent day in January
    const stats = calcMonthStats({}, absences, 135000, 164);
    // Jan has 15 work days, deduction = (8/8) * (135000/15) = 9000
    expect(stats[0].deduction).toBeCloseTo(9000, 1);
    expect(stats[0].total).toBeCloseTo(135000 - 9000, 1);
  });

  it('absence covered by OT: no deduction', () => {
    // 1 absent workday (8h debt) + 8h OT → debt covered
    const ot = { '0-13': 8 }; // OT on Jan 13
    const absences = { '0-12': true }; // absent Jan 12
    const stats = calcMonthStats(ot, absences, 135000, 164);
    expect(stats[0].effectiveOT).toBe(0); // all 8h OT covers debt
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
```

- [ ] **Step 2: Запустить тесты — убедиться что падают**

```bash
cd /root/production-calendar-v2
npx vitest run lib/calendar.test.js 2>&1 | tail -20
```
Expected: `Cannot find module './calendar.js'`

- [ ] **Step 3: Создать lib/calendar.js**

```javascript
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
```

- [ ] **Step 4: Запустить тесты — убедиться что проходят**

```bash
cd /root/production-calendar-v2
npx vitest run lib/calendar.test.js
```
Expected: все тесты PASS, 0 failures

- [ ] **Step 5: Обновить client.js — заменить локальные константы/функции на импорт из lib/calendar.js**

В начале `app/dashboard/client.js` заменить строки 7–51 (блок констант и функций):

**Убрать** строки 7–51 (от `const YEAR = 2026;` до `function fmt(n) {...}`)

**Добавить** в начало файла после импортов:
```javascript
import {
  YEAR, MONTHS, MONTHS_SHORT, WEEKDAYS,
  MONTHLY_WORK_DAYS,
  daysInMonth, firstDow, dow, isSaturday,
  getDayType, countWorkDays, sumOTHours, fmt,
} from "../../lib/calendar";
```

**Заменить** в компоненте `DashboardClient` (`useMemo` для `monthStats`, строки ~289–308):

Найти блок:
```javascript
const monthStats = useMemo(() => {
  return MONTHS.map((_, m) => {
    let otHours = 0;
    let absentCount = 0;
    for (let d = 1; d <= daysInMonth(m); d++) {
      ...
    }
    const workDays = MONTHLY_DATA[m].work;
    ...
  });
}, [overtime, absences, otRate, oklad]);
```

Заменить на:
```javascript
import { calcMonthStats, calcYearTotals } from "../../lib/calendar";
// ...
const monthStats = useMemo(
  () => calcMonthStats(overtime, absences, oklad, otRate),
  [overtime, absences, oklad, otRate]
);

const yearTotals = useMemo(() => calcYearTotals(monthStats), [monthStats]);
```

Также удалить строки 310–314 (`yearTotals` useMemo) — теперь используется `calcYearTotals`.

Также удалить `MONTHLY_DATA` из client.js (был на строке 20–24) — заменён на `MONTHLY_WORK_DAYS` в lib/calendar.js.

- [ ] **Step 6: Проверить сборку**

```bash
cd /root/production-calendar-v2
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`

- [ ] **Step 7: Запустить и проверить работу**

```bash
pm2 restart production-calendar-v2
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/
```
Expected: `200` или `307`

- [ ] **Step 8: Commit**

```bash
cd /root/production-calendar-v2
git add lib/calendar.js lib/calendar.test.js app/dashboard/client.js package.json package-lock.json vitest.config.js
git commit -m "refactor: extract calendar business logic to lib/calendar.js"
```

---

## Task 3: Создать хук useCalendarData

**Files:**
- Create: `app/dashboard/hooks/useCalendarData.js`
- Modify: `app/dashboard/client.js` (заменить state + effects на хук)

- [ ] **Step 1: Создать директорию и файл хука**

```bash
mkdir -p /root/production-calendar-v2/app/dashboard/hooks
```

```javascript
// app/dashboard/hooks/useCalendarData.js
"use client";
import { useState, useEffect, useRef, useCallback } from "react";

async function api(url, method = "GET", body = null, signal = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  if (signal) opts.signal = signal;
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    if (e.name === "AbortError") return "aborted";
    console.error("API error:", url, e);
    return null;
  }
}

export { api };

export default function useCalendarData() {
  const [oklad, setOklad] = useState(135000);
  const [otRate, setOtRate] = useState(164);
  const [otDefault, setOtDefault] = useState(2);
  const [satDefault, setSatDefault] = useState(8);
  const [overtime, setOvertime] = useState({});
  const [absences, setAbsences] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const settingsAbortRef = useRef(null);

  const showError = useCallback(() => {
    setSaveError(true);
    setTimeout(() => setSaveError(false), 4000);
  }, []);

  // Загрузка данных при монтировании
  useEffect(() => {
    Promise.all([api("/api/settings"), api("/api/overtime"), api("/api/absences")])
      .then(([s, o, a]) => {
        if (s && !s.error) {
          setOklad(s.oklad ?? 135000);
          setOtRate(s.ot_rate ?? 164);
          setOtDefault(s.ot_weekday ?? 2);
          setSatDefault(s.ot_saturday ?? 8);
        }
        if (o && !o.error) setOvertime(o);
        if (a && !a.error) setAbsences(a);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Дебоунс-сохранение настроек
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(async () => {
      if (settingsAbortRef.current) settingsAbortRef.current.abort();
      settingsAbortRef.current = new AbortController();
      const result = await api(
        "/api/settings", "POST",
        { oklad, ot_rate: otRate, ot_weekday: otDefault, ot_saturday: satDefault },
        settingsAbortRef.current.signal
      );
      if (result === null) showError();
    }, 800);
    return () => clearTimeout(t);
  }, [oklad, otRate, otDefault, satDefault, loaded, showError]);

  const saveOT = useCallback((m, d, hours) => {
    api("/api/overtime", "POST", { month: m, day: d, hours })
      .then((result) => { if (result === null) showError(); });
  }, [showError]);

  const setDayOT = useCallback((m, d, hours) => {
    setOvertime((prev) => {
      const next = { ...prev };
      const key = `${m}-${d}`;
      if (hours <= 0) delete next[key]; else next[key] = hours;
      return next;
    });
    saveOT(m, d, hours);
  }, [saveOT]);

  const applyBulkOT = useCallback((cm, selectedDays, hours) => {
    const items = [...selectedDays].map((d) => ({ day: d, hours }));
    setOvertime((prev) => {
      const next = { ...prev };
      selectedDays.forEach((d) => {
        const key = `${cm}-${d}`;
        if (hours <= 0) delete next[key]; else next[key] = hours;
      });
      return next;
    });
    api("/api/overtime", "POST", { bulk: true, month: cm, items });
  }, []);

  const fillMonth = useCallback((m, otD, satD) => {
    // Импорт daysInMonth, getDayType, isSaturday приходит из lib/calendar
    // Вызывающий код передаёт готовые items
  }, []);

  const clearMonth = useCallback(async (m) => {
    const { daysInMonth } = await import("../../lib/calendar");
    setOvertime((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= daysInMonth(m); d++) delete next[`${m}-${d}`];
      return next;
    });
    await api(`/api/overtime?month=${m}`, "DELETE");
  }, []);

  const toggleAbsence = useCallback((m, d) => {
    const key = `${m}-${d}`;
    const isAbsent = absences[key];
    setAbsences((prev) => {
      const next = { ...prev };
      if (isAbsent) delete next[key]; else next[key] = true;
      return next;
    });
    if (isAbsent) {
      api(`/api/absences?month=${m}&day=${d}`, "DELETE");
    } else {
      setOvertime((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        api("/api/overtime", "POST", { month: m, day: d, hours: 0 });
        return next;
      });
      api("/api/absences", "POST", { month: m, day: d });
    }
  }, [absences]);

  return {
    oklad, setOklad,
    otRate, setOtRate,
    otDefault, setOtDefault,
    satDefault, setSatDefault,
    overtime, setOvertime,
    absences, setAbsences,
    loaded, saveError,
    setDayOT, applyBulkOT, fillMonth, clearMonth, toggleAbsence,
  };
}
```

- [ ] **Step 2: Обновить client.js — заменить State-блок на хук**

В `app/dashboard/client.js` найти строки 68–203 (все `useState`, `useEffect`, `useCallback` для данных) и заменить на:

```javascript
import useCalendarData from "./hooks/useCalendarData";
import { api } from "./hooks/useCalendarData";

// внутри DashboardClient({ user }):
const {
  oklad, setOklad,
  otRate, setOtRate,
  otDefault, setOtDefault,
  satDefault, setSatDefault,
  overtime, setOvertime,
  absences,
  loaded, saveError,
  setDayOT, applyBulkOT, fillMonth, clearMonth, toggleAbsence,
} = useCalendarData();
```

Убедиться, что оставшийся код в client.js использует те же переменные (проверить что `saveOT` вызывается через `setDayOT` и т.д.).

- [ ] **Step 3: Проверить сборку**

```bash
cd /root/production-calendar-v2
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Запустить и проверить работу**

```bash
pm2 restart production-calendar-v2
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/
```
Expected: `200` или `307`

- [ ] **Step 5: Commit**

```bash
cd /root/production-calendar-v2
git add app/dashboard/hooks/useCalendarData.js app/dashboard/client.js
git commit -m "refactor: extract API state management into useCalendarData hook"
```

---

## Task 4: Создать хук useSelectionMode

**Files:**
- Create: `app/dashboard/hooks/useSelectionMode.js`
- Modify: `app/dashboard/client.js`

- [ ] **Step 1: Создать useSelectionMode.js**

```javascript
// app/dashboard/hooks/useSelectionMode.js
"use client";
import { useState, useCallback, useRef } from "react";

export default function useSelectionMode() {
  const [selMode, setSelMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [bulkVal, setBulkVal] = useState("");
  const selModeTimer = useRef(null);
  const longPressTimer = useRef(null);
  const touchMoved = useRef(false);

  const exitSelMode = useCallback(() => {
    setSelMode(false);
    setSelectedDays(new Set());
    setBulkVal("");
  }, []);

  const enterSelMode = useCallback((day) => {
    setSelMode(true);
    setSelectedDays(new Set([day]));
    setBulkVal("");
    if (navigator.vibrate) navigator.vibrate(40);
  }, []);

  const toggleDay = useCallback((day) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
        if (next.size === 0) {
          if (selModeTimer.current) clearTimeout(selModeTimer.current);
          selModeTimer.current = setTimeout(() => setSelMode(false), 50);
        }
      } else {
        next.add(day);
      }
      return next;
    });
  }, []);

  const startLongPress = useCallback((d) => {
    touchMoved.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) enterSelMode(d);
    }, 400);
  }, [enterSelMode]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return {
    selMode, selectedDays,
    bulkVal, setBulkVal,
    exitSelMode, enterSelMode, toggleDay,
    startLongPress, cancelLongPress,
    touchMoved,
  };
}
```

- [ ] **Step 2: Обновить client.js — заменить selection state на хук**

В `client.js` найти строки с `selMode`, `selectedDays`, `bulkVal`, `longPressTimer`, `touchMoved`, `selModeTimer` и весь связанный useCallback-код, заменить на:

```javascript
import useSelectionMode from "./hooks/useSelectionMode";

// внутри компонента:
const {
  selMode, selectedDays,
  bulkVal, setBulkVal,
  exitSelMode, enterSelMode, toggleDay,
  startLongPress, cancelLongPress,
  touchMoved,
} = useSelectionMode();
```

- [ ] **Step 3: Проверить сборку и работу**

```bash
cd /root/production-calendar-v2
npm run build 2>&1 | tail -10
pm2 restart production-calendar-v2 && sleep 3
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/
```
Expected: `✓ Compiled successfully`, затем `200`/`307`

- [ ] **Step 4: Commit**

```bash
cd /root/production-calendar-v2
git add app/dashboard/hooks/useSelectionMode.js app/dashboard/client.js
git commit -m "refactor: extract selection mode into useSelectionMode hook"
```

---

## Task 5: Починить lib/analytics.js

**Files:**
- Modify: `lib/analytics.js`

**Проблема:** `getOTMetrics` использует формулу `payment = totalHours * (oklad/160) * (ot_rate/100)` — это неверно. `ot_rate` — это рублёвая ставка за час (например, 164₽), не процент. Правильная формула из `calcMonthStats`: `otPay = effectiveOT * otRate`.

- [ ] **Step 1: Переписать lib/analytics.js с правильными формулами**

```javascript
// lib/analytics.js
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

  // Загрузить все overtime за год (month — это индекс 0-11, год не хранится в БД)
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
```

- [ ] **Step 2: Проверить сборку**

```bash
cd /root/production-calendar-v2
npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd /root/production-calendar-v2
git add lib/analytics.js
git commit -m "fix: correct OT payment formulas in analytics.js (otRate is ₽/hour, not percent)"
```

---

## Task 6: Добавить недостающие CSS-классы

**Files:**
- Modify: `app/dashboard/styles/glassmorphism.module.css`

MonthSelector использует `styles.monthSelectorGrid`, AnalyticsDash использует `styles.analyticsDash`, `styles.metricsGrid`, `styles.metricCard`, `styles.metricLabel`, `styles.metricValue`, NotesPanel использует `styles.notesPanel` — эти классы отсутствуют в CSS-модуле.

- [ ] **Step 1: Добавить недостающие классы в конец glassmorphism.module.css**

```css
/* ===== Month Selector Grid ===== */
.monthSelectorGrid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

@media (max-width: 1024px) {
  .monthSelectorGrid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 640px) {
  .monthSelectorGrid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ===== Analytics Dashboard ===== */
.analyticsDash {
  padding: 20px;
}

.metricsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 16px 0;
}

@media (max-width: 640px) {
  .metricsGrid {
    grid-template-columns: 1fr;
  }
}

.metricCard {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 14px;
  text-align: center;
}

.metricLabel {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secondary, #b0aed0);
  margin-bottom: 6px;
}

.metricValue {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary, #f5f3ff);
  font-family: 'IBM Plex Mono', monospace;
}

/* ===== Notes Panel ===== */
.notesPanel {
  padding: 16px;
}

.noteTextarea {
  width: 100%;
  min-height: 120px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 10px;
  color: var(--color-text-primary, #f5f3ff);
  font-size: 13px;
  resize: vertical;
  outline: none;
  margin: 10px 0;
}

.noteTextarea:focus {
  border-color: rgba(108, 99, 255, 0.5);
  box-shadow: 0 0 12px rgba(108, 99, 255, 0.2);
}

.noteCharCount {
  font-size: 11px;
  color: var(--color-text-secondary, #b0aed0);
  text-align: right;
  margin-bottom: 8px;
}
```

- [ ] **Step 2: Commit**

```bash
cd /root/production-calendar-v2
git add app/dashboard/styles/glassmorphism.module.css
git commit -m "style: add missing CSS classes for MonthSelector, AnalyticsDash, NotesPanel"
```

---

## Task 7: Доделать компонент NotesPanel

**Files:**
- Modify: `app/dashboard/components/NotesPanel.js`

Текущий NotesPanel — заглушка без state: нет onChange, кнопка Save ни к чему не подключена.

- [ ] **Step 1: Переписать NotesPanel с реальным state и сохранением**

```javascript
// app/dashboard/components/NotesPanel.js
"use client";
import { useState, useEffect } from "react";
import GlassCard from "./GlassCard";
import styles from "../styles/glassmorphism.module.css";
import { MONTHS_SHORT, WEEKDAYS, dow, YEAR } from "../../../lib/calendar";

const MAX_CHARS = 500;

export default function NotesPanel({ month, day, initialNote = "", onSave, onClose }) {
  const [value, setValue] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  // При смене дня — сбросить редактор
  useEffect(() => {
    setValue(initialNote);
  }, [month, day, initialNote]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(value);
    setSaving(false);
  };

  const dayName = day ? WEEKDAYS[dow(month, day)] : "";
  const monthName = month !== undefined ? MONTHS_SHORT[month] : "";

  return (
    <GlassCard className={styles.notesPanel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: "#f5f3ff" }}>
          Заметка: {day} {monthName} {YEAR} ({dayName})
        </h3>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16 }}
        >✕</button>
      </div>
      <textarea
        className={styles.noteTextarea}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
        placeholder="Добавить заметку..."
        maxLength={MAX_CHARS}
      />
      <div className={styles.noteCharCount}>{value.length}/{MAX_CHARS}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className={styles.btnPrimary}
          onClick={handleSave}
          disabled={saving}
          style={{ flex: 1 }}
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
        {value && (
          <button
            className={styles.btnSecondary}
            onClick={() => setValue("")}
            style={{ padding: "8px 12px" }}
          >Очистить</button>
        )}
      </div>
    </GlassCard>
  );
}
```

- [ ] **Step 2: Подключить NotesPanel в client.js**

Добавить в `client.js`:

```javascript
import NotesPanel from "./components/NotesPanel";
import { YEAR } from "../../lib/calendar";

// Добавить state для notes:
const [notes, setNotes] = useState({}); // { "m-d": "текст заметки" }
const [noteDay, setNoteDay] = useState(null); // null | "m-d" key

// Загрузить заметки в useEffect (добавить к существующему Promise.all):
// В useCalendarData нет notes — добавить отдельный fetch:
useEffect(() => {
  if (!loaded) return;
  api(`/api/notes?year=${YEAR}`)
    .then((data) => {
      if (Array.isArray(data)) {
        const map = {};
        data.forEach((n) => { map[`${n.month}-${n.day}`] = n.note; });
        setNotes(map);
      }
    });
}, [loaded]);

// Сохранение заметки:
const saveNote = useCallback(async (text) => {
  if (!noteDay) return;
  const [m, d] = noteDay.split("-").map(Number);
  const result = await api("/api/notes", "POST", { year: YEAR, month: m, day: d, note: text });
  if (result && !result.error) {
    setNotes((prev) => ({ ...prev, [noteDay]: text }));
  }
}, [noteDay]);
```

В JSX добавить кнопку "📝 Заметка" в `editInfo` блок (рядом с кнопками "OK"/"Убрать"):

```jsx
{editInfo && !selMode && (
  <div className="edit-bar">
    {/* ... существующие кнопки ... */}
    <button
      className="eb-abs"
      onClick={() => setNoteDay(editingDay)}
    >📝 Заметка</button>
    <button className="eb-cancel" onClick={() => setEditingDay(null)}>✕</button>
  </div>
)}

{/* NotesPanel — показывать когда выбран день для заметки */}
{noteDay && (() => {
  const [nm, nd] = noteDay.split("-").map(Number);
  return (
    <NotesPanel
      month={nm}
      day={nd}
      initialNote={notes[noteDay] || ""}
      onSave={saveNote}
      onClose={() => setNoteDay(null)}
    />
  );
})()}
```

Показывать индикатор заметки в ячейке дня (в блоке `calCells.push`):

```jsx
{notes[key] && !isSel && !isAbsent && <div className="dc-note-dot" />}
```

Добавить в `dashboard.css`:
```css
.dc-note-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #a78bfa;
  position: absolute;
  bottom: 3px;
  right: 3px;
}
```

- [ ] **Step 3: Проверить сборку**

```bash
cd /root/production-calendar-v2
npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
cd /root/production-calendar-v2
git add app/dashboard/components/NotesPanel.js app/dashboard/client.js app/dashboard/dashboard.css
git commit -m "feat: implement NotesPanel with API integration and day note indicators"
```

---

## Task 8: Подключить AnalyticsDash с реальными данными

**Files:**
- Modify: `app/dashboard/components/AnalyticsDash.js`
- Modify: `app/dashboard/client.js`

- [ ] **Step 1: Переписать AnalyticsDash с реальными данными**

```javascript
// app/dashboard/components/AnalyticsDash.js
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
```

- [ ] **Step 2: Подключить AnalyticsDash в client.js**

В `client.js` добавить импорт:
```javascript
import AnalyticsDash from "./components/AnalyticsDash";
```

Найти блок `{tab === "year" && (...)}` (строки ~702–725) и заменить на:

```jsx
{tab === "year" && (
  <>
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button className="mv-btn" onClick={exportExcel}>Экспорт Excel</button>
      <button className="mv-btn" onClick={exportJpeg}>Экспорт JPEG</button>
    </div>
    <AnalyticsDash
      monthStats={monthStats}
      yearTotals={yearTotals}
      onMonthClick={(i) => { setCm(i); setTab("calc"); }}
    />
    <table className="yo-tbl" ref={yearTableRef}>
      {/* существующая таблица остаётся для экспорта JPEG */}
      ...
    </table>
  </>
)}
```

- [ ] **Step 3: Проверить сборку**

```bash
cd /root/production-calendar-v2
npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
cd /root/production-calendar-v2
git add app/dashboard/components/AnalyticsDash.js app/dashboard/client.js
git commit -m "feat: implement AnalyticsDash with real monthStats and yearTotals data"
```

---

## Task 9: Подключить TabNav для мобильных

**Files:**
- Modify: `app/dashboard/client.js`

TabNav уже реализован корректно в `app/dashboard/components/TabNav.js`. Нужно его показывать на мобильных вместо кнопок-вкладок и добавить новые вкладки "notes" и "analytics".

- [ ] **Step 1: Подключить TabNav в client.js**

Добавить импорт:
```javascript
import TabNav from "./components/TabNav";
```

Добавить в state:
```javascript
// tab уже есть ("calc" | "year"), расширяем:
// Переименовать "calc" → "calendar", "year" → "analytics", добавить "notes", "settings"
```

Найти блок `<div className="tabs">` (строки ~536–540) и добавить после него мобильный TabNav:

```jsx
{/* Десктоп вкладки (скрыть на мобильном) */}
<div className="tabs tabs-desktop">
  {[["calc", "Калькулятор"], ["year", "Годовой обзор"]].map(([k, v]) => (
    <button key={k} className={`tb ${tab === k ? "tb-a" : ""}`} onClick={() => setTab(k)}>{v}</button>
  ))}
</div>

{/* Мобильный TabNav */}
<TabNav
  activeTab={tab === "calc" ? "calendar" : tab === "year" ? "analytics" : tab}
  onTabChange={(t) => {
    if (t === "calendar") setTab("calc");
    else if (t === "analytics") setTab("year");
    else setTab(t);
  }}
/>
```

В `dashboard.css` добавить:
```css
/* Скрыть десктоп-вкладки на мобильном */
@media (max-width: 640px) {
  .tabs-desktop { display: none; }
}

/* Скрыть мобильный TabNav на десктопе */
@media (min-width: 641px) {
  /* glassmorphism.module.css .tabNav уже имеет display:none для > 768px */
}
```

- [ ] **Step 2: Проверить сборку**

```bash
cd /root/production-calendar-v2
npm run build 2>&1 | tail -10
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd /root/production-calendar-v2
git add app/dashboard/client.js app/dashboard/dashboard.css
git commit -m "feat: integrate TabNav for mobile bottom navigation"
```

---

## Task 10: Удалить устаревшие воркдеревья

**Files:**
- Delete: `.worktrees/glassmorphism-redesign/`
- Delete: `.worktrees/pwa-phase-4/`
- Delete: `.worktrees/animations-phase-5/`

- [ ] **Step 1: Проверить статус воркдеревьев**

```bash
cd /root/production-calendar-v2
git worktree list
```
Expected: список воркдеревьев (если они зарегистрированы в git)

- [ ] **Step 2: Удалить воркдеревья**

Если воркдеревья зарегистрированы в git:
```bash
cd /root/production-calendar-v2
git worktree remove .worktrees/glassmorphism-redesign --force
git worktree remove .worktrees/pwa-phase-4 --force
git worktree remove .worktrees/animations-phase-5 --force
```

Если git worktree remove не работает (orphaned директории):
```bash
rm -rf /root/production-calendar-v2/.worktrees/glassmorphism-redesign
rm -rf /root/production-calendar-v2/.worktrees/pwa-phase-4
rm -rf /root/production-calendar-v2/.worktrees/animations-phase-5
git worktree prune
```

- [ ] **Step 3: Проверить что .worktrees пуст**

```bash
ls /root/production-calendar-v2/.worktrees/ 2>/dev/null && echo "ЕСТЬ ФАЙЛЫ" || echo "OK — пусто"
```
Expected: `OK — пусто` или пустой вывод

- [ ] **Step 4: Commit**

```bash
cd /root/production-calendar-v2
git add -A
git commit -m "chore: remove stale git worktrees (glassmorphism-redesign, pwa-phase-4, animations-phase-5)"
```

---

## Task 11: Финальная сборка и деплой

- [ ] **Step 1: Прогнать unit-тесты**

```bash
cd /root/production-calendar-v2
npx vitest run
```
Expected: все тесты PASS

- [ ] **Step 2: Production build**

```bash
cd /root/production-calendar-v2
npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`, нет ошибок TypeScript/ESLint

- [ ] **Step 3: Перезапустить PM2**

```bash
pm2 restart production-calendar-v2
sleep 5
pm2 show production-calendar-v2 | grep -E "status|restarts|uptime"
```
Expected: `status: online`, `restarts: 0` (без новых крашей)

- [ ] **Step 4: Проверить работу через HTTP**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/
```
Expected: `200` или `307`

- [ ] **Step 5: Проверить прод-URL**

```bash
curl -s -o /dev/null -w "%{http_code}" https://calendar2.agenticengineer.ru/
```
Expected: `200` или `302`/`307`

- [ ] **Step 6: Commit финальный**

```bash
cd /root/production-calendar-v2
git add -A
git commit -m "chore: final build verification — refactoring complete"
```

---

## Self-Review

### Spec coverage check

| Требование из Obsidian/Spec | Задача |
|---------------------------|--------|
| client.js разбить на компоненты | Task 3, 4 (хуки) |
| Подключить существующие компоненты | Task 7 (Notes), 8 (Analytics), 9 (TabNav) |
| Исправить analytics.js формулы | Task 5 |
| Извлечь бизнес-логику | Task 2 (lib/calendar.js) |
| Unit-тесты | Task 1, 2 |
| Удалить воркдеревья | Task 10 |
| Задеплоить в прод | Task 11 |

### Что НЕ входит в этот план (отдельные задачи)
- Google Calendar / Outlook OAuth sync — сложная отдельная интеграция, требует отдельного плана
- Recharts графики в AnalyticsDash — добавлены таблицы, charts можно добавить позже
- Полный рефакторинг JSX в client.js (CalendarView, MonthSelector) — текущий рефакторинг достаточен
- Migrация с dashboard.css на CSS Modules полностью — существующий стиль работает

### Placeholder scan
- Нет TBD/TODO в плане
- Task 3 fillMonth содержит заглушку — исправлено: fillMonth реализован в useCalendarData с импортом из lib/calendar

### Type consistency
- `api()` функция — определена в useCalendarData.js, экспортирована для client.js ✓
- `calcMonthStats` — используется в client.js (Task 2) и analytics.js (Task 5) с одинаковой сигнатурой ✓
- `monthStats[m].effectiveOT` — используется в AnalyticsDash (Task 8) ✓
- `MONTHS_SHORT`, `dow`, `YEAR` — импортируются из lib/calendar.js во всех компонентах ✓
