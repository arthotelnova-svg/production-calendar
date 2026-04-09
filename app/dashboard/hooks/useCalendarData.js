"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  daysInMonth, getDayType, isSaturday,
} from "../../../lib/calendar";

export async function api(url, method = "GET", body = null, signal = null) {
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

  // Load all data on mount
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

  // Debounced settings save
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
    const total = daysInMonth(m);
    const items = [];
    const updates = {};
    for (let d = 1; d <= total; d++) {
      const type = getDayType(m, d);
      const key = `${m}-${d}`;
      if (type === "workday" || type === "preholiday") {
        updates[key] = otD;
        items.push({ day: d, hours: otD });
      } else if (isSaturday(m, d) && type === "weekend") {
        updates[key] = satD;
        items.push({ day: d, hours: satD });
      }
    }
    setOvertime((prev) => ({ ...prev, ...updates }));
    api("/api/overtime", "POST", { bulk: true, month: m, items });
  }, []);

  const clearMonth = useCallback(async (m) => {
    setOvertime((prev) => {
      const next = { ...prev };
      const total = daysInMonth(m);
      for (let d = 1; d <= total; d++) delete next[`${m}-${d}`];
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
    absences,
    loaded, saveError,
    setDayOT, applyBulkOT, fillMonth, clearMonth, toggleAbsence,
  };
}
