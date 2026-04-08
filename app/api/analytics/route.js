import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getOTMetrics,
  getMonthlyBreakdown,
  getYearlyComparison,
  getSummaryStats,
} from "@/lib/analytics";

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear());
    const type = searchParams.get("type") || "metrics"; // metrics, breakdown, comparison, summary

    let data;

    switch (type) {
      case "metrics":
        data = getOTMetrics(session.user.id, year);
        break;

      case "breakdown":
        data = getMonthlyBreakdown(session.user.id, year);
        break;

      case "comparison":
        data = getYearlyComparison(session.user.id, year);
        break;

      case "summary":
        data = getSummaryStats(session.user.id, year);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid type. Use: metrics, breakdown, comparison, summary" },
          { status: 400 }
        );
    }

    if (!data) {
      return NextResponse.json(
        { error: "User not configured or no data available" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      type,
      year,
      data,
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
