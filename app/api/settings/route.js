import { auth } from "../../../auth";
import { getDb } from "../../../lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const settings = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(session.user.id);
  return NextResponse.json(settings || { oklad: 135000, ot_rate: 164, ot_weekday: 2, ot_saturday: 8 });
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { oklad, ot_rate, ot_weekday, ot_saturday } = body;

  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO settings (user_id, oklad, ot_rate, ot_weekday, ot_saturday) VALUES (?, ?, ?, ?, ?)"
  ).run(session.user.id, oklad, ot_rate, ot_weekday, ot_saturday);

  return NextResponse.json({ ok: true });
}
