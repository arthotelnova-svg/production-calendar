"use client";
import { useState, useEffect } from "react";
import GlassCard from "./GlassCard";
import styles from "../styles/glassmorphism.module.css";
import { MONTHS_SHORT, WEEKDAYS, dow, YEAR } from "../../../lib/calendar";

const MAX_CHARS = 500;

export default function NotesPanel({ month, day, initialNote = "", onSave, onClose }) {
  const [value, setValue] = useState(initialNote);
  const [saving, setSaving] = useState(false);

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
