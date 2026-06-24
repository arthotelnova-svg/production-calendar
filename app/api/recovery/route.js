import { auth } from "../../../auth";
import { getDb } from "../../../lib/db";
import { validateMonth } from "../../../lib/validators";
import { listMonthSnapshots, restoreMonthSnapshot, undoLastBulkChange } from "../../../lib/history";
import { NextResponse } from "next/server";

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year"), 10) || 2026;
    const month = validateMonth(searchParams.get("month"));
    if (month === null) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

    const snapshots = listMonthSnapshots(getDb(), {
      userId: session.user.id,
      year,
      month,
      limit: 12,
    });
    return NextResponse.json({ snapshots });
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
    const month = validateMonth(body.month);
    const mode = body.mode;

    if (mode === "undo_last_bulk") {
      if (month === null) return NextResponse.json({ error: "Invalid month" }, { status: 400 });
      const restored = undoLastBulkChange(db, {
        userId: session.user.id,
        actorUserId: session.user.id,
        year,
        month,
      });
      if (!restored) return NextResponse.json({ error: "No bulk snapshot found for this month" }, { status: 404 });
      return NextResponse.json({ ok: true, restored });
    }

    if (mode === "restore_snapshot") {
      const snapshotId = parseInt(body.snapshot_id, 10);
      if (!Number.isFinite(snapshotId)) {
        return NextResponse.json({ error: "Invalid snapshot id" }, { status: 400 });
      }
      const restored = restoreMonthSnapshot(db, {
        snapshotId,
        userId: session.user.id,
        actorUserId: session.user.id,
      });
      if (!restored) return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
      return NextResponse.json({ ok: true, restored });
    }

    return NextResponse.json({ error: "Unsupported mode" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
