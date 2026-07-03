import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, loadAdminEvents } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const admin = await authenticateAdmin(request.headers.get("authorization"));

  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status }
    );
  }

  try {
    const { searchParams } = request.nextUrl;

    return NextResponse.json(
      await loadAdminEvents(admin.serviceSupabase, {
        date: searchParams.get("date"),
        status: searchParams.get("status"),
      })
    );
  } catch (error) {
    console.error("Could not load admin events", error);
    return NextResponse.json(
      { error: "Could not load admin events" },
      { status: 500 }
    );
  }
}
