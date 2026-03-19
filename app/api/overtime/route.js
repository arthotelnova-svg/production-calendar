import { auth } from "../../../auth";
import { getDb } from "../../../lib/db";
import { NextResponse } from "next/server";

function validateMonth(val) {
  const m = parseInt(val, 10);
  return Number.isInteger(m) && m >= 0 && m <= 11 ? m : null;
}
function validateDay(val) {
  const d = parseInt(val, 10);
  return Number.isInteger(d) && d >= 1 && d <= 31 ? d : null;
}
function validateHours(val) {
  const h = parseFloat(val);
  return isFinite(h) && h >= 0 && h <= 24 ? h : null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const rows = db.prepare("SELECT month, day, hours FROM overtime WHERE user_id = ?").all(session.user.id);
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

  try {
    const body = await request.json();
    const db = getDb();

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

      const del = db.prepare("DELETE FROM overtime WHERE user_id = ? AND month = ?");
      const ins = db.prepare("INSERT OR REPLACE INTO overtime (user_id, month, day, hours) VALUES (?, ?, ?, ?)");
      const txn = db.transaction((items, m) => {
        del.run(session.user.id, m);
        items.forEach(({ day, hours }) => {
          if (hours > 0) ins.run(session.user.id, m, day, hours);
        });
      });
      txn(validItems, month);
    } else {
      const month = validateMonth(body.month);
      const day = validateDay(body.day);
      const hours = validateHours(body.hours);
      if (month === null || day === null || hours === null) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 });
      }
      if (hours <= 0) {
        db.prepare("DELETE FROM overtime WHERE user_id = ? AND month = ? AND day = ?")
          .run(session.user.id, month, day);
      } else {
        db.prepare("INSERT OR REPLACE INTO overtime (user_id, month, day, hours) VALUES (?, ?, ?, ?)")
          .run(session.user.id, month, day, hours);
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
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
    const monthParam = searchParams.get("month");
    if (monthParam === null) return NextResponse.json({ error: "Missing month" }, { status: 400 });

    const month = validateMonth(monthParam);
    if (month === null) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

    const db = getDb();
    db.prepare("DELETE FROM overtime WHERE user_id = ? AND month = ?").run(session.user.id, month);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
