import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db = null;

export function getDb() {
  if (db) return db;

  const dbPath = path.resolve(process.env.DATABASE_PATH || "./data/calendar.db");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
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
  `);

  return db;
}
