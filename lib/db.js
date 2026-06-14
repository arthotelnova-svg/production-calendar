import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Use global to survive hot reload in dev without leaking connections
const g = globalThis;

export function getDb() {
  if (g._db) return g._db;

  const dbPath = path.resolve(process.env.DATABASE_PATH || "./data/calendar.db");
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  g._db = new Database(dbPath);
  const db = g._db;
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Migration logic for existing DBs
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='overtime'").get();
  if (tableCheck) {
    const columns = db.prepare("PRAGMA table_info(overtime)").all();
    const hasYear = columns.some(c => c.name === "year");
    if (!hasYear) {
      try {
        db.exec(`
          BEGIN TRANSACTION;
          ALTER TABLE overtime RENAME TO overtime_old;
          ALTER TABLE absences RENAME TO absences_old;
          
          CREATE TABLE overtime (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT REFERENCES users(id),
            year INTEGER DEFAULT 2026,
            month INTEGER,
            day INTEGER,
            hours REAL,
            UNIQUE(user_id, year, month, day)
          );

          CREATE TABLE absences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT REFERENCES users(id),
            year INTEGER DEFAULT 2026,
            month INTEGER,
            day INTEGER,
            UNIQUE(user_id, year, month, day)
          );
          
          INSERT INTO overtime (user_id, year, month, day, hours)
          SELECT user_id, 2026, month, day, hours FROM overtime_old;
          
          INSERT INTO absences (user_id, year, month, day)
          SELECT user_id, 2026, month, day FROM absences_old;
          
          DROP TABLE overtime_old;
          DROP TABLE absences_old;
          COMMIT;
        `);
      } catch (err) {
        console.error("Migration failed:", err);
      }
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      oklad REAL DEFAULT 135000,
      ot_rate REAL DEFAULT 164,
      ot_weekday REAL DEFAULT 2,
      ot_saturday REAL DEFAULT 8
    );

    CREATE TABLE IF NOT EXISTS overtime (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id),
      year INTEGER DEFAULT 2026,
      month INTEGER,
      day INTEGER,
      hours REAL,
      UNIQUE(user_id, year, month, day)
    );

    CREATE TABLE IF NOT EXISTS absences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id),
      year INTEGER DEFAULT 2026,
      month INTEGER,
      day INTEGER,
      UNIQUE(user_id, year, month, day)
    );
  `);

  return g._db;
}
