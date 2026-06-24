"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import "./dashboard.css";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const MONTHS_SHORT = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Производственные календари РФ (2025-2027)
const CALENDAR_DATA = {
  2025: {
    holidays: new Set([
      "0-1", "0-2", "0-3", "0-4", "0-5", "0-6", "0-7", "0-8",
      "1-23", "2-8", "4-1", "4-2", "4-8", "4-9", "5-12", "5-13", "10-3", "10-4", "11-31"
    ]),
    preHolidays: new Set(["2-7", "3-30", "5-11", "10-1"]),
    monthly: [
      { work: 17, off: 14 }, { work: 20, off: 8 }, { work: 21, off: 10 }, { work: 22, off: 8 },
      { work: 18, off: 13 }, { work: 20, off: 10 }, { work: 23, off: 8 }, { work: 21, off: 10 },
      { work: 22, off: 8 }, { work: 23, off: 8 }, { work: 19, off: 11 }, { work: 23, off: 8 }
    ],
    totalWorkDays: 249
  },
  2026: {
    holidays: new Set([
      "0-1", "0-2", "0-3", "0-4", "0-5", "0-6", "0-7", "0-8", "0-9",
      "1-23", "2-8", "2-9", "4-1", "4-2", "4-3", "4-9", "4-10", "4-11",
      "5-12", "5-13", "5-14", "10-4", "11-31"
    ]),
    preHolidays: new Set(["3-30", "4-8", "5-11", "10-3"]),
    monthly: [
      { work: 15, off: 16 }, { work: 19, off: 9 }, { work: 21, off: 10 }, { work: 22, off: 8 },
      { work: 19, off: 12 }, { work: 21, off: 9 }, { work: 23, off: 8 }, { work: 21, off: 10 },
      { work: 22, off: 8 }, { work: 22, off: 9 }, { work: 20, off: 10 }, { work: 22, off: 9 }
    ],
    totalWorkDays: 247
  },
  2027: {
    holidays: new Set([
      "0-1", "0-2", "0-3", "0-4", "0-5", "0-6", "0-7", "0-8",
      "1-22", "1-23", "2-8", "4-1", "4-3", "4-9", "4-10", "5-12", "5-14", "10-4", "10-5", "11-31"
    ]),
    preHolidays: new Set(["1-20", "3-30", "5-11", "10-3"]),
    monthly: [
      { work: 15, off: 16 }, { work: 19, off: 9 }, { work: 22, off: 9 }, { work: 22, off: 8 },
      { work: 19, off: 12 }, { work: 21, off: 9 }, { work: 22, off: 9 }, { work: 22, off: 9 },
      { work: 22, off: 8 }, { work: 21, off: 10 }, { work: 20, off: 10 }, { work: 22, off: 9 }
    ],
    totalWorkDays: 247
  }
};

