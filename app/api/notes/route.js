import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // 0-11
  const year = searchParams.get("year") || new Date().getFullYear().toString();

  try {
    const db = getDb();
    let query = "SELECT * FROM day_notes WHERE user_id = ? AND year = ?";
    const params = [session.user.id, parseInt(year)];

    if (month !== null) {
      query += " AND month = ?";
      params.push(parseInt(month));
    }

    query += " ORDER BY month, day";

    const notes = db.prepare(query).all(...params);
    return NextResponse.json(notes);
  } catch (error) {
    console.error("GET /api/notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { year, month, day, note } = body;

    if (!year || month === undefined || !day) {
      return NextResponse.json(
        { error: "Missing required fields: year, month, day" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if note exists
    const existing = db
      .prepare(
        "SELECT id FROM day_notes WHERE user_id = ? AND year = ? AND month = ? AND day = ?"
      )
      .get(session.user.id, year, month, day);

    if (existing) {
      // Update
      const stmt = db.prepare(
        `UPDATE day_notes
         SET note = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND year = ? AND month = ? AND day = ?`
      );
      stmt.run(note, session.user.id, year, month, day);
    } else {
      // Insert
      const stmt = db.prepare(
        `INSERT INTO day_notes (user_id, year, month, day, note)
         VALUES (?, ?, ?, ?, ?)`
      );
      stmt.run(session.user.id, year, month, day, note);
    }

    const updated = db
      .prepare(
        "SELECT * FROM day_notes WHERE user_id = ? AND year = ? AND month = ? AND day = ?"
      )
      .get(session.user.id, year, month, day);

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error("POST /api/notes:", error);
    return NextResponse.json(
      { error: "Failed to save note" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const month = searchParams.get("month");
    const day = searchParams.get("day");

    if (month === null || !day) {
      return NextResponse.json(
        { error: "Missing required params: month, day" },
        { status: 400 }
      );
    }

    const db = getDb();
    const stmt = db.prepare(
      "DELETE FROM day_notes WHERE user_id = ? AND year = ? AND month = ? AND day = ?"
    );
    const result = stmt.run(session.user.id, parseInt(year), parseInt(month), parseInt(day));

    return NextResponse.json({
      success: true,
      changes: result.changes,
    });
  } catch (error) {
    console.error("DELETE /api/notes:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
