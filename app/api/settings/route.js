import { auth } from "../../../auth";
import { getDb } from "../../../lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const settings = db.prepare("SELECT oklad, ot_rate, ot_weekday, ot_saturday FROM settings WHERE user_id = ?").get(session.user.id);
    return NextResponse.json(settings || { oklad: 135000, ot_rate: 164, ot_weekday: 2, ot_saturday: 8 });
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
    const { oklad, ot_rate, ot_weekday, ot_saturday } = body;

    if (
      typeof oklad !== "number" || !isFinite(oklad) || oklad < 0 || oklad > 10_000_000 ||
      typeof ot_rate !== "number" || !isFinite(ot_rate) || ot_rate < 0 || ot_rate > 100_000 ||
      typeof ot_weekday !== "number" || !isFinite(ot_weekday) || ot_weekday < 0 || ot_weekday > 24 ||
      typeof ot_saturday !== "number" || !isFinite(ot_saturday) || ot_saturday < 0 || ot_saturday > 24
    ) {
      return NextResponse.json({ error: "Invalid settings data" }, { status: 400 });
    }

    const db = getDb();
    db.prepare(
      "INSERT OR REPLACE INTO settings (user_id, oklad, ot_rate, ot_weekday, ot_saturday) VALUES (?, ?, ?, ?, ?)"
    ).run(session.user.id, oklad, ot_rate, ot_weekday, ot_saturday);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