function daysInMonth(year, m) { return new Date(year, m + 1, 0).getDate(); }
function firstDow(year, m) { const d = new Date(year, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function dow(year, m, day) { const d = new Date(year, m, day).getDay(); return d === 0 ? 6 : d - 1; }
function getDayType(year, month, day) {
  const key = `${month}-${day}`;
  const data = CALENDAR_DATA[year] || CALENDAR_DATA[2026];
  if (data.holidays.has(key)) return "holiday";
  if (data.preHolidays.has(key)) return "preholiday";
  const d = new Date(year, month, day).getDay();
  if (d === 0 || d === 6) return "weekend";
  return "workday";
}
function isSaturday(year, m, d) { return new Date(year, m, d).getDay() === 6; }
function countWorkDays(year, m, from, to) {
  let count = 0;
  for (let d = from; d <= to; d++) {
    const t = getDayType(year, m, d);
    if (t === "workday" || t === "preholiday") count++;
  }
  return count;
}
function sumOTHours(overtime, m, from, to) {
  let hours = 0;
  for (let d = from; d <= to; d++) hours += overtime[`${m}-${d}`] || 0;
  return hours;
}
function fmt(n) { return n === 0 ? "0" : n.toLocaleString("ru-RU", { maximumFractionDigits: 2 }); }

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

export default function DashboardClient({ user }) {
  const [year, setYear] = useState(2026);
  const [tab, setTab] = useState("calc");
  const [cm, setCm] = useState(new Date().getMonth());
  const [oklad, setOklad] = useState(135000);
  const [autoRate, setAutoRate] = useState(true);
  const [manualOtRate, setManualOtRate] = useState(164);

  const otRate = useMemo(() => {
    if (autoRate) {
      const totalDays = CALENDAR_DATA[year]?.totalWorkDays || 247;
      return Math.round((oklad * 12) / (totalDays * 8));
    }
    return manualOtRate;
  }, [autoRate, oklad, year, manualOtRate]);

  const [otDefault, setOtDefault] = useState(2);
  const [satDefault, setSatDefault] = useState(8);
  const [overtime, setOvertime] = useState({});
  const [editingDay, setEditingDay] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [absences, setAbsences] = useState({});
  const [selMode, setSelMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [bulkVal, setBulkVal] = useState("");

  // Стейты для тултипов графиков
  const [hoveredBar, setHoveredBar] = useState(null);
  const [hoveredDot, setHoveredDot] = useState(null);

  const longPressTimer = useRef(null);
  const touchMoved = useRef(false);
  const selModeTimer = useRef(null);
  const yearTableRef = useRef(null);
  const monthViewRef = useRef(null);
  const settingsAbortRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("autoRate");
    if (saved !== null) {
      setAutoRate(saved === "true");
    }
  }, []);

  const handleAutoRateChange = useCallback((val) => {
    setAutoRate(val);
    localStorage.setItem("autoRate", val ? "true" : "false");
  }, []);

  // Закрытие поповера при клике снаружи
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (editingDay && !e.target.closest(".dc") && !e.target.closest(".dc-popover")) {
        setEditingDay(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [editingDay]);

  useEffect(() => {
    return () => {
      if (selModeTimer.current) clearTimeout(selModeTimer.current);
    };
  }, []);

  useEffect(() => {
    setSelMode(false);
    setSelectedDays(new Set());
    setEditingDay(null);
  }, [cm, year]);

  const exitSelMode = useCallback(() => {
    setSelMode(false);
    setSelectedDays(new Set());
    setBulkVal("");
  }, []);

  const reloadYearData = useCallback(() => {
    setLoaded(false);
    return Promise.all([
      api("/api/settings"),
      api(`/api/overtime?year=${year}`),
      api(`/api/absences?year=${year}`)
    ]).then(([s, o, a]) => {
      if (s && !s.error) {
        setOklad(s.oklad ?? 135000);
        setManualOtRate(s.ot_rate ?? 164);
        setOtDefault(s.ot_weekday ?? 2);
        setSatDefault(s.ot_saturday ?? 8);
      }
      if (o && !o.error) setOvertime(o); else setOvertime({});
      if (a && !a.error) setAbsences(a); else setAbsences({});
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [year]);

  const enterSelMode = useCallback((day) => {
    setEditingDay(null);
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

  // Запрос настроек и данных при смене года
  useEffect(() => {
    reloadYearData();
  }, [reloadYearData]);

  // Сохранение настроек при их редактировании
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(async () => {
      if (settingsAbortRef.current) settingsAbortRef.current.abort();
      settingsAbortRef.current = new AbortController();
      const result = await api("/api/settings", "POST", { oklad, ot_rate: otRate, ot_weekday: otDefault, ot_saturday: satDefault }, settingsAbortRef.current.signal);
      if (result === null) {
        setSaveError(true);
        setTimeout(() => setSaveError(false), 4000);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [oklad, otRate, otDefault, satDefault, loaded]);

  const saveOT = useCallback((y, m, d, hours) => {
    api("/api/overtime", "POST", { year: y, month: m, day: d, hours, source: "single_day" }).then((result) => {
      if (result === null) {
        setSaveError(true);
        setTimeout(() => setSaveError(false), 4000);
      }
    });
  }, []);

  const toggleAbsence = useCallback((y, m, d) => {
    const key = `${m}-${d}`;
    const isAbsent = absences[key];
    setAbsences((prev) => {
      const next = { ...prev };
      if (isAbsent) delete next[key]; else next[key] = true;
      return next;
    });
    if (!isAbsent) {
      setOvertime((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    if (isAbsent) {
      api(`/api/absences?year=${y}&month=${m}&day=${d}&source=absence_delete`, "DELETE");
    } else {
      api("/api/absences", "POST", { year: y, month: m, day: d, source: "absence_single" });
    }
  }, [absences]);

  const setDayOT = useCallback((y, m, d, hours) => {
    setOvertime((prev) => {
      const next = { ...prev };
      const key = `${m}-${d}`;
      if (hours <= 0) delete next[key]; else next[key] = hours;
      return next;
    });
    saveOT(y, m, d, hours);
  }, [saveOT]);

  const applyBulk = useCallback((hours) => {
    if (selectedDays.size === 0) return;
    const items = [...selectedDays].map((d) => ({ day: d, hours }));
    const changed = items.filter(({ day }) => (overtime[`${cm}-${day}`] || 0) !== hours).length;
    const overwrite = items.filter(({ day }) => overtime[`${cm}-${day}`] !== undefined).length;
    if (!window.confirm(`Изменить ${changed} дн. (${overwrite} уже заполнены) на ${hours}ч?`)) return;
    setOvertime((prev) => {
      const next = { ...prev };
      selectedDays.forEach((d) => {
        const key = `${cm}-${d}`;
        if (hours <= 0) delete next[key]; else next[key] = hours;
      });
      return next;
    });
    api("/api/overtime", "POST", { bulk: true, year, month: cm, items, source: "bulk_apply" });
    exitSelMode();
  }, [selectedDays, cm, year, exitSelMode, overtime]);

  const confirmBulk = useCallback(() => {
    const val = parseFloat(bulkVal) || 0;
    applyBulk(val);
  }, [bulkVal, applyBulk]);

  const fillMonth = useCallback((m) => {
    if (otDefault <= 0 && satDefault <= 0) {
      window.alert("Автозаполнение 0ч/0ч отключено: оно очищает месяц. Для очистки используй отдельную кнопку/действие удаления.");
      return;
    }

    const total = daysInMonth(year, m);
    const items = [];
    const updates = {};
    for (let d = 1; d <= total; d++) {
      const type = getDayType(year, m, d);
      const key = `${m}-${d}`;
      if (type === "workday" || type === "preholiday") {
        updates[key] = otDefault;
        items.push({ day: d, hours: otDefault });
      } else if (isSaturday(year, m, d) && type === "weekend") {
        updates[key] = satDefault;
        items.push({ day: d, hours: satDefault });
      }
    }
    const overwrite = items.filter(({ day }) => overtime[`${m}-${day}`] !== undefined).length;
    if (!window.confirm(`Перезаполнить ${items.length} дн. в месяце ${MONTHS[m]}? Уже заполнено: ${overwrite}.`)) return;
    setOvertime((prev) => ({ ...prev, ...updates }));
    api("/api/overtime", "POST", { bulk: true, year, month: m, items, source: "fill_month" });
  }, [year, otDefault, satDefault, overtime]);

  const clearMonth = useCallback(async (m) => {
    const total = daysInMonth(year, m);
    const filled = Array.from({ length: total }, (_, idx) => overtime[`${m}-${idx + 1}`] !== undefined).filter(Boolean).length;
    if (!window.confirm(`Очистить ${filled} заполненных дн. в месяце ${MONTHS[m]}?`)) return;
    setOvertime((prev) => {
      const next = { ...prev };
      for (let d = 1; d <= total; d++) delete next[`${m}-${d}`];
      return next;
    });
    await api(`/api/overtime?year=${year}&month=${m}&source=clear_month`, "DELETE");
  }, [year, overtime]);

  const undoLastBulk = useCallback(async () => {
    if (!window.confirm(`Откатить последнее массовое изменение в месяце ${MONTHS[cm]}?`)) return;
    const result = await api("/api/recovery", "POST", { mode: "undo_last_bulk", year, month: cm });
    if (!result || result.error) {
      window.alert(result?.error || "Не удалось откатить последнее массовое изменение");
      return;
    }
    await reloadYearData();
    window.alert("Последнее массовое изменение откатили.");
  }, [cm, year, reloadYearData]);

  const restoreMonthFromHistory = useCallback(async () => {
    const result = await api(`/api/recovery?year=${year}&month=${cm}`);
    const snapshots = result?.snapshots || [];
    if (!snapshots.length) {
      window.alert("Для этого месяца ещё нет снимков истории.");
      return;
    }
    const list = snapshots
      .slice(0, 8)
      .map((s) => `${s.id}: ${s.created_at} · ${s.source} · OT ${s.overtime_count} · ABS ${s.absence_count}`)
      .join("\n");
    const chosen = window.prompt(`Введи ID снимка для восстановления месяца ${MONTHS[cm]}:\n\n${list}`);
    if (!chosen) return;
    if (!window.confirm(`Восстановить месяц ${MONTHS[cm]} из снимка #${chosen}?`)) return;
    const restored = await api("/api/recovery", "POST", { mode: "restore_snapshot", snapshot_id: chosen, year, month: cm });
    if (!restored || restored.error) {
      window.alert(restored?.error || "Не удалось восстановить месяц");
      return;
    }
    await reloadYearData();
    window.alert(`Месяц ${MONTHS[cm]} восстановлен из снимка #${chosen}.`);
  }, [cm, year, reloadYearData]);

  const handleDayClick = useCallback((d) => {
    if (selMode) {
      toggleDay(d);
      return;
    }

    const key = `${cm}-${d}`;
    if (editingDay === key) { setEditingDay(null); return; }
    setEditingDay(key);
    setEditVal(overtime[key]?.toString() || "");
  }, [cm, selMode, editingDay, overtime, toggleDay]);

  const confirmEdit = useCallback(() => {
    if (!editingDay) return;
    const [ms, ds] = editingDay.split("-").map(Number);
    const val = parseFloat(editVal) || 0;
    setDayOT(year, ms, ds, val);
    setEditingDay(null);
  }, [editingDay, editVal, year, setDayOT]);

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

  // Расчет статистики за месяц
  const monthStats = useMemo(() => {
    const calData = CALENDAR_DATA[year] || CALENDAR_DATA[2026];
    return MONTHS.map((_, m) => {
      let otHours = 0;
      let absentCount = 0;
      const totalDays = daysInMonth(year, m);
      for (let d = 1; d <= totalDays; d++) {
        const key = `${m}-${d}`;
        if (overtime[key]) otHours += overtime[key];
        if (absences[key]) absentCount++;
      }
      const workDays = calData.monthly[m]?.work ?? countWorkDays(year, m, 1, totalDays);
      const debtHours = absentCount * 8;
      const effectiveOT = Math.max(0, otHours - debtHours);
      const uncoveredHours = Math.max(0, debtHours - otHours);
      const deduction = workDays > 0 ? (uncoveredHours / 8) * (oklad / workDays) : 0;
      const adjustedOklad = oklad - deduction;
      const otPay = effectiveOT * otRate;
      const total = adjustedOklad + otPay;
      return { workDays, otHours, absentCount, debtHours, effectiveOT, deduction, adjustedOklad, otPay, oklad, total };
    });
  }, [overtime, absences, otRate, oklad, year]);

  const yearTotals = useMemo(() => {
    let otH = 0, otP = 0, totalDeduction = 0, adjOklad = 0;
    monthStats.forEach((s) => {
      otH += s.effectiveOT;
      otP += s.otPay;
      totalDeduction += s.deduction;
      adjOklad += s.adjustedOklad;
    });
    return { otHours: otH, otPay: otP, deduction: totalDeduction, oklad: adjOklad, total: adjOklad + otP };
  }, [monthStats]);

  const exportExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const rows = monthStats.map((s, i) => ({
      "Месяц": MONTHS[i],
      "Раб. дней": s.workDays,
      "Пропуски (дн)": s.absentCount || 0,
      "Оклад (₽)": s.oklad,
      "Вычет (₽)": s.deduction > 0 ? -Math.round(s.deduction) : 0,
      "Переработка (ч)": s.effectiveOT || 0,
      "Переработка (₽)": s.otPay || 0,
      "Итого (₽)": Math.round(s.total),
    }));
    const calData = CALENDAR_DATA[year] || CALENDAR_DATA[2026];
    rows.push({
      "Месяц": `${year} год`,
      "Раб. дней": calData.totalWorkDays,
      "Пропуски (дн)": monthStats.reduce((a, s) => a + s.absentCount, 0),
      "Оклад (₽)": Math.round(yearTotals.oklad),
      "Вычет (₽)": yearTotals.deduction > 0 ? -Math.round(yearTotals.deduction) : 0,
      "Переработка (ч)": yearTotals.otHours || 0,
      "Переработка (₽)": yearTotals.otPay || 0,
      "Итого (₽)": Math.round(yearTotals.total),
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Календарь ${year}`);
    const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Производственный_календарь_${year}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [monthStats, yearTotals, year]);

  const exportJpeg = useCallback(async () => {
    if (!yearTableRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(yearTableRef.current, {
      backgroundColor: "#080c16",
      scale: 2,
    });
    const link = document.createElement("a");
    link.download = `Производственный_календарь_${year}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  }, [year]);

  const exportMonthExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const DAY_TYPE_LABEL = { workday: "Рабочий", weekend: "Выходной", holiday: "Праздник", preholiday: "Сокращённый" };
    const rows = [];
    const totalDays = daysInMonth(year, cm);
    for (let d = 1; d <= totalDays; d++) {
      const type = getDayType(year, cm, d);
      const ot = overtime[`${cm}-${d}`] || 0;
      const absent = !!absences[`${cm}-${d}`];
      rows.push({
        "Дата": `${d < 10 ? "0" + d : d}.${cm + 1 < 10 ? "0" + (cm + 1) : cm + 1}.${year}`,
        "День": WEEKDAYS[dow(year, cm, d)],
        "Тип дня": absent ? "Не работал" : DAY_TYPE_LABEL[type],
        "Переработка (ч)": absent ? "" : (ot || ""),
      });
    }
    const ms = monthStats[cm];
    rows.push({});
    rows.push({ "Дата": "Оклад (₽)", "День": ms.oklad });
    if (ms.absentCount > 0) {
      rows.push({ "Дата": "Пропущено (дн)", "День": ms.absentCount });
      rows.push({ "Дата": "Вычет (₽)", "День": -Math.round(ms.deduction) });
    }
    rows.push({ "Дата": "Переработка (ч)", "День": ms.effectiveOT });
    rows.push({ "Дата": "Переработка (₽)", "День": ms.otPay });
    rows.push({ "Дата": "Итого (₽)", "День": Math.round(ms.total) });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[cm]} ${year}`);
    const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Календарь_${MONTHS[cm]}_${year}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [cm, overtime, absences, monthStats, year]);

  const exportMonthJpeg = useCallback(async () => {
    if (!monthViewRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(monthViewRef.current, {
      backgroundColor: "#080c16",
      scale: 2,
    });
    const link = document.createElement("a");
    link.download = `Календарь_${MONTHS[cm]}_${year}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  }, [cm, year]);

  const cmStats = monthStats[cm];

  // Расчет аванса и перерасчета
  const payPeriods = useMemo(() => {
    const totalWork = cmStats.workDays;
    const end = daysInMonth(year, cm);
    const wd1 = countWorkDays(year, cm, 1, 15);
    const wd2 = countWorkDays(year, cm, 16, end);
    const dayRate = totalWork > 0 ? cmStats.adjustedOklad / totalWork : 0;
    const ot1 = sumOTHours(overtime, cm, 1, 15);
    const ot2 = sumOTHours(overtime, cm, 16, end);
    const debtHours = cmStats.debtHours;
    const debtRatio1 = totalWork > 0 ? wd1 / totalWork : 0.5;
    const debt1 = debtHours * debtRatio1;
    const debt2 = debtHours - debt1;
    const effOT1 = Math.max(0, ot1 - debt1);
    const effOT2 = Math.max(0, ot2 - debt2);
    const advance = dayRate * wd1 + effOT1 * otRate;
    const settlement = dayRate * wd2 + effOT2 * otRate;
    return { wd1, wd2, ot1: effOT1, ot2: effOT2, advance, settlement };
  }, [cm, oklad, otRate, overtime, cmStats, year]);

  const totalDays = daysInMonth(year, cm);
  const first = firstDow(year, cm);
  const calCells = [];
  for (let i = 0; i < first; i++) calCells.push(<td key={`e${i}`} className="dc-empty" />);

  for (let d = 1; d <= totalDays; d++) {
    const type = getDayType(year, cm, d);
    const key = `${cm}-${d}`;
    const ot = overtime[key] || 0;
    const isAbsent = !!absences[key];
    const isSel = selectedDays.has(d);
    const isEdit = editingDay === key;
    const isSat = isSaturday(year, cm, d);
    let cls = "dc";
    if (type === "holiday") cls += " dc-hol";
    else if (type === "weekend") { cls += isSat ? " dc-sat" : " dc-sun"; }
    else if (type === "preholiday") cls += " dc-pre";
    else cls += " dc-wd";
    if (isAbsent) cls += " dc-abs";
    else if (ot > 0) cls += " dc-ot";
    if (isEdit) cls += " dc-edit";
    if (isSel) cls += " dc-sel";
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() === cm && today.getDate() === d) cls += " dc-today";

    // Поповер редактирования дня
    const popoverContent = isEdit && !selMode && (() => {
      const eType = getDayType(year, cm, d);
      const canAbsent = eType === "workday" || eType === "preholiday";
      return (
        <div className="dc-popover" onClick={(e) => e.stopPropagation()}>
          <div className="dc-popover-hdr">
            <span>{d} {MONTHS_SHORT[cm]}, {WEEKDAYS[dow(year, cm, d)]} {type === "preholiday" && " (сокр.)"}</span>
            <button className="dc-popover-close" onClick={() => setEditingDay(null)}>✕</button>
          </div>
          {!isAbsent ? (
            <div className="dc-popover-body">
              <div className="dc-popover-input-row">
                <label>Переработка:</label>
                <input
                  className="dc-popover-input"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={editVal}
                  onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setEditingDay(null); }}
                  autoFocus
                />
                <span className="dc-popover-unit">ч</span>
              </div>
              <div className="dc-popover-quick">
                {[1, 2, 3, 4, 6, 8].map((h) => (
                  <button key={h} className="dc-popover-qbtn" onClick={() => setEditVal(h.toString())}>{h}ч</button>
                ))}
              </div>
              <div className="dc-popover-actions">
                <button className="dc-popover-btn-ok" onClick={confirmEdit}>Сохранить</button>
                {ot > 0 && <button className="dc-popover-btn-del" onClick={() => { setDayOT(year, cm, d, 0); setEditingDay(null); }}>Убрать переработку</button>}
              </div>
              {canAbsent && (
                <button
                  className="dc-popover-btn-abs"
                  onClick={() => { toggleAbsence(year, cm, d); setEditingDay(null); }}
                >
                  Отметить пропуск (не работал)
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="dc-popover-abs-info">Отмечен пропуск рабочего дня.</div>
              {canAbsent && (
                <button
                  className="dc-popover-btn-abs dc-popover-btn-abs-active"
                  onClick={() => { toggleAbsence(year, cm, d); setEditingDay(null); }}
                >
                  Снять отметку пропуска
                </button>
              )}
            </>
          )}
        </div>
      );
    })();

    calCells.push(
      <td
        key={d}
        className={cls}
        onClick={() => handleDayClick(d)}
        onMouseDown={() => !selMode && startLongPress(d)}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={() => { touchMoved.current = false; if (!selMode) startLongPress(d); }}
        onTouchMove={() => { touchMoved.current = true; cancelLongPress(); }}
        onTouchEnd={cancelLongPress}
        onContextMenu={(e) => { e.preventDefault(); if (!selMode) enterSelMode(d); }}
        style={{ position: "relative" }}
      >
        {selMode && (
          <div className={`dc-check ${isSel ? "dc-check-on" : ""}`}>
            {isSel ? "✓" : ""}
          </div>
        )}
        <div className="dc-num">{d}</div>
        {isAbsent && !isSel && <div className="dc-abs-mark">✕</div>}
        {ot > 0 && !isSel && !isAbsent && <div className="dc-badge">+{ot}ч</div>}
        {type === "preholiday" && <div className="dc-star">*</div>}
        
        {/* Рендеринг поповера внутри ячейки */}
        {popoverContent}
      </td>
    );
  }

  const calRows = [];
  for (let i = 0; i < calCells.length; i += 7) calRows.push(<tr key={i}>{calCells.slice(i, i + 7)}</tr>);

  if (!loaded) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0f19", color: "#6b7280" }}>
      <div className="loader">Загрузка данных...</div>
    </div>
  );

  // Подготовка данных для SVG графиков на вкладке "Годовой обзор"
  const maxIncome = Math.max(...monthStats.map(s => s.total), 100000);
  const gridMax = Math.ceil(maxIncome / 50000) * 50000;

  const maxOT = Math.max(...monthStats.map(s => s.effectiveOT), 10);
  const otGridMax = Math.ceil(maxOT / 10) * 10;

  const otPoints = monthStats.map((s, idx) => {
    const x = 70 + idx * 56 + 13;
    const y = 200 - (s.effectiveOT / otGridMax) * 160;
    return { x, y, val: s.effectiveOT };
  });

  const pathD = otPoints.reduce((acc, p, idx) => {
    return acc + `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`;
  }, "");

  const areaD = otPoints.length > 0 ? `${pathD} L ${otPoints[otPoints.length - 1].x} 200 L ${otPoints[0].x} 200 Z` : "";

  return (
    <div className="root">
      {/* Декоративные фоновые свечения для премиум-дизайна */}
      <div className="bg-glow bg-glow-blue"></div>
      <div className="bg-glow bg-glow-orange"></div>

      <div className="user-bar">
        <div className="user-info">
          {user.image && <Image src={user.image} alt="" width={28} height={28} style={{ borderRadius: "50%" }} referrerPolicy="no-referrer" />}
          <span>{user.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select className="year-select-bar" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            <option value="2025">2025 год</option>
            <option value="2026">2026 год</option>
            <option value="2027">2027 год</option>
          </select>
          <button onClick={() => signOut()}>Выйти</button>
        </div>
      </div>

      {saveError && (
        <div className="error-toast">
          Ошибка сохранения настроек. Проверьте соединение.
        </div>
      )}

      <div className="hdr">
        <div className="hdr-logo-container">
          <span className="hdr-title-pre">Производственный Календарь</span>
          <img src="/logo.png" alt="Компьютролс" className="hdr-logo-img" />
        </div>
        <div className="hdr-sub">Калькулятор зарплаты с переработками и вычетами</div>
      </div>

      <div className="tabs">
        {[ ["calc", "Калькулятор"], ["year", "Годовой обзор"] ].map(([k, v]) => (
          <button key={k} className={`tb ${tab === k ? "tb-a" : ""}`} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>

      {tab === "calc" && (<>
        {/* 2 Сетка календаря */}
        <div className="month-view" ref={monthViewRef}>
          <div className="mv-header">
            <div className="mv-title">{MONTHS[cm]}</div>
            <div className="mv-actions">
              <button
                className="mv-btn mv-btn-fill"
                onClick={() => fillMonth(cm)}
                title={otDefault <= 0 && satDefault <= 0 ? "0ч/0ч заблокировано, чтобы не очищать месяц" : undefined}
              >
                Автозаполнение ({otDefault}ч будни / {satDefault}ч сб)
              </button>
              <button className="mv-btn" onClick={() => clearMonth(cm)}>Очистить месяц</button>
              <button className="mv-btn" onClick={undoLastBulk}>Отменить последнее массовое</button>
              <button className="mv-btn" onClick={restoreMonthFromHistory}>История / восстановить</button>
              <button className="mv-btn" onClick={exportMonthExcel}>Экспорт Excel</button>
              <button className="mv-btn" onClick={exportMonthJpeg}>JPEG снимок</button>
            </div>
          </div>
          <div className="legend">
            <div className="lg"><div className="ld ld-wd" /><span>Рабочий</span></div>
            <div className="lg"><div className="ld ld-we" /><span>Выходной</span></div>
            <div className="lg"><div className="ld ld-hol" /><span>Праздник</span></div>
            <div className="lg"><div className="ld ld-pre" /><span>Сокращённый*</span></div>
            <div className="lg"><div className="ld ld-ot" /><span>Переработка</span></div>
            <div className="lg"><div className="ld ld-abs" /><span>Не работал</span></div>
          </div>
          <table className="cal-tbl">
            <thead><tr>{WEEKDAYS.map((w, i) => <th key={i} className={i >= 5 ? "th-we" : ""}>{w}</th>)}</tr></thead>
            <tbody>{calRows}</tbody>
          </table>
        </div>

        {/* Кнопки переключения месяцев */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 14 }}>
          <button className="mv-btn" onClick={() => setCm(Math.max(0, cm - 1))} disabled={cm === 0}>← {cm > 0 ? MONTHS_SHORT[cm - 1] : ""}</button>
          <button className="mv-btn" onClick={() => setCm(Math.min(11, cm + 1))} disabled={cm === 11}>{cm < 11 ? MONTHS_SHORT[cm + 1] : ""} →</button>
        </div>

        {/* 3 Статистика и прогноз выплат */}
        <div className="summary">
          <div className="sum-title">{MONTHS[cm]} {year}</div>
          <div className="sum-grid">
            <div className="sg"><div className="sg-v v-blue">{cmStats.workDays}</div><div className="sg-l">рабочих дней</div></div>
            <div className="sg"><div className="sg-v v-green">{cmStats.otHours}</div><div className="sg-l">часов переработки</div></div>
            <div className="sg"><div className="sg-v v-orange">{fmt(Math.round(cmStats.total))} ₽</div><div className="sg-l">итого за месяц</div></div>
          </div>
          <div className="sum-breakdown">
            <div className="sb-line"><span>Оклад (начислено)</span><span className="sb-val">{fmt(oklad)} ₽</span></div>
            {cmStats.absentCount > 0 && (<>
              <div className="sb-line"><span>Пропущено: {cmStats.absentCount} дн. (долг {cmStats.debtHours} ч)</span><span className="sb-val" style={{ color: "#ef4444" }}>—</span></div>
              {cmStats.debtHours > cmStats.otHours ? null : <div className="sb-line"><span>Покрыто переработкой: {Math.min(cmStats.debtHours, cmStats.otHours)} ч</span><span className="sb-val" style={{ color: "#10b981" }}>✓</span></div>}
              {cmStats.deduction > 0 && <div className="sb-line"><span>Вычет за {cmStats.absentCount} пропущенных дней</span><span className="sb-val" style={{ color: "#ef4444" }}>−{fmt(Math.round(cmStats.deduction))} ₽</span></div>}
            </>)}
            <div className="sb-line"><span>Переработка: {cmStats.effectiveOT} ч × {fmt(otRate)} ₽</span><span className="sb-val">{fmt(cmStats.otPay)} ₽</span></div>
            <div className="sb-line sb-total"><span>Итого</span><span className="sb-val">{fmt(Math.round(cmStats.total))} ₽</span></div>
          </div>
          
          <div className="pay-periods">
            <div className="pp">
              <div className="pp-label">Аванс <span className="pp-range">1–15</span></div>
              <div className="pp-row">
                <span className="pp-type pp-type-card">💳 Карта (оклад)</span>
                <span className="pp-sum">{fmt(Math.round(cmStats.workDays > 0 ? (cmStats.adjustedOklad / cmStats.workDays * payPeriods.wd1) : 0))} ₽</span>
              </div>
              <div className="pp-row">
                <span className="pp-type pp-type-cash">💵 Наличные (переработки)</span>
                <span className="pp-sum">{payPeriods.ot1 > 0 ? fmt(payPeriods.ot1 * otRate) + " ₽" : "—"}</span>
              </div>
              <div className="pp-total">{fmt(Math.round((cmStats.workDays > 0 ? (cmStats.adjustedOklad / cmStats.workDays * payPeriods.wd1) : 0) + payPeriods.ot1 * otRate))} ₽</div>
            </div>
            <div className="pp-divider">+</div>
            <div className="pp">
              <div className="pp-label">Перерасчёт <span className="pp-range">16–{daysInMonth(year, cm)}</span></div>
              <div className="pp-row">
                <span className="pp-type pp-type-card">💳 Карта (оклад)</span>
                <span className="pp-sum">{fmt(Math.round(cmStats.workDays > 0 ? (cmStats.adjustedOklad / cmStats.workDays * payPeriods.wd2) : 0))} ₽</span>
              </div>
              <div className="pp-row">
                <span className="pp-type pp-type-cash">💵 Наличные (переработки)</span>
                <span className="pp-sum">{payPeriods.ot2 > 0 ? fmt(payPeriods.ot2 * otRate) + " ₽" : "—"}</span>
              </div>
              <div className="pp-total">{fmt(Math.round((cmStats.workDays > 0 ? (cmStats.adjustedOklad / cmStats.workDays * payPeriods.wd2) : 0) + payPeriods.ot2 * otRate))} ₽</div>
            </div>
          </div>
        </div>

        {/* 4 Сетка с месяцами */}
        <div className="mstrip">
          {MONTHS.map((_, i) => {
            const s = monthStats[i];
            return (
              <div key={i} className={`mm ${i === cm ? "mm-a" : ""} ${s.otHours > 0 ? "mm-has" : ""}`} onClick={() => setCm(i)}>
                <div className="mm-name">{MONTHS_SHORT[i]}</div>
                <div className="mm-total">{fmt(Math.round(s.total))}₽</div>
                {s.otHours > 0 && <div className="mm-ot">+{s.otHours}ч</div>}
              </div>
            );
          })}
        </div>

        {/* 5 Меню настройки */}
        <div className="settings">
          <div className="settings-title">Настройки расчёта</div>
          <div className="s-row">
            <div className="s-field">
              <label>Оклад / месяц</label>
              <input className="s-input" type="number" min="0" step="1000" value={oklad || ""} onChange={(e) => setOklad(Math.max(0, parseFloat(e.target.value) || 0))} />
              <div className="s-unit">₽ фиксированный</div>
            </div>
            <div className="s-field">
              <label>Ставка переработки</label>
              <input
                className="s-input"
                type="number"
                min="0"
                step="1"
                value={otRate || ""}
                onChange={(e) => setManualOtRate(Math.max(0, parseFloat(e.target.value) || 0))}
                disabled={autoRate}
              />
              <div className="s-unit">{autoRate ? "₽ / час (авто)" : "₽ / час"}</div>
            </div>
            <div className="s-field">
              <label>Будни перераб.</label>
              <input className="s-input" type="number" min="0" max="16" step="0.5" value={otDefault} onChange={(e) => setOtDefault(Math.max(0, Math.min(16, parseFloat(e.target.value) || 0)))} />
              <div className="s-unit">часов сверх 8ч</div>
            </div>
            <div className="s-field">
              <label>Суббота перераб.</label>
              <input className="s-input" type="number" min="0" max="24" step="0.5" value={satDefault} onChange={(e) => setSatDefault(Math.max(0, Math.min(24, parseFloat(e.target.value) || 0)))} />
              <div className="s-unit">часов за выход</div>
            </div>
          </div>
          <div className="settings-options" style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#888e9b", cursor: "pointer" }}>
              <input type="checkbox" checked={autoRate} onChange={(e) => handleAutoRateChange(e.target.checked)} style={{ cursor: "pointer" }} />
              Рассчитывать ставку часа автоматически (средняя по году)
            </label>
          </div>
        </div>

        {/* Множественный выбор — плавающая панель на Glassmorphism */}
        {selMode && (
          <div className="sel-bar">
            <div className="sel-bar-top">
              <span className="sel-bar-title">Выбрано дней: {selectedDays.size}</span>
              <button className="sel-bar-cancel" onClick={exitSelMode}>Отмена</button>
            </div>
            <div className="sel-bar-row">
              <span className="sel-bar-label">Переработка:</span>
              <input
                className="sel-bar-input"
                type="number" min="0" max="24" step="0.5"
                value={bulkVal}
                placeholder="—"
                onChange={(e) => setBulkVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmBulk(); if (e.key === "Escape") exitSelMode(); }}
                autoFocus
              />
              <span className="sel-bar-label">ч</span>
              <button className="sel-bar-ok" onClick={confirmBulk}>Применить</button>
              <button className="sel-bar-del" onClick={() => applyBulk(0)}>Сбросить</button>
              <div className="sel-quick">
                {[1, 2, 3, 4, 6, 8].map((h) => (
                  <button key={h} className="sel-q" onClick={() => setBulkVal(h.toString())}>{h}ч</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>)}

      {tab === "year" && (
        <div className="year-tab-container">
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button className="mv-btn" onClick={exportExcel}>Экспорт Excel за год</button>
            <button className="mv-btn" onClick={exportJpeg}>Снимок JPEG за год</button>
          </div>

          {/* Интерактивные SVG Графики */}
          <div className="charts-grid">
            {/* График доходов */}
            <div className="chart-card">
              <h3 className="chart-card-title">Зарплата по месяцам (начислено)</h3>
              <div className="chart-container" style={{ position: "relative" }}>
                <svg viewBox="0 0 800 240" className="chart-svg" style={{ width: "100%", height: "auto" }}>
                  <defs>
                    <linearGradient id="okladGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="otGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6b35" />
                      <stop offset="100%" stopColor="#c2410c" />
                    </linearGradient>
                  </defs>
                  
                  {/* Горизонтальные линии сетки */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = 200 - ratio * 160;
                    const value = Math.round(ratio * gridMax);
                    return (
                      <g key={idx}>
                        <line x1="60" y1={y} x2="760" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                        <text x="50" y={y + 4} textAnchor="end" fill="#4b5563" fontSize="9" fontWeight="600">{value.toLocaleString("ru-RU")} ₽</text>
                      </g>
                    );
                  })}
                  
                  {/* Столбики */}
                  {monthStats.map((s, idx) => {
                    const x = 70 + idx * 56;
                    const barWidth = 26;
                    const totalH = (s.total / gridMax) * 160;
                    const okladH = (s.adjustedOklad / gridMax) * 160;
                    const otH = (s.otPay / gridMax) * 160;
                    
                    return (
                      <g
                        key={idx}
                        className="chart-bar-group"
                        style={{ cursor: "pointer" }}
                        onMouseEnter={() => setHoveredBar({ idx, x: x + 13, y: 200 - totalH, stats: s })}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {/* Оклад */}
                        <rect x={x} y={200 - okladH} width={barWidth} height={okladH} fill="url(#okladGrad)" rx="3" />
                        {/* Переработка сверху оклада */}
                        {otH > 0 && (
                          <rect x={x} y={200 - okladH - otH} width={barWidth} height={otH} fill="url(#otGrad)" rx="3" />
                        )}
                        {/* Подпись месяца */}
                        <text x={x + barWidth / 2} y="222" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="600">{MONTHS_SHORT[idx]}</text>
                      </g>
                    );
                  })}
                </svg>

                {/* Всплывающий Tooltip для баров */}
                {hoveredBar && (
                  <div
                    className="chart-tooltip"
                    style={{
                      position: "absolute",
                      left: `${(hoveredBar.x / 800) * 100}%`,
                      top: `${(hoveredBar.y / 240) * 100 - 30}%`,
                      transform: "translate(-50%, -100%)",
                      pointerEvents: "none"
                    }}
                  >
                    <div className="ct-month">{MONTHS[hoveredBar.idx]}</div>
                    <div className="ct-row"><span>Оклад:</span> <strong>{fmt(Math.round(hoveredBar.stats.adjustedOklad))} ₽</strong></div>
                    {hoveredBar.stats.otPay > 0 && (
                      <div className="ct-row"><span>Переработки:</span> <strong style={{ color: "#ff6b35" }}>+{fmt(Math.round(hoveredBar.stats.otPay))} ₽</strong></div>
                    )}
                    <div className="ct-row ct-total"><span>Всего:</span> <strong>{fmt(Math.round(hoveredBar.stats.total))} ₽</strong></div>
                  </div>
                )}
              </div>
            </div>

            {/* График переработок */}
            <div className="chart-card">
              <h3 className="chart-card-title">Часы переработок по месяцам</h3>
              <div className="chart-container" style={{ position: "relative" }}>
                <svg viewBox="0 0 800 240" className="chart-svg" style={{ width: "100%", height: "auto" }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Горизонтальные линии сетки */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = 200 - ratio * 160;
                    const value = Math.round(ratio * otGridMax);
                    return (
                      <g key={idx}>
                        <line x1="50" y1={y} x2="760" y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                        <text x="40" y={y + 4} textAnchor="end" fill="#4b5563" fontSize="9" fontWeight="600">{value} ч</text>
                      </g>
                    );
                  })}
                  
                  {/* Заливка области под графиком */}
                  {otPoints.length > 0 && (
                    <path d={areaD} fill="url(#areaGrad)" />
                  )}

                  {/* Сглаженная или ровная линия графика */}
                  {otPoints.length > 0 && (
                    <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  
                  {/* Интерактивные точки */}
                  {otPoints.map((p, idx) => (
                    <g
                      key={idx}
                      className="chart-dot-group"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredDot({ idx, x: p.x, y: p.y, val: p.val, month: MONTHS[idx] })}
                      onMouseLeave={() => setHoveredDot(null)}
                    >
                      <circle cx={p.x} cy={p.y} r="5" fill="#080c16" stroke="#10b981" strokeWidth="2.5" />
                      {/* Увеличенная невидимая область для легкого наведения */}
                      <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
                      <text x={p.x} y="222" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="600">{MONTHS_SHORT[idx]}</text>
                    </g>
                  ))}
                </svg>

                {/* Всплывающий Tooltip для точек */}
                {hoveredDot && (
                  <div
                    className="chart-tooltip"
                    style={{
                      position: "absolute",
                      left: `${(hoveredDot.x / 800) * 100}%`,
                      top: `${(hoveredDot.y / 240) * 100 - 10}%`,
                      transform: "translate(-50%, -100%)",
                      pointerEvents: "none"
                    }}
                  >
                    <div className="ct-month">{hoveredDot.month}</div>
                    <div className="ct-row"><span>Переработка:</span> <strong style={{ color: "#10b981" }}>{hoveredDot.val} ч</strong></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="year-table-wrapper" style={{ marginTop: 24 }}>
            <table className="yo-tbl" ref={yearTableRef}>
              <thead>
                <tr>
                  <th>Месяц</th>
                  <th>Раб.дн.</th>
                  <th>Оклад (нач.)</th>
                  <th>Вычет</th>
                  <th>Перераб.(ч)</th>
                  <th>Перераб.(₽)</th>
                  <th>Всего (нач.)</th>
                </tr>
              </thead>
              <tbody>
                {monthStats.map((s, i) => (
                  <tr key={i}>
                    <td className="yo-m" onClick={() => { setCm(i); setTab("calc"); }}>{MONTHS_SHORT[i]}</td>
                    <td>{s.workDays}</td>
                    <td>{fmt(s.oklad)}</td>
                    <td style={{ color: "#ef4444", fontWeight: 600 }}>{s.deduction > 0 ? `−${fmt(Math.round(s.deduction))}` : "—"}</td>
                    <td className="yo-h">{s.effectiveOT || "—"}</td>
                    <td className="yo-p">{s.otPay ? fmt(s.otPay) : "—"}</td>
                    <td className="yo-t">{fmt(Math.round(s.total))}</td>
                  </tr>
                ))}
                <tr className="yo-total">
                  <td className="yo-m">{year} год</td>
                  <td>{CALENDAR_DATA[year]?.totalWorkDays || 247}</td>
                  <td>{fmt(Math.round(yearTotals.oklad))}</td>
                  <td style={{ color: "#ef4444", fontWeight: 700 }}>{yearTotals.deduction > 0 ? `−${fmt(Math.round(yearTotals.deduction))}` : "—"}</td>
                  <td className="yo-h">{yearTotals.otHours || "—"}</td>
                  <td className="yo-p">{yearTotals.otPay ? fmt(yearTotals.otPay) : "—"}</td>
                  <td className="yo-t">{fmt(Math.round(yearTotals.total))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
