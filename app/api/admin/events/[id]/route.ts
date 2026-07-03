import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, loadAdminEventDetail } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await authenticateAdmin(request.headers.get("authorization"));

  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status }
    );
  }

  try {
    const { id } = await params;
    const event = await loadAdminEventDetail(admin.serviceSupabase, id);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Could not load admin event detail", error);
    return NextResponse.json(
      { error: "Could not load admin event detail" },
      { status: 500 }
    );
  }
}
