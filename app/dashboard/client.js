"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import "./dashboard.css";

const YEAR = 2026;

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const MONTHS_SHORT = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const HOLIDAYS = new Set([
  "0-1", "0-2", "0-3", "0-4", "0-5", "0-6", "0-7", "0-8", "0-9",
  "1-23", "2-8", "2-9", "4-1", "4-2", "4-3", "4-9", "4-10", "4-11",
  "5-12", "5-13", "5-14", "10-4", "11-31"
]);
const PRE_HOLIDAY = new Set(["3-30", "4-8", "5-11", "10-3"]);

const MONTHLY_DATA = [
  { work: 15, off: 16 }, { work: 19, off: 9 }, { work: 21, off: 10 }, { work: 22, off: 8 },
  { work: 19, off: 12 }, { work: 21, off: 9 }, { work: 23, off: 8 }, { work: 21, off: 10 },
  { work: 22, off: 8 }, { work: 22, off: 9 }, { work: 20, off: 10 }, { work: 22, off: 9 },
];

function daysInMonth(m) { return new Date(YEAR, m + 1, 0).getDate(); }
function firstDow(m) { const d = new Date(YEAR, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function dow(m, day) { const d = new Date(YEAR, m, day).getDay(); return d === 0 ? 6 : d - 1; }
function getDayType(month, day) {
  const key = `${month}-${day}`;
  if (HOLIDAYS.has(key)) return "holiday";
  if (PRE_HOLIDAY.has(key)) return "preholiday";
  const d = new Date(YEAR, month, day).getDay();
  if (d === 0 || d === 6) return "weekend";
  return "workday";
}
function isSaturday(m, d) { return new Date(YEAR, m, d).getDay() === 6; }
function countWorkDays(m, from, to) {
  let count = 0;
  for (let d = from; d <= to; d++) {
    const t = getDayType(m, d);
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
  const [tab, setTab] = useState("calc");
  const [cm, setCm] = useState(new Date().getMonth());
  const [oklad, setOklad] = useState(135000);
  const [otRate, setOtRate] = useState(164);
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

  const longPressTimer = useRef(null);
  const touchMoved = useRef(false);
  const selModeTimer = useRef(null);
  const yearTableRef = useRef(null);
  const monthViewRef = useRef(null);
  const settingsAbortRef = useRef(null);

  useEffect(() => {
    return () => {
      if (selModeTimer.current) clearTimeout(selModeTimer.current);
    };
  }, []);

  useEffect(() => {
    setSelMode(false);
    setSelectedDays(new Set());
    setEditingDay(null);
  }, [cm]);

  const exitSelMode = useCallback(() => {
    setSelMode(false);
    setSelectedDays(new Set());
    setBulkVal("");
  }, []);

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

  useEffect(() => {
    Promise.all([api("/api/settings"), api("/api/overtime"), api("/api/absences")]).then(([s, o, a]) => {
      if (s && !s.error) {
        setOklad(s.oklad ?? 135000);
        setOtRate(s.ot_rate ?? 164);
        setOtDefault(s.ot_weekday ?? 2);
        setSatDefault(s.ot_saturday ?? 8);
      }
      if (o && !o.error) setOvertime(o);
      if (a && !a.error) setAbsences(a);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

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

  const saveOT = useCallback((m, d, hours) => {
    api("/api/overtime", "POST", { month: m, day: d, hours }).then((result) => {
      if (result === null) {
        setSaveError(true);
        setTimeout(() => setSaveError(false), 4000);
      }
    });
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
      // Clear any overtime on this day first
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

  const setDayOT = useCallback((m, d, hours) => {
    setOvertime((prev) => {
      const next = { ...prev };
      const key = `${m}-${d}`;
      if (hours <= 0) delete next[key]; else next[key] = hours;
      return next;
    });
    saveOT(m, d, hours);
  }, [saveOT]);

  const applyBulk = useCallback((hours) => {
    if (selectedDays.size === 0) return;
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
    exitSelMode();
  }, [selectedDays, cm, exitSelMode]);

  const confirmBulk = useCallback(() => {
    const val = parseFloat(bulkVal) || 0;
    applyBulk(val);
  }, [bulkVal, applyBulk]);

  const fillMonth = useCallback((m) => {
    const total = daysInMonth(m);
    const items = [];
    const updates = {};
    for (let d = 1; d <= total; d++) {
      const type = getDayType(m, d);
      const key = `${m}-${d}`;
      if (type === "workday" || type === "preholiday") {
        updates[key] = otDefault;
        items.push({ day: d, hours: otDefault });
      } else if (isSaturday(m, d) && type === "weekend") {
        updates[key] = satDefault;
        items.push({ day: d, hours: satDefault });
      }
    }
    setOvertime((prev) => ({ ...prev, ...updates }));
    api("/api/overtime", "POST", { bulk: true, month: m, items });
  }, [otDefault, satDefault]);

  const clearMonth = useCallback(async (m) => {
    setOvertime((prev) => {
      const next = { ...prev };
      const total = daysInMonth(m);
      for (let d = 1; d <= total; d++) delete next[`${m}-${d}`];
      return next;
    });
    await api(`/api/overtime?month=${m}`, "DELETE");
  }, []);

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
    setDayOT(ms, ds, val);
    setEditingDay(null);
  }, [editingDay, editVal, setDayOT]);

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

  const monthStats = useMemo(() => {
    return MONTHS.map((_, m) => {
      let otHours = 0;
      let absentCount = 0;
      for (let d = 1; d <= daysInMonth(m); d++) {
        const key = `${m}-${d}`;
        if (overtime[key]) otHours += overtime[key];
        if (absences[key]) absentCount++;
      }
      const workDays = MONTHLY_DATA[m].work;
      const debtHours = absentCount * 8;
      const effectiveOT = Math.max(0, otHours - debtHours);
      const uncoveredHours = Math.max(0, debtHours - otHours);
      const deduction = workDays > 0 ? (uncoveredHours / 8) * (oklad / workDays) : 0;
      const adjustedOklad = oklad - deduction;
      const otPay = effectiveOT * otRate;
      const total = adjustedOklad + otPay;
      return { workDays, otHours, absentCount, debtHours, effectiveOT, deduction, adjustedOklad, otPay, oklad, total };
    });
  }, [overtime, absences, otRate, oklad]);

  const yearTotals = useMemo(() => {
    let otH = 0, otP = 0, totalDeduction = 0, adjOklad = 0;
    monthStats.forEach((s) => { otH += s.effectiveOT; otP += s.otPay; totalDeduction += s.deduction; adjOklad += s.adjustedOklad; });
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
    rows.push({
      "Месяц": `${YEAR} год`,
      "Раб. дней": 247,
      "Пропуски (дн)": monthStats.reduce((a, s) => a + s.absentCount, 0),
      "Оклад (₽)": Math.round(yearTotals.oklad),
      "Вычет (₽)": yearTotals.deduction > 0 ? -Math.round(yearTotals.deduction) : 0,
      "Переработка (ч)": yearTotals.otHours || 0,
      "Переработка (₽)": yearTotals.otPay || 0,
      "Итого (₽)": Math.round(yearTotals.total),
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Календарь 2026");
    const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Производственный_календарь_2026.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  }, [monthStats, yearTotals]);

  const exportJpeg = useCallback(async () => {
    if (!yearTableRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(yearTableRef.current, {
      backgroundColor: "#0d1117",
      scale: 2,
    });
    const link = document.createElement("a");
    link.download = "Производственный_календарь_2026.jpg";
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  }, []);

  const exportMonthExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const DAY_TYPE_LABEL = { workday: "Рабочий", weekend: "Выходной", holiday: "Праздник", preholiday: "Сокращённый" };
    const rows = [];
    for (let d = 1; d <= daysInMonth(cm); d++) {
      const type = getDayType(cm, d);
      const ot = overtime[`${cm}-${d}`] || 0;
      const absent = !!absences[`${cm}-${d}`];
      rows.push({
        "Дата": `${d < 10 ? "0" + d : d}.${cm + 1 < 10 ? "0" + (cm + 1) : cm + 1}.${YEAR}`,
        "День": WEEKDAYS[dow(cm, d)],
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
    XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[cm]} ${YEAR}`);
    const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Календарь_${MONTHS[cm]}_${YEAR}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [cm, overtime, monthStats]);

  const exportMonthJpeg = useCallback(async () => {
    if (!monthViewRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(monthViewRef.current, {
      backgroundColor: "#0d1117",
      scale: 2,
    });
    const link = document.createElement("a");
    link.download = `Календарь_${MONTHS[cm]}_${YEAR}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  }, [cm]);

  const cmStats = monthStats[cm];

  const payPeriods = useMemo(() => {
    const totalWork = cmStats.workDays;
    const end = daysInMonth(cm);
    const wd1 = countWorkDays(cm, 1, 15);
    const wd2 = countWorkDays(cm, 16, end);
    // Use adjustedOklad so deductions are reflected in both halves proportionally
    const dayRate = totalWork > 0 ? cmStats.adjustedOklad / totalWork : 0;
    const ot1 = sumOTHours(overtime, cm, 1, 15);
    const ot2 = sumOTHours(overtime, cm, 16, end);
    // Effective OT per period: cover debt proportionally across periods
    const debtHours = cmStats.debtHours;
    const debtRatio1 = totalWork > 0 ? wd1 / totalWork : 0.5;
    const debt1 = debtHours * debtRatio1;
    const debt2 = debtHours - debt1;
    const effOT1 = Math.max(0, ot1 - debt1);
    const effOT2 = Math.max(0, ot2 - debt2);
    const advance = dayRate * wd1 + effOT1 * otRate;
    const settlement = dayRate * wd2 + effOT2 * otRate;
    return { wd1, wd2, ot1: effOT1, ot2: effOT2, advance, settlement };
  }, [cm, oklad, otRate, overtime, cmStats]);

  const totalDays = daysInMonth(cm);
  const first = firstDow(cm);
  const calCells = [];
  for (let i = 0; i < first; i++) calCells.push(<td key={`e${i}`} className="dc-empty" />);

  for (let d = 1; d <= totalDays; d++) {
    const type = getDayType(cm, d);
    const key = `${cm}-${d}`;
    const ot = overtime[key] || 0;
    const isAbsent = !!absences[key];
    const isSel = selectedDays.has(d);
    const isEdit = editingDay === key;
    const isSat = isSaturday(cm, d);
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
    if (today.getFullYear() === YEAR && today.getMonth() === cm && today.getDate() === d) cls += " dc-today";

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
      </td>
    );
  }

  const calRows = [];
  for (let i = 0; i < calCells.length; i += 7) calRows.push(<tr key={i}>{calCells.slice(i, i + 7)}</tr>);

  let editInfo = null;
  if (editingDay) {
    const [em, ed] = editingDay.split("-").map(Number);
    const eType = getDayType(em, ed);
    editInfo = {
      m: em, d: ed, type: eType, isSat: isSaturday(em, ed), dow: dow(em, ed),
      isAbsent: !!absences[editingDay],
      canAbsent: eType === "workday" || eType === "preholiday",
    };
  }

  if (!loaded) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080c16", color: "#6b7280" }}>
      Загрузка...
    </div>
  );

  const currentYear = new Date().getFullYear();

  return (
    <div className="root">
      <div className="user-bar">
        {user.image && <Image src={user.image} alt="" width={32} height={32} style={{ borderRadius: "50%" }} referrerPolicy="no-referrer" />}
        <span>{user.name}</span>
        <button onClick={() => signOut()}>Выйти</button>
      </div>

      {currentYear !== YEAR && (
        <div style={{ background: "#7c2d12", color: "#fed7aa", padding: "10px 16px", textAlign: "center", fontSize: 13, borderRadius: 8, margin: "8px 0" }}>
          Внимание: календарь составлен для {YEAR} года, данные могут быть неактуальны для {currentYear}.
        </div>
      )}

      {saveError && (
        <div style={{ background: "#7f1d1d", color: "#fca5a5", padding: "8px 16px", textAlign: "center", fontSize: 13, borderRadius: 8, margin: "4px 0" }}>
          Ошибка сохранения настроек. Проверьте соединение.
        </div>
      )}

      <div className="hdr">
        <h1>Производственный Календарь Компьютролс<span className="badge">2026</span></h1>
        <div className="hdr-sub">Калькулятор зарплаты с переработками</div>
      </div>

      <div className="tabs">
        {[ ["calc", "Калькулятор"], ["year", "Годовой обзор"] ].map(([k, v]) => (
          <button key={k} className={`tb ${tab === k ? "tb-a" : ""}`} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>

      {tab === "calc" && (<>
        <div className="settings">
          <div className="settings-title">Настройки</div>
          <div className="s-row">
            <div className="s-field"><label>Оклад / месяц</label>
              <input className="s-input" type="number" min="0" step="1000" value={oklad || ""} onChange={(e) => setOklad(Math.max(0, parseFloat(e.target.value) || 0))} /><div className="s-unit">₽ фиксированный</div></div>
            <div className="s-field"><label>Ставка переработки</label>
              <input className="s-input" type="number" min="0" step="1" value={otRate || ""} onChange={(e) => setOtRate(Math.max(0, parseFloat(e.target.value) || 0))} /><div className="s-unit">₽ / час</div></div>
            <div className="s-field"><label>Будни перераб.</label>
              <input className="s-input" type="number" min="0" max="16" step="0.5" value={otDefault} onChange={(e) => setOtDefault(Math.max(0, Math.min(16, parseFloat(e.target.value) || 0)))} /><div className="s-unit">часов сверх 8ч</div></div>
            <div className="s-field"><label>Суббота перераб.</label>
              <input className="s-input" type="number" min="0" max="24" step="0.5" value={satDefault} onChange={(e) => setSatDefault(Math.max(0, Math.min(24, parseFloat(e.target.value) || 0)))} /><div className="s-unit">часов</div></div>
          </div>
        </div>

        <div className="mstrip">
          {MONTHS.map((_, i) => { const s = monthStats[i]; return (
            <div key={i} className={`mm ${i === cm ? "mm-a" : ""} ${s.otHours > 0 ? "mm-has" : ""}`} onClick={() => setCm(i)}>
              <div className="mm-name">{MONTHS_SHORT[i]}</div>
              <div className="mm-total">{fmt(s.total)}₽</div>
              {s.otHours > 0 && <div className="mm-ot">+{s.otHours}ч</div>}
            </div>
          ); })}
        </div>

        <div className="summary">
          <div className="sum-title">{MONTHS[cm]} {YEAR}</div>
          <div className="sum-grid">
            <div className="sg"><div className="sg-v v-blue">{cmStats.workDays}</div><div className="sg-l">рабочих дней</div></div>
            <div className="sg"><div className="sg-v v-green">{cmStats.otHours}</div><div className="sg-l">часов переработки</div></div>
            <div className="sg"><div className="sg-v v-orange">{fmt(cmStats.total)} ₽</div><div className="sg-l">итого за месяц</div></div>
          </div>
          <div className="sum-breakdown">
            <div className="sb-line"><span>Оклад</span><span className="sb-val">{fmt(oklad)} ₽</span></div>
            {cmStats.absentCount > 0 && (<>
              <div className="sb-line"><span>Пропущено: {cmStats.absentCount} дн. (долг {cmStats.debtHours} ч)</span><span className="sb-val" style={{ color: "#ef4444" }}>—</span></div>
              {cmStats.debtHours > cmStats.otHours ? null : <div className="sb-line"><span>Покрыто переработкой: {Math.min(cmStats.debtHours, cmStats.otHours)} ч</span><span className="sb-val" style={{ color: "#10b981" }}>✓</span></div>}
              {cmStats.deduction > 0 && <div className="sb-line"><span>Вычет из оклада</span><span className="sb-val" style={{ color: "#ef4444" }}>−{fmt(Math.round(cmStats.deduction))} ₽</span></div>}
            </>)}
            <div className="sb-line"><span>Переработка: {cmStats.effectiveOT} ч × {fmt(otRate)} ₽</span><span className="sb-val">{fmt(cmStats.otPay)} ₽</span></div>
            <div className="sb-line sb-total"><span>Итого</span><span className="sb-val">{fmt(Math.round(cmStats.total))} ₽</span></div>
          </div>
          <div className="pay-periods">
            <div className="pp">
              <div className="pp-label">Аванс <span className="pp-range">1–15</span></div>
              <div className="pp-row">
                <span className="pp-type pp-type-card">💳 Карта</span>
                <span className="pp-sum">{fmt(Math.round(oklad / cmStats.workDays * payPeriods.wd1))} ₽</span>
              </div>
              <div className="pp-row">
                <span className="pp-type pp-type-cash">💵 Наличные</span>
                <span className="pp-sum">{payPeriods.ot1 > 0 ? fmt(payPeriods.ot1 * otRate) + " ₽" : "—"}</span>
              </div>
              <div className="pp-total">{fmt(payPeriods.advance)} ₽</div>
            </div>
            <div className="pp-divider">+</div>
            <div className="pp">
              <div className="pp-label">Перерасчёт <span className="pp-range">16–{daysInMonth(cm)}</span></div>
              <div className="pp-row">
                <span className="pp-type pp-type-card">💳 Карта</span>
                <span className="pp-sum">{fmt(Math.round(oklad / cmStats.workDays * payPeriods.wd2))} ₽</span>
              </div>
              <div className="pp-row">
                <span className="pp-type pp-type-cash">💵 Наличные</span>
                <span className="pp-sum">{payPeriods.ot2 > 0 ? fmt(payPeriods.ot2 * otRate) + " ₽" : "—"}</span>
              </div>
              <div className="pp-total">{fmt(payPeriods.settlement)} ₽</div>
            </div>
          </div>
        </div>

        {selMode && (
          <div className="sel-bar">
            <div className="sel-bar-top">
              <span className="sel-bar-title">Выбрано: {selectedDays.size} дн.</span>
              <button className="sel-bar-cancel" onClick={exitSelMode}>Отменить выделение</button>
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
              <button className="sel-bar-del" onClick={() => applyBulk(0)}>Убрать</button>
              <div className="sel-quick">
                {[1, 2, 3, 4, 6, 8].map((h) => (
                  <button key={h} className="sel-q" onClick={() => setBulkVal(h.toString())}>{h}ч</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {editInfo && !selMode && (
          <div className="edit-bar">
            <span className="eb-label">{editInfo.d} {MONTHS_SHORT[editInfo.m]}, {WEEKDAYS[editInfo.dow]}
              {editInfo.type === "preholiday" ? " (сокр.)" : ""}{editInfo.isSat && editInfo.type === "weekend" ? " (сб)" : ""}
            </span>
            {!editInfo.isAbsent && (<>
              <span style={{ fontSize: 11, color: "#6b7280" }}>Переработка:</span>
              <input className="eb-input" type="number" min="0" max="24" step="0.5" value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setEditingDay(null); }} autoFocus />
              <span style={{ fontSize: 11, color: "#6b7280" }}>ч</span>
              <button className="eb-ok" onClick={confirmEdit}>OK</button>
              <button className="eb-del" onClick={() => { setDayOT(editInfo.m, editInfo.d, 0); setEditingDay(null); }}>Убрать</button>
            </>)}
            {editInfo.canAbsent && (
              <button
                className={`eb-abs${editInfo.isAbsent ? " eb-abs-active" : ""}`}
                onClick={() => { toggleAbsence(editInfo.m, editInfo.d); setEditingDay(null); }}
              >
                {editInfo.isAbsent ? "Снять пропуск" : "Не работал"}
              </button>
            )}
            <button className="eb-cancel" onClick={() => setEditingDay(null)}>✕</button>
            {!editInfo.isAbsent && (
              <div className="eb-quick">
                {[1, 2, 3, 4, 6, 8].map((h) => (<button key={h} className="eb-q" onClick={() => setEditVal(h.toString())}>{h}ч</button>))}
              </div>
            )}
          </div>
        )}

        <div className="month-view" ref={monthViewRef}>
          <div className="mv-header">
            <div className="mv-title">{MONTHS[cm]}</div>
            <div className="mv-actions">
              <button className="mv-btn mv-btn-fill" onClick={() => fillMonth(cm)}>Заполнить ({otDefault}ч+{satDefault}ч сб)</button>
              <button className="mv-btn" onClick={exportMonthExcel}>Excel</button>
              <button className="mv-btn" onClick={exportMonthJpeg}>JPEG</button>
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

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 14 }}>
          <button className="mv-btn" onClick={() => setCm(Math.max(0, cm - 1))} disabled={cm === 0}>← {cm > 0 ? MONTHS_SHORT[cm - 1] : ""}</button>
          <button className="mv-btn" onClick={() => setCm(Math.min(11, cm + 1))} disabled={cm === 11}>{cm < 11 ? MONTHS_SHORT[cm + 1] : ""} →</button>
        </div>
      </>)}

      {tab === "year" && (
        <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="mv-btn" onClick={exportExcel}>Экспорт Excel</button>
            <button className="mv-btn" onClick={exportJpeg}>Экспорт JPEG</button>
          </div>
          <table className="yo-tbl" ref={yearTableRef}>
            <thead><tr><th>Месяц</th><th>Раб.дн.</th><th>Оклад</th><th>Вычет</th><th>Перераб.(ч)</th><th>Перераб.(₽)</th><th>Итого</th></tr></thead>
            <tbody>
              {monthStats.map((s, i) => (
                <tr key={i}><td className="yo-m" onClick={() => { setCm(i); setTab("calc"); }}>{MONTHS_SHORT[i]}</td>
                  <td>{s.workDays}</td><td>{fmt(s.oklad)}</td>
                  <td style={{ color: "#ef4444", fontWeight: 600 }}>{s.deduction > 0 ? `−${fmt(Math.round(s.deduction))}` : "—"}</td>
                  <td className="yo-h">{s.effectiveOT || "—"}</td>
                  <td className="yo-p">{s.otPay ? fmt(s.otPay) : "—"}</td><td className="yo-t">{fmt(Math.round(s.total))}</td></tr>
              ))}
              <tr className="yo-total"><td className="yo-m">{YEAR} год</td><td>247</td><td>{fmt(Math.round(yearTotals.oklad))}</td>
                <td style={{ color: "#ef4444", fontWeight: 700 }}>{yearTotals.deduction > 0 ? `−${fmt(Math.round(yearTotals.deduction))}` : "—"}</td>
                <td className="yo-h">{yearTotals.otHours || "—"}</td><td className="yo-p">{yearTotals.otPay ? fmt(yearTotals.otPay) : "—"}</td>
                <td className="yo-t">{fmt(Math.round(yearTotals.total))}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
