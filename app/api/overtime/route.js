import { auth } from "../../../auth";
import { getDb } from "../../../lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = db.prepare("SELECT month, day, hours FROM overtime WHERE user_id = ?").all(session.user.id);
  const data = {};
  rows.forEach((r) => {
    data[`${r.month}-${r.day}`] = r.hours;
  });
  return NextResponse.json(data);
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const db = getDb();

  if (body.bulk) {
    const del = db.prepare("DELETE FROM overtime WHERE user_id = ? AND month = ?");
    const ins = db.prepare(
      "INSERT OR REPLACE INTO overtime (user_id, month, day, hours) VALUES (?, ?, ?, ?)"
    );
    const txn = db.transaction((items, month) => {
      del.run(session.user.id, month);
      items.forEach(({ day, hours }) => {
        if (hours > 0) ins.run(session.user.id, month, day, hours);
      });
    });
    txn(body.items, body.month);
  } else {
    const { month, day, hours } = body;
    if (hours <= 0) {
      db.prepare("DELETE FROM overtime WHERE user_id = ? AND month = ? AND day = ?")
        .run(session.user.id, month, day);
    } else {
      db.prepare(
        "INSERT OR REPLACE INTO overtime (user_id, month, day, hours) VALUES (?, ?, ?, ?)"
      ).run(session.user.id, month, day, hours);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const db = getDb();
  if (month !== null) {
    db.prepare("DELETE FROM overtime WHERE user_id = ? AND month = ?")
      .run(session.user.id, parseInt(month, 10));
  }
  return NextResponse.json({ ok: true });
}
