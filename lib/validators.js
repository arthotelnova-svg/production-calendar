export function validateMonth(val) {
  const m = parseInt(val, 10);
  return Number.isInteger(m) && m >= 0 && m <= 11 ? m : null;
}

export function validateDay(val) {
  const d = parseInt(val, 10);
  return Number.isInteger(d) && d >= 1 && d <= 31 ? d : null;
}

export function validateHours(val) {
  const h = parseFloat(val);
  return isFinite(h) && h >= 0 && h <= 24 ? h : null;
}
