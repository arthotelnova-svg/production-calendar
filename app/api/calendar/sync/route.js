import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  syncGoogleCalendar,
  syncOutlookCalendar,
} from "@/lib/calendar-sync";

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source"); // "google" or "outlook"
    const year = parseInt(searchParams.get("year") || new Date().getFullYear());
    const month = parseInt(searchParams.get("month") || new Date().getMonth());

    const account = session.user.account; // Assumes auth provides account info
    if (!account) {
      return NextResponse.json(
        { error: "No calendar account configured" },
        { status: 400 }
      );
    }

    let result;

    if (source === "google" || !source) {
      // Get access token from session (next-auth)
      const accessToken = session.user.accessToken;
      if (!accessToken) {
        return NextResponse.json(
          { error: "No Google access token available" },
          { status: 401 }
        );
      }
      result = await syncGoogleCalendar(session.user.id, accessToken, year, month);
    } else if (source === "outlook") {
      const accessToken = session.user.outlookToken;
      if (!accessToken) {
        return NextResponse.json(
          { error: "No Outlook access token available" },
          { status: 401 }
        );
      }
      result = await syncOutlookCalendar(session.user.id, accessToken, year, month);
    } else {
      return NextResponse.json(
        { error: "Invalid source. Use 'google' or 'outlook'" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync calendar" },
      { status: 500 }
    );
  }
}
