import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, loadAdminLiveEvents } from "@/lib/admin";

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
    return NextResponse.json(
      await loadAdminLiveEvents(admin.serviceSupabase)
    );
  } catch (error) {
    console.error("Could not load admin live events", error);
    return NextResponse.json(
      { error: "Could not load admin dashboard" },
      { status: 500 }
    );
  }
}
