import { auth } from "../../../auth";
import { getDb } from "../../../lib/db";
import { validateMonth, validateDay } from "../../../lib/validators";
import { recordMonthSnapshot } from "../../../lib/history";
import { NextResponse } from "next/server";

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year"), 10) || 2026;
    const db = getDb();
    const rows = db.prepare("SELECT month, day FROM absences WHERE user_id = ? AND year = ?").all(session.user.id, year);
    const data = {};
    rows.forEach((r) => {
      data[`${r.month}-${r.day}`] = true;
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const db = getDb();
    const year = parseInt(body.year, 10) || 2026;
    const ins = db.prepare("INSERT OR IGNORE INTO absences (user_id, year, month, day) VALUES (?, ?, ?, ?)");
    const delOvertimeDay = db.prepare("DELETE FROM overtime WHERE user_id = ? AND year = ? AND month = ? AND day = ?");

    if (body.bulk) {
      const month = validateMonth(body.month);
      if (month === null) return NextResponse.json({ error: "Invalid month" }, { status: 400 });
      if (!Array.isArray(body.items)) return NextResponse.json({ error: "Invalid items" }, { status: 400 });

      recordMonthSnapshot(db, {
        userId: session.user.id,
        actorUserId: session.user.id,
        year,
        month,
        action: "absence_bulk_replace",
        source: body.source || "absence_bulk",
        meta: { items_count: body.items.length },
      });

      const txn = db.transaction((items, y, m) => {
        db.prepare("DELETE FROM absences WHERE user_id = ? AND year = ? AND month = ?").run(session.user.id, y, m);
        items.forEach(({ day }) => {
          const d = validateDay(day);
          if (d !== null) {
            ins.run(session.user.id, y, m, d);
            delOvertimeDay.run(session.user.id, y, m, d);
          }
        });
      });
      txn(body.items, year, month);
    } else {
      const month = validateMonth(body.month);
      const day = validateDay(body.day);
      if (month === null || day === null) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
      }

      recordMonthSnapshot(db, {
        userId: session.user.id,
        actorUserId: session.user.id,
        year,
        month,
        action: "absence_set",
        source: body.source || "absence_single",
        meta: { day },
      });

      const txn = db.transaction(() => {
        ins.run(session.user.id, year, month, day);
        delOvertimeDay.run(session.user.id, year, month, day);
      });
      txn();
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year"), 10) || 2026;
    const monthParam = searchParams.get("month");
    const dayParam = searchParams.get("day");

    const month = validateMonth(monthParam);
    if (month === null) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

    const db = getDb();
    recordMonthSnapshot(db, {
      userId: session.user.id,
      actorUserId: session.user.id,
      year,
      month,
      action: dayParam !== null ? "absence_delete" : "absence_month_delete",
      source: searchParams.get("source") || "absence_delete",
      meta: { day: dayParam !== null ? Number(dayParam) : null },
    });
    if (dayParam !== null) {
      const day = validateDay(dayParam);
      if (day === null) return NextResponse.json({ error: "Invalid day" }, { status: 400 });
      db.prepare("DELETE FROM absences WHERE user_id = ? AND year = ? AND month = ? AND day = ?").run(session.user.id, year, month, day);
    } else {
      db.prepare("DELETE FROM absences WHERE user_id = ? AND year = ? AND month = ?").run(session.user.id, year, month);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
