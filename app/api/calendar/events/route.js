import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSyncedEvents } from "@/lib/calendar-sync";
import { getDb } from "@/lib/db";

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear());
    const month = parseInt(searchParams.get("month") || new Date().getMonth());
    const source = searchParams.get("source"); // optional filter

    const db = getDb();

    let query = `
      SELECT * FROM calendar_events
      WHERE user_id = ?
      AND CAST(strftime('%Y', start_date) AS INTEGER) = ?
      AND CAST(strftime('%m', start_date) AS INTEGER) = ?
    `;
    const params = [session.user.id, year, month + 1];

    if (source) {
      query += " AND source = ?";
      params.push(source);
    }

    query += " ORDER BY start_date";

    const events = db.prepare(query).all(...params);

    return NextResponse.json({
      events,
      count: events.length,
      period: `${year}-${String(month + 1).padStart(2, "0")}`,
    });
  } catch (error) {
    console.error("Get calendar events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
