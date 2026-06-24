import { auth } from "../../../auth";
import { getDb } from "../../../lib/db";
import { validateMonth, validateDay, validateHours } from "../../../lib/validators";
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
    const rows = db.prepare("SELECT month, day, hours FROM overtime WHERE user_id = ? AND year = ?").all(session.user.id, year);
    const data = {};
    rows.forEach((r) => {
      data[`${r.month}-${r.day}`] = r.hours;
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

    if (body.bulk) {
      const month = validateMonth(body.month);
      if (month === null) return NextResponse.json({ error: "Invalid month" }, { status: 400 });
      if (!Array.isArray(body.items)) return NextResponse.json({ error: "Invalid items" }, { status: 400 });

      const validItems = [];
      for (const item of body.items) {
        const day = validateDay(item.day);
        const hours = validateHours(item.hours);
        if (day === null || hours === null) return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
        validItems.push({ day, hours });
      }

      if (validItems.length > 0 && validItems.every(({ hours }) => hours <= 0)) {
        return NextResponse.json(
          { error: "Zero-fill bulk overwrite is blocked because it would clear the whole month" },
          { status: 400 }
        );
      }

      recordMonthSnapshot(db, {
        userId: session.user.id,
        actorUserId: session.user.id,
        year,
        month,
        action: "bulk_replace",
        source: body.source || "bulk_apply",
        meta: { items_count: validItems.length },
      });

      const del = db.prepare("DELETE FROM overtime WHERE user_id = ? AND year = ? AND month = ?");
      const ins = db.prepare("INSERT OR REPLACE INTO overtime (user_id, year, month, day, hours) VALUES (?, ?, ?, ?, ?)");
      const txn = db.transaction((items, y, m) => {
        del.run(session.user.id, y, m);
        items.forEach(({ day, hours }) => {
          if (hours > 0) ins.run(session.user.id, y, m, day, hours);
        });
      });
      txn(validItems, year, month);
    } else {
      const month = validateMonth(body.month);
      const day = validateDay(body.day);
      const hours = validateHours(body.hours);
      if (month === null || day === null || hours === null) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
      }

      recordMonthSnapshot(db, {
        userId: session.user.id,
        actorUserId: session.user.id,
        year,
        month,
        action: hours <= 0 ? "single_delete" : "single_set",
        source: body.source || "single_day",
        meta: { day, hours },
      });

      if (hours <= 0) {
        db.prepare("DELETE FROM overtime WHERE user_id = ? AND year = ? AND month = ? AND day = ?")
          .run(session.user.id, year, month, day);
      } else {
        db.prepare("INSERT OR REPLACE INTO overtime (user_id, year, month, day, hours) VALUES (?, ?, ?, ?, ?)")
          .run(session.user.id, year, month, day, hours);
      }
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
    if (monthParam === null) return NextResponse.json({ error: "Missing month" }, { status: 400 });

    const month = validateMonth(monthParam);
    if (month === null) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

    const db = getDb();
    recordMonthSnapshot(db, {
      userId: session.user.id,
      actorUserId: session.user.id,
      year,
      month,
      action: "month_delete",
      source: searchParams.get("source") || "clear_month",
    });
    db.prepare("DELETE FROM overtime WHERE user_id = ? AND year = ? AND month = ?").run(session.user.id, year, month);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
