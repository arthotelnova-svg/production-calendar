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
      month INTEGER,
      day INTEGER,
      hours REAL,
      UNIQUE(user_id, month, day)
    );

    CREATE TABLE IF NOT EXISTS absences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id),
      month INTEGER,
      day INTEGER,
      UNIQUE(user_id, month, day)
    );
  `);

  return g._db;
}
