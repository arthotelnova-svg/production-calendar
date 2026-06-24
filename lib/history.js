import crypto from "crypto";

export function createBatchId() {
  return crypto.randomUUID();
}

export function getMonthState(db, userId, year, month) {
  const overtime = db
    .prepare("SELECT day, hours FROM overtime WHERE user_id = ? AND year = ? AND month = ? ORDER BY day")
    .all(userId, year, month);
  const absences = db
    .prepare("SELECT day FROM absences WHERE user_id = ? AND year = ? AND month = ? ORDER BY day")
    .all(userId, year, month)
    .map((row) => row.day);
  return { overtime, absences };
}

export function recordMonthSnapshot(db, { userId, actorUserId, year, month, action = "change", source = "manual", meta = {} }) {
  const snapshot = getMonthState(db, userId, year, month);
  const batchId = meta.batch_id || createBatchId();
  const result = db.prepare(
    `INSERT INTO change_log (batch_id, actor_user_id, user_id, year, month, action, source, snapshot_json, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    batchId,
    actorUserId || userId,
    userId,
    year,
    month,
    action,
    source,
    JSON.stringify(snapshot),
    JSON.stringify(meta || {})
  );
  return { id: Number(result.lastInsertRowid), batchId, snapshot };
}

function applyMonthState(db, userId, year, month, snapshot) {
  const insertOvertime = db.prepare(
    "INSERT OR REPLACE INTO overtime (user_id, year, month, day, hours) VALUES (?, ?, ?, ?, ?)"
  );
  const insertAbsence = db.prepare(
    "INSERT OR REPLACE INTO absences (user_id, year, month, day) VALUES (?, ?, ?, ?)"
  );

  db.transaction(() => {
    db.prepare("DELETE FROM overtime WHERE user_id = ? AND year = ? AND month = ?").run(userId, year, month);
    db.prepare("DELETE FROM absences WHERE user_id = ? AND year = ? AND month = ?").run(userId, year, month);

    (snapshot.overtime || []).forEach(({ day, hours }) => {
      if (hours > 0) insertOvertime.run(userId, year, month, day, hours);
    });
    (snapshot.absences || []).forEach((day) => {
      insertAbsence.run(userId, year, month, day);
    });
  })();
}

export function listMonthSnapshots(db, { userId, year, month, limit = 12 }) {
  const rows = db.prepare(
    `SELECT id, batch_id, action, source, created_at, snapshot_json
     FROM change_log
     WHERE user_id = ? AND year = ? AND month = ?
     ORDER BY id DESC
     LIMIT ?`
  ).all(userId, year, month, limit);

  return rows.map((row) => {
    const snapshot = JSON.parse(row.snapshot_json || "{}");
    return {
      id: row.id,
      batch_id: row.batch_id,
      action: row.action,
      source: row.source,
      created_at: row.created_at,
      overtime_count: Array.isArray(snapshot.overtime) ? snapshot.overtime.length : 0,
      absence_count: Array.isArray(snapshot.absences) ? snapshot.absences.length : 0,
    };
  });
}

export function restoreMonthSnapshot(db, { snapshotId, userId, actorUserId, action = "restore_snapshot", source = "recovery" }) {
  const row = db.prepare(
    "SELECT id, user_id, year, month, snapshot_json FROM change_log WHERE id = ? AND user_id = ?"
  ).get(snapshotId, userId);
  if (!row) return null;

  const snapshot = JSON.parse(row.snapshot_json || "{}");
  recordMonthSnapshot(db, {
    userId,
    actorUserId,
    year: row.year,
    month: row.month,
    action: `${action}_before`,
    source,
    meta: { target_snapshot_id: snapshotId },
  });
  applyMonthState(db, userId, row.year, row.month, snapshot);
  return { year: row.year, month: row.month, restored_from_snapshot_id: snapshotId };
}

export function undoLastBulkChange(db, { userId, actorUserId, year, month }) {
  const row = db.prepare(
    `SELECT id FROM change_log
     WHERE user_id = ? AND year = ? AND month = ?
       AND source IN ('bulk_apply', 'fill_month', 'clear_month')
     ORDER BY id DESC
     LIMIT 1`
  ).get(userId, year, month);
  if (!row) return null;
  return restoreMonthSnapshot(db, {
    snapshotId: row.id,
    userId,
    actorUserId,
    action: "undo_last_bulk",
    source: "undo",
  });
}
