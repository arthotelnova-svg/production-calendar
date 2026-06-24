#!/usr/bin/env bash
set -euo pipefail

DB="/root/production-calendar/data/calendar.db"
BASE="/root/production-calendar-backups/rotating"
NOW_DAY=$(date +%Y%m%d)
NOW_WEEK=$(date +%G-W%V)
NOW_MONTH=$(date +%Y%m)

mkdir -p "$BASE/daily/$NOW_DAY" "$BASE/weekly/$NOW_WEEK" "$BASE/monthly/$NOW_MONTH"

sqlite3 "$DB" ".backup '$BASE/daily/$NOW_DAY/calendar.db'"

if [ "$(date +%u)" = "1" ]; then
  sqlite3 "$DB" ".backup '$BASE/weekly/$NOW_WEEK/calendar.db'"
fi

if [ "$(date +%d)" = "01" ]; then
  sqlite3 "$DB" ".backup '$BASE/monthly/$NOW_MONTH/calendar.db'"
fi

find "$BASE/daily" -mindepth 1 -maxdepth 1 -type d | sort | head -n -30 | xargs -r rm -rf
find "$BASE/weekly" -mindepth 1 -maxdepth 1 -type d | sort | head -n -12 | xargs -r rm -rf
find "$BASE/monthly" -mindepth 1 -maxdepth 1 -type d | sort | head -n -6 | xargs -r rm -rf

echo "backup ok: $(date -Is)"
