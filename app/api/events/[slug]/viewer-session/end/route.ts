import { NextRequest, NextResponse } from "next/server";
import { trackViewerSession } from "@/lib/viewer-sessions";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const result = await trackViewerSession({
      action: "end",
      country: request.headers.get("x-vercel-ip-country"),
      payload: await request.json().catch(() => ({})),
      slug,
      userAgent: request.headers.get("user-agent") ?? "",
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not end viewer session", error);
    return NextResponse.json(
      { error: "Could not end viewer session" },
      { status: 500 }
    );
  }
}
