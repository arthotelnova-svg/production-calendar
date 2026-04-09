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
