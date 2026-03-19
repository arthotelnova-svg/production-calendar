"use client";
import { useState, useEffect, useMemo, useCallback } from "react";

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

function daysInMonth(m) { return new Date(2026, m + 1, 0).getDate(); }
function firstDow(m) { const d = new Date(2026, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function dow(m, day) { const d = new Date(2026, m, day).getDay(); return d === 0 ? 6 : d - 1; }
function getDayType(month, day) {
  const key = `${month}-${day}`;
  if (HOLIDAYS.has(key)) return "holiday";
  if (PRE_HOLIDAY.has(key)) return "preholiday";
  const d = new Date(2026, month, day).getDay();
  if (d === 0 || d === 6) return "weekend";
  return "workday";
}
function isSaturday(m, d) { return new Date(2026, m, d).getDay() === 6; }
function fmt(n) { return n === 0 ? "0" : n.toLocaleString("ru-RU", { maximumFractionDigits: 2 }); }

async function api(url, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
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

  useEffect(() => {
    Promise.all([api("/api/settings"), api("/api/overtime")]).then(([s, o]) => {
      if (s && !s.error) {
        setOklad(s.oklad ?? 135000);
        setOtRate(s.ot_rate ?? 164);
        setOtDefault(s.ot_weekday ?? 2);
        setSatDefault(s.ot_saturday ?? 8);
      }
      if (o && !o.error) setOvertime(o);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      api("/api/settings", "POST", { oklad, ot_rate: otRate, ot_weekday: otDefault, ot_saturday: satDefault });
    }, 800);
    return () => clearTimeout(t);
  }, [oklad, otRate, otDefault, satDefault, loaded]);

  const saveOT = useCallback((m, d, hours) => {
    api("/api/overtime", "POST", { month: m, day: d, hours });
  }, []);

  const setDayOT = useCallback((m, d, hours) => {
    setOvertime((prev) => {
      const next = { ...prev };
      const key = `${m}-${d}`;
      if (hours <= 0) delete next[key]; else next[key] = hours;
      return next;
    });
    saveOT(m, d, hours);
  }, [saveOT]);

  const fillMonth = useCallback((m) => {
    const total = daysInMonth(m);
    const items = [];
    const next = { ...overtime };
    for (let d = 1; d <= total; d++) {
      const type = getDayType(m, d);
      const key = `${m}-${d}`;
      if (type === "workday" || type === "preholiday") {
        next[key] = otDefault;
        items.push({ day: d, hours: otDefault });
      } else if (isSaturday(m, d) && type === "weekend") {
        next[key] = satDefault;
        items.push({ day: d, hours: satDefault });
      }
    }
    setOvertime(next);
    api("/api/overtime", "POST", { bulk: true, month: m, items });
  }, [overtime, otDefault, satDefault]);

  const clearMonth = useCallback((m) => {
    const next = { ...overtime };
    const total = daysInMonth(m);
    for (let d = 1; d <= total; d++) delete next[`${m}-${d}`];
    setOvertime(next);
    fetch(`/api/overtime?month=${m}`, { method: "DELETE" });
  }, [overtime]);

  const handleDayClick = useCallback((m, d) => {
    const type = getDayType(m, d);
    if (type === "holiday") return;
    const key = `${m}-${d}`;
    if (editingDay === key) { setEditingDay(null); return; }
    setEditingDay(key);
    setEditVal(overtime[key]?.toString() || "");
  }, [editingDay, overtime]);

  const confirmEdit = useCallback(() => {
    if (!editingDay) return;
    const [ms, ds] = editingDay.split("-").map(Number);
    const val = parseFloat(editVal) || 0;
    setDayOT(ms, ds, val);
    setEditingDay(null);
  }, [editingDay, editVal, setDayOT]);

  const monthStats = useMemo(() => {
    return MONTHS.map((_, m) => {
      let otHours = 0;
      for (let d = 1; d <= daysInMonth(m); d++) {
        const key = `${m}-${d}`;
        if (overtime[key]) otHours += overtime[key];
      }
      return { workDays: MONTHLY_DATA[m].work, otHours, otPay: otHours * otRate, oklad, total: oklad + otHours * otRate };
    });
  }, [overtime, otRate, oklad]);

  const yearTotals = useMemo(() => {
    let otH = 0, otP = 0;
    monthStats.forEach((s) => { otH += s.otHours; otP += s.otPay; });
    return { otHours: otH, otPay: otP, oklad: oklad * 12, total: oklad * 12 + otP };
  }, [monthStats, oklad]);

  const cmStats = monthStats[cm];

  const totalDays = daysInMonth(cm);
  const first = firstDow(cm);
  const calCells = [];
  for (let i = 0; i < first; i++) calCells.push(<td key={`e${i}`} className="dc-empty" />);
  for (let d = 1; d <= totalDays; d++) {
    const type = getDayType(cm, d);
    const key = `${cm}-${d}`;
    const ot = overtime[key] || 0;
    const isEdit = editingDay === key;
    const isSat = isSaturday(cm, d);
    let cls = "dc";
    if (type === "holiday") cls += " dc-hol";
    else if (type === "weekend") { cls += isSat ? " dc-sat" : " dc-sun"; }
    else if (type === "preholiday") cls += " dc-pre";
    else cls += " dc-wd";
    if (ot > 0) cls += " dc-ot";
    if (isEdit) cls += " dc-edit";
    const today = new Date();
    if (today.getFullYear() === 2026 && today.getMonth() === cm && today.getDate() === d) cls += " dc-today";

    calCells.push(
      <td key={d} className={cls} onClick={() => handleDayClick(cm, d)}>
        <div className="dc-num">{d}</div>
        {ot > 0 && <div className="dc-badge">+{ot}ч</div>}
        {type === "preholiday" && <div className="dc-star">*</div>}
      </td>
    );
  }
  const calRows = [];
  for (let i = 0; i < calCells.length; i += 7) calRows.push(<tr key={i}>{calCells.slice(i, i + 7)}</tr>);

  let editInfo = null;
  if (editingDay) {
    const [em, ed] = editingDay.split("-").map(Number);
    editInfo = { m: em, d: ed, type: getDayType(em, ed), isSat: isSaturday(em, ed), dow: dow(em, ed) };
  }

  if (!loaded) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080c16", color: "#6b7280" }}>
      Загрузка...
    </div>
  );

  return (
    <div className="root">
      <style>{`
.root{font-family:'Manrope',sans-serif;min-height:100vh;background:#080c16;color:#e2ded8;padding:14px;box-sizing:border-box;max-width:960px;margin:0 auto}
.root *{box-sizing:border-box}
.hdr{text-align:center;margin-bottom:14px;position:relative}
.hdr h1{font-family:'Unbounded';font-weight:800;font-size:20px;margin:0 0 2px;background:linear-gradient(135deg,#ff6b35,#ffb347,#ff6b35);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hdr-sub{font-size:10px;color:#555b68}
.badge{display:inline-block;background:linear-gradient(135deg,#ff6b35,#d44a10);color:#fff;font-family:'Unbounded';font-weight:800;font-size:12px;padding:2px 10px;border-radius:14px;margin-left:5px;vertical-align:middle}
.user-bar{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:10px}
.user-bar img{width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,107,53,.3)}
.user-bar span{font-size:12px;color:#9ca3af}.user-bar a,.user-bar button{font-size:11px;color:#555b68;text-decoration:none;padding:3px 10px;border:1px solid rgba(255,255,255,.08);border-radius:6px;background:transparent;cursor:pointer}
.user-bar a:hover,.user-bar button:hover{border-color:#ef4444;color:#ef4444}
.tabs{display:flex;gap:3px;justify-content:center;margin-bottom:14px;background:rgba(255,255,255,.03);border-radius:10px;padding:3px}
.tb{flex:1;padding:7px 8px;border:none;background:transparent;color:#555b68;font-family:'Manrope';font-size:11px;font-weight:700;cursor:pointer;border-radius:8px;transition:all .2s}
.tb:hover{color:#e2ded8}.tb-a{background:linear-gradient(135deg,#ff6b35,#d44a10);color:#fff!important}
.settings{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px;margin-bottom:14px}
.settings-title{font-family:'Unbounded';font-size:11px;font-weight:600;color:#888e9b;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px}
.s-row{display:flex;gap:10px;flex-wrap:wrap}.s-field{flex:1;min-width:120px}.s-field label{display:block;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px}
.s-input{width:100%;padding:7px 10px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);border-radius:7px;color:#fff;font-family:'Manrope';font-size:13px;font-weight:600;outline:none;transition:border .2s}
.s-input:focus{border-color:#ff6b35}.s-unit{font-size:9px;color:#555b68;margin-top:2px}
.mstrip{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:14px}@media(max-width:500px){.mstrip{grid-template-columns:repeat(4,1fr)}}
.mm{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);border-radius:10px;padding:8px 6px;text-align:center;cursor:pointer;transition:all .2s}.mm:hover{border-color:rgba(255,107,53,.25)}.mm-a{border-color:#ff6b35!important;background:rgba(255,107,53,.08)!important}.mm-has{border-color:rgba(16,185,129,.2)}
.mm-name{font-family:'Unbounded';font-size:10px;font-weight:600;color:#9ca3af}.mm-a .mm-name{color:#ff6b35}.mm-total{font-size:11px;font-weight:700;color:#e2ded8;margin-top:2px}.mm-ot{font-size:9px;color:#10b981;font-weight:600;margin-top:1px}
.summary{background:linear-gradient(135deg,rgba(255,107,53,.06),rgba(255,179,71,.02));border:1px solid rgba(255,107,53,.12);border-radius:14px;padding:14px;margin-bottom:14px}
.sum-title{font-family:'Unbounded';font-size:12px;font-weight:600;color:#ff6b35;margin-bottom:10px}.sum-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}.sg{text-align:center;padding:10px 8px;background:rgba(0,0,0,.15);border-radius:10px}
.sg-v{font-family:'Unbounded';font-size:18px;font-weight:700}.sg-v.v-orange{color:#ff6b35}.sg-v.v-green{color:#10b981}.sg-v.v-blue{color:#60a5fa}.sg-l{font-size:9px;color:#6b7280;margin-top:2px}
.sum-breakdown{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.04);font-size:12px;color:#9ca3af;line-height:1.8}.sb-line{display:flex;justify-content:space-between}.sb-val{font-weight:700;color:#e2ded8;font-family:'Unbounded';font-size:12px}.sb-total{font-size:14px;color:#ff6b35;border-top:2px solid rgba(255,107,53,.2);padding-top:6px;margin-top:4px}.sb-total .sb-val{color:#ff6b35;font-size:16px}
.edit-bar{background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.2);border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;animation:fadeIn .2s ease}@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.eb-label{font-size:12px;font-weight:600;color:#93c5fd;white-space:nowrap}.eb-input{width:70px;padding:5px 8px;background:rgba(0,0,0,.3);border:1px solid rgba(96,165,250,.3);border-radius:6px;color:#fff;font-family:'Manrope';font-size:14px;font-weight:700;outline:none;text-align:center}
.eb-ok{padding:5px 14px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:6px;color:#fff;font-family:'Manrope';font-size:12px;font-weight:700;cursor:pointer}.eb-del{padding:5px 14px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:6px;color:#ef4444;font-family:'Manrope';font-size:12px;font-weight:700;cursor:pointer}.eb-cancel{padding:5px 12px;background:transparent;border:1px solid rgba(255,255,255,.1);border-radius:6px;color:#6b7280;font-family:'Manrope';font-size:12px;font-weight:600;cursor:pointer}.eb-quick{display:flex;gap:4px;margin-left:auto}.eb-q{padding:3px 8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:5px;color:#9ca3af;font-size:10px;font-weight:600;cursor:pointer;font-family:'Manrope'}.eb-q:hover{border-color:#60a5fa;color:#60a5fa}
.month-view{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px;margin-bottom:14px}.mv-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px}.mv-title{font-family:'Unbounded';font-weight:700;font-size:16px;color:#eae5df}.mv-actions{display:flex;gap:6px;flex-wrap:wrap}.mv-btn{padding:5px 12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#9ca3af;font-family:'Manrope';font-size:10px;font-weight:700;border-radius:7px;cursor:pointer;transition:all .2s;white-space:nowrap}.mv-btn:hover{border-color:#ff6b35;color:#ff6b35}.mv-btn-fill{background:linear-gradient(135deg,rgba(16,185,129,.15),rgba(16,185,129,.05));border-color:rgba(16,185,129,.3);color:#10b981}.mv-btn-clr{border-color:rgba(239,68,68,.2);color:#ef4444}
.cal-tbl{width:100%;border-collapse:collapse;table-layout:fixed}.cal-tbl th{font-size:10px;font-weight:700;color:#3e4451;padding:4px 0;text-transform:uppercase}.th-we{color:#b91c1c!important}.dc{text-align:center;padding:4px 2px;border-radius:7px;position:relative;cursor:pointer;transition:all .12s;vertical-align:top;height:42px}.dc-empty{cursor:default}.dc-num{font-size:12px;font-weight:600;line-height:1}.dc-badge{font-size:8px;font-weight:700;color:#10b981;margin-top:1px;background:rgba(16,185,129,.1);border-radius:3px;padding:0 3px}.dc-star{position:absolute;top:1px;right:2px;font-size:7px;color:#f7c948}.dc-wd{color:#c5c0b8}.dc-wd:hover{background:rgba(255,255,255,.06)}.dc-sat{color:#ef4444;opacity:.7}.dc-sat:hover{background:rgba(239,68,68,.06);opacity:1}.dc-sun{color:#ef4444;cursor:default}.dc-hol{color:#fff;background:rgba(239,68,68,.15);font-weight:700;cursor:default}.dc-pre{color:#f7c948;background:rgba(247,201,72,.06)}.dc-pre:hover{background:rgba(247,201,72,.12)}.dc-ot{background:rgba(16,185,129,.08)!important}.dc-edit{outline:2px solid #60a5fa;outline-offset:-1px;background:rgba(96,165,250,.1)!important}.dc-today{box-shadow:inset 0 0 0 2px #ff6b35}
.legend{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;font-size:10px;margin-bottom:10px}.lg{display:flex;align-items:center;gap:4px}.ld{width:10px;height:10px;border-radius:3px}.ld-wd{background:#1a2030;border:1px solid #2a3040}.ld-we{background:rgba(239,68,68,.12);border:1px solid #ef4444}.ld-hol{background:rgba(239,68,68,.25);border:1px solid #ef4444}.ld-pre{background:rgba(247,201,72,.1);border:1px solid #f7c948}.ld-ot{background:rgba(16,185,129,.12);border:1px solid #10b981}
.yo-tbl{width:100%;border-collapse:collapse;font-size:11px}.yo-tbl th{background:rgba(255,255,255,.04);font-weight:700;padding:7px 5px;text-align:center;border-bottom:2px solid rgba(255,107,53,.2);font-size:9px;text-transform:uppercase;color:#6b7280}.yo-tbl td{padding:6px 5px;text-align:center;border-bottom:1px solid rgba(255,255,255,.025)}.yo-tbl tbody tr:hover{background:rgba(255,255,255,.02)}.yo-m{text-align:left!important;font-weight:600;color:#c5c0b8;cursor:pointer}.yo-m:hover{color:#ff6b35}.yo-h{color:#10b981;font-weight:600}.yo-p{color:#60a5fa;font-weight:600}.yo-t{color:#ff6b35;font-weight:700}.yo-total{background:rgba(255,107,53,.06)!important;font-weight:700;border-top:2px solid rgba(255,107,53,.3)}.yo-total .yo-m{color:#ff6b35;font-family:'Unbounded';font-size:11px;cursor:default}
      `}</style>

      <div className="user-bar">
        {user.image && <img src={user.image} alt="" />}
        <span>{user.name}</span>
        <form action="/api/auth/signout" method="post">
          <button type="submit">Выйти</button>
        </form>
      </div>

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
          <div className="sum-title">{MONTHS[cm]} 2026</div>
          <div className="sum-grid">
            <div className="sg"><div className="sg-v v-blue">{cmStats.workDays}</div><div className="sg-l">рабочих дней</div></div>
            <div className="sg"><div className="sg-v v-green">{cmStats.otHours}</div><div className="sg-l">часов переработки</div></div>
            <div className="sg"><div className="sg-v v-orange">{fmt(cmStats.total)} ₽</div><div className="sg-l">итого за месяц</div></div>
          </div>
          <div className="sum-breakdown">
            <div className="sb-line"><span>Оклад</span><span className="sb-val">{fmt(oklad)} ₽</span></div>
            <div className="sb-line"><span>Переработка: {cmStats.otHours} ч × {fmt(otRate)} ₽</span><span className="sb-val">{fmt(cmStats.otPay)} ₽</span></div>
            <div className="sb-line sb-total"><span>Итого</span><span className="sb-val">{fmt(cmStats.total)} ₽</span></div>
          </div>
        </div>

        {editInfo && (
          <div className="edit-bar">
            <span className="eb-label">{editInfo.d} {MONTHS_SHORT[editInfo.m]}, {WEEKDAYS[editInfo.dow]}
              {editInfo.type === "preholiday" ? " (сокр.)" : ""}{editInfo.isSat && editInfo.type === "weekend" ? " (сб)" : ""}
            </span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>Переработка:</span>
            <input className="eb-input" type="number" min="0" max="24" step="0.5" value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setEditingDay(null); }} autoFocus />
            <span style={{ fontSize: 11, color: "#6b7280" }}>ч</span>
            <button className="eb-ok" onClick={confirmEdit}>OK</button>
            <button className="eb-del" onClick={() => { setDayOT(editInfo.m, editInfo.d, 0); setEditingDay(null); }}>Убрать</button>
            <button className="eb-cancel" onClick={() => setEditingDay(null)}>✕</button>
            <div className="eb-quick">
              {[1, 2, 3, 4, 6, 8].map((h) => (<button key={h} className="eb-q" onClick={() => setEditVal(h.toString())}>{h}ч</button>))}
            </div>
          </div>
        )}

        <div className="month-view">
          <div className="mv-header">
            <div className="mv-title">{MONTHS[cm]}</div>
            <div className="mv-actions">
              <button className="mv-btn mv-btn-fill" onClick={() => fillMonth(cm)}>Заполнить ({otDefault}ч+{satDefault}ч сб)</button>
              <button className="mv-btn mv-btn-clr" onClick={() => clearMonth(cm)}>Очистить</button>
            </div>
          </div>
          <div className="legend">
            <div className="lg"><div className="ld ld-wd" /><span>Рабочий</span></div>
            <div className="lg"><div className="ld ld-we" /><span>Выходной</span></div>
            <div className="lg"><div className="ld ld-hol" /><span>Праздник</span></div>
            <div className="lg"><div className="ld ld-pre" /><span>Сокращённый*</span></div>
            <div className="lg"><div className="ld ld-ot" /><span>Переработка</span></div>
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
          <table className="yo-tbl">
            <thead><tr><th>Месяц</th><th>Раб.дн.</th><th>Оклад</th><th>Перераб.(ч)</th><th>Перераб.(₽)</th><th>Итого</th></tr></thead>
            <tbody>
              {monthStats.map((s, i) => (
                <tr key={i}><td className="yo-m" onClick={() => { setCm(i); setTab("calc"); }}>{MONTHS_SHORT[i]}</td>
                  <td>{s.workDays}</td><td>{fmt(s.oklad)}</td><td className="yo-h">{s.otHours || "—"}</td>
                  <td className="yo-p">{s.otPay ? fmt(s.otPay) : "—"}</td><td className="yo-t">{fmt(s.total)}</td></tr>
              ))}
              <tr className="yo-total"><td className="yo-m">2026 год</td><td>247</td><td>{fmt(yearTotals.oklad)}</td>
                <td className="yo-h">{yearTotals.otHours || "—"}</td><td className="yo-p">{yearTotals.otPay ? fmt(yearTotals.otPay) : "—"}</td>
                <td className="yo-t">{fmt(yearTotals.total)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
